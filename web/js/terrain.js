'use strict';
// Midpoint-displacement terrain (the original A3 research topic), stored as a 1-D
// heightmap: height[x] is the y of the surface in screen space (bigger = lower).
// Rendered per-column into an offscreen canvas so craters only repaint what changed.

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

class Terrain {
  constructor() {
    this.height = new Float32Array(W);
    this.scorch = new Float32Array(W);
    this.canvas = makeCanvas(W, H);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(W, H);
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

  render() {
    if (this.dirtyMin > this.dirtyMax) return;
    const a = this.dirtyMin;
    const b = this.dirtyMax;
    for (let x = a; x <= b; x++) this.renderColumn(x);
    this.ctx.putImageData(this.img, 0, 0, a, 0, b - a + 1, H);
    this.dirtyMin = W;
    this.dirtyMax = -1;
  }

  renderColumn(x) {
    const data = this.img.data;
    const hs = this.height;
    const h = hs[x];
    const hi = Math.floor(h);
    const frac = h - hi;
    const slope = Math.abs(hs[Math.min(W - 1, x + 2)] - hs[Math.max(0, x - 2)]) / 4;
    const sc = this.scorch[x];
    let snowT = clamp(6.5 - slope * 5, 0, 6.5) + hash2(x, 7) * 1.6;
    snowT *= 1 - clamp(sc * 1.4, 0, 1);
    const { rockTop, rockBot, snow } = this.pal;
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      if (y < hi) {
        data[idx + 3] = 0;
        continue;
      }
      const d = y - h;
      let r, g, b, a = 255;
      if (y === hi) a = 255 * (1 - frac);
      if (d < snowT) {
        const sh = 1 - 0.1 * (d / Math.max(snowT, 1)) - 0.05 * hash2(x, y);
        r = snow[0] * sh;
        g = snow[1] * sh;
        b = Math.min(255, snow[2] * (sh + 0.03));
      } else {
        const t = clamp((y - 80) / (H - 80), 0, 1);
        const n = (hash2(x >> 1, y >> 1) - 0.5) * 9 + (hash2(x, y) - 0.5) * 5;
        const band = Math.sin(y * 0.09 + x * 0.012 + hash2(x >> 4, 3) * 6) * 6;
        r = lerp(rockTop[0], rockBot[0], t) + n + band;
        g = lerp(rockTop[1], rockBot[1], t) + n + band;
        b = lerp(rockTop[2], rockBot[2], t) + n + band * 0.8;
        if (d < 12 && sc > 0) {
          const k = 1 - 0.65 * sc * (1 - d / 12);
          r *= k; g *= k; b *= k;
        }
      }
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
}
