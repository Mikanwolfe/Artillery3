'use strict';
// Midpoint-displacement terrain (the original A3 research topic), stored as a 1-D
// heightmap: height[x] is the y of the surface in screen space (bigger = lower).
// Drawn as a grid of TB-sized square blocks (stepped surface) into an offscreen canvas;
// only the block columns touched by a crater are repainted.

// Classic 1-D midpoint displacement over n segments (n must be a power of two).
function midpoint(n, rough, disp, a, b) {
  const m = new Float32Array(n + 1);
  m[0] = a;
  m[n] = b;
  for (let seg = n; seg > 1; seg >>= 1) {
    const half = seg >> 1;
    for (let i = 0; i < n; i += seg) {
      m[i + half] = (m[i] + m[i + seg]) / 2 + (rng.next() * 2 - 1) * disp;
    }
    disp *= rough;
  }
  return m;
}

const TB = 8; // terrain block size (px)

class Terrain {
  constructor() {
    this.height = new Float32Array(W);
    this.scorch = new Float32Array(W);
    this.canvas = makeCanvas(W, H);
    this.ctx = this.canvas.getContext('2d');
    this.pal = { rockTop: [120, 128, 148], rockBot: [44, 50, 68], snow: [240, 246, 252] };
    this.dirtyMin = 0;
    this.dirtyMax = W - 1;
  }

  generate() {
    const base = rng.range(0.56, 0.66) * H;
    const rough = rng.range(0.5, 0.6);
    const m = midpoint(W, rough, 190, base + rng.range(-70, 70), base + rng.range(-70, 70));
    let mean = 0;
    for (let i = 0; i < W; i++) mean += m[i];
    mean /= W;
    const lim = H * 0.3;
    for (let i = 0; i < W; i++) {
      const d = lim * Math.tanh((m[i] - mean) / lim);
      this.height[i] = clamp(base + d, 90, H - 70);
    }
    // one light smoothing pass so the finest octave isn't needle-sharp
    for (let i = 1; i < W - 1; i++) {
      this.height[i] = (this.height[i - 1] + 2 * this.height[i] + this.height[i + 1]) / 4;
    }
    this.scorch.fill(0);
    this.markDirty(0, W - 1);
  }

  setPalette(pal) {
    this.pal = pal;
    this.markDirty(0, W - 1);
  }

  hAt(x) {
    x = clamp(x, 0, W - 1.001);
    const i = x | 0;
    const f = x - i;
    return this.height[i] * (1 - f) + this.height[i + 1] * f;
  }

  // slope of the surface around x as an angle (radians, +ve = right side lower)
  slope(x, dx = 8) {
    return Math.atan2(this.hAt(x + dx) - this.hAt(x - dx), dx * 2);
  }

  flatten(cx, half) {
    const x0 = Math.max(0, Math.floor(cx - half));
    const x1 = Math.min(W - 1, Math.ceil(cx + half));
    let avg = 0;
    for (let x = x0; x <= x1; x++) avg += this.height[x];
    avg /= x1 - x0 + 1;
    for (let x = x0; x <= x1; x++) this.height[x] = avg;
    this.markDirty(x0 - 4, x1 + 4);
  }

  markDirty(a, b) {
    this.dirtyMin = Math.min(this.dirtyMin, Math.max(0, Math.floor(a)));
    this.dirtyMax = Math.max(this.dirtyMax, Math.min(W - 1, Math.ceil(b)));
  }

  crater(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(W - 1, Math.ceil(cx + r));
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      if (Math.abs(dx) > r) continue;
      const bottom = cy + Math.sqrt(r * r - dx * dx);
      if (this.height[x] < bottom) this.height[x] = Math.min(bottom, H - 6);
      const s = 1 - Math.abs(dx) / (r * 1.35);
      if (s > this.scorch[x]) this.scorch[x] = s;
    }
    this.markDirty(x0 - 2, x1 + 2);
  }

  // narrow deep shaft for orbital beams
  shaft(cx, halfW, depth) {
    const x0 = Math.max(0, Math.floor(cx - halfW));
    const x1 = Math.min(W - 1, Math.ceil(cx + halfW));
    const top = this.hAt(cx);
    for (let x = x0; x <= x1; x++) {
      const t = 1 - Math.abs(x - cx) / halfW;
      if (t <= 0) continue;
      const bottom = Math.min(H - 6, top + depth * Math.sqrt(t));
      if (this.height[x] < bottom) this.height[x] = bottom;
      this.scorch[x] = 1;
    }
    this.markDirty(x0 - 2, x1 + 2);
  }

  erode(x, amt) {
    const i = clamp(Math.round(x), 0, W - 1);
    this.height[i] = Math.min(H - 6, this.height[i] + amt);
    this.scorch[i] = Math.max(this.scorch[i], 0.5);
    this.markDirty(i, i);
  }

  // visual surface: the top of the block column containing x (physics uses the smooth height)
  blockTop(x) {
    const bx = clamp(Math.floor(x / TB), 0, W / TB - 1);
    return Math.round(this.height[bx * TB + TB / 2] / TB) * TB;
  }

  render() {
    if (this.dirtyMin > this.dirtyMax) return;
    const b0 = Math.floor(this.dirtyMin / TB);
    const b1 = Math.floor(this.dirtyMax / TB);
    for (let bx = b0; bx <= b1; bx++) this.renderBlockColumn(bx);
    this.dirtyMin = W;
    this.dirtyMax = -1;
  }

  renderBlockColumn(bx) {
    const c = this.ctx;
    const x0 = bx * TB;
    const mid = x0 + TB / 2;
    c.clearRect(x0, 0, TB, H);
    const top = this.blockTop(mid);
    const hs = this.height;
    const slope = Math.abs(hs[Math.min(W - 1, x0 + TB + 2)] - hs[Math.max(0, x0 - 2)]) / (TB + 4);
    const sc = this.scorch[mid];
    // snow on gentle slopes: 1-2 blocks; none where scorched
    const snowRows = sc > 0.25 ? 0 : slope < 0.35 ? 2 : slope < 0.9 ? 1 : 0;
    const { rockTop, rockBot, snow } = this.pal;
    for (let y = top, row = 0; y < H; y += TB, row++) {
      const v = 1 + (hash2(bx, y / TB) - 0.5) * 0.14;
      let col;
      if (row < snowRows) col = snow.map((k) => k * (row ? 0.94 : 1) * (0.97 + 0.03 * v));
      else {
        const t = clamp((y - 80) / (H - 80), 0, 1);
        col = mixRgb(rockTop, rockBot, t).map((k) => k * v);
        if (row < 2 && sc > 0) col = col.map((k) => k * (1 - 0.6 * sc * (row ? 0.5 : 1)));
      }
      c.fillStyle = rgb(col);
      c.fillRect(x0, y, TB, TB);
    }
  }
}
