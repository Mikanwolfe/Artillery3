'use strict';
// Procedural scenery, all squares: banded sky, square sun/moon and stars, stepped mountain
// ranges, square-cluster clouds and square snowflakes blown by the wind.

const PRESETS = [
  {
    name: 'Day',
    sky: ['#5d8ec9', '#8db6e0', '#c4dbef'], stars: 0,
    orb: { x: 0.78, y: 0.16, s: 30, color: '#fff4c4' }, cloud: [250, 252, 255], cloudA: 0.9,
    ranges: ['#a5b4c8', '#8494ab', '#66778f'],
    rockTop: [118, 112, 104], rockBot: [62, 58, 56], snow: [246, 248, 252],
  },
  {
    name: 'Dusk',
    sky: ['#2b3260', '#6b5d8c', '#d79a86'], stars: 0.3,
    orb: { x: 0.72, y: 0.5, s: 34, color: '#ffd9a0' }, cloud: [240, 196, 186], cloudA: 0.8,
    ranges: ['#6f6d97', '#57587f', '#414467'],
    rockTop: [116, 104, 116], rockBot: [52, 46, 62], snow: [244, 236, 240],
  },
  {
    name: 'Night',
    sky: ['#0b1028', '#18244a', '#2c3d66'], stars: 1,
    orb: { x: 0.82, y: 0.18, s: 20, color: '#e8eef8' }, cloud: [96, 112, 146], cloudA: 0.7,
    ranges: ['#2f4064', '#24334f', '#1a263d'],
    rockTop: [92, 100, 120], rockBot: [34, 38, 52], snow: [214, 224, 240],
  },
  {
    name: 'Overcast',
    sky: ['#7d8794', '#9ba5b1', '#bcc4cc'], stars: 0,
    orb: null, cloud: [222, 226, 230], cloudA: 0.95,
    ranges: ['#97a0ab', '#7f8995', '#68727f'],
    rockTop: [112, 114, 116], rockBot: [58, 60, 64], snow: [240, 242, 244],
  },
];

class Background {
  constructor(preset) {
    this.preset = preset;
    this.sky = makeCanvas(W, H);
    this.paintSky();
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push(this.makeCloud(Math.random() * W));
    this.flakes = [];
    for (let i = 0; i < 110; i++) this.flakes.push(this.newFlake(true));
    this.t = 0;
  }

  paintSky() {
    const p = this.preset;
    const c = this.sky.getContext('2d');
    // flat colour bands
    const stops = p.sky.map(hexToRgb);
    const band = 24;
    for (let y = 0; y < H; y += band) {
      const t = clamp(y / (H * 0.75), 0, 1) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(t));
      c.fillStyle = rgb(mixRgb(stops[i], stops[i + 1], Math.round((t - i) * 4) / 4));
      c.fillRect(0, y, W, band);
    }
    for (let i = 0; i < 120 * p.stars; i++) {
      c.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
      sq(c, Math.random() * W, Math.random() * H * 0.5, Math.random() < 0.15 ? 3 : 2);
    }
    if (p.orb) {
      c.fillStyle = p.orb.color;
      sq(c, p.orb.x * W, p.orb.y * H, p.orb.s);
    }
    // stepped ranges, far -> near; block size shrinks with distance
    p.ranges.forEach((col, i) => {
      const B = 24 - i * 4;
      const n = 512;
      const base = H * (0.48 + i * 0.07);
      const m = midpoint(n, 0.55, 140 - i * 25, base + rng.range(-40, 40), base + rng.range(-40, 40));
      const c0 = hexToRgb(col);
      let minTop = H;
      const tops = [];
      for (let x = 0; x < W; x += B) {
        const y = Math.round((m[Math.min(n, Math.round(((x + B / 2) / W) * n))] - 26 * i) / B) * B;
        tops.push(y);
        minTop = Math.min(minTop, y);
      }
      tops.forEach((top, k) => {
        for (let y = top, row = 0; y < H; y += B, row++) {
          const v = 1 + (hash2(k + i * 97, y / B) - 0.5) * 0.08;
          const snowy = row === 0 && top < minTop + B * 3;
          c.fillStyle = snowy ? rgb(mixRgb(p.snow, c0, 0.15)) : rgb(c0.map((q) => q * v));
          c.fillRect(k * B, y, B, B);
        }
      });
    });
  }

  makeCloud(x) {
    const parts = [];
    const n = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      parts.push({ dx: (i - n / 2) * 12 + Math.random() * 10, dy: (Math.random() - 0.5) * 12, s: 14 + Math.random() * 18 });
    }
    return { x, y: 30 + Math.random() * 150, v: 3 + Math.random() * 4, parts };
  }

  newFlake(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : -5,
      z: 0.4 + Math.random() * 0.9, ph: Math.random() * TAU,
    };
  }

  update(dt, wind) {
    this.t += dt;
    const wv = wind / 0.012; // roughly -1..1
    for (const c of this.clouds) {
      c.x += (c.v * 0.5 + wv * 14) * dt;
      if (c.x > W + 80) Object.assign(c, this.makeCloud(-80));
      if (c.x < -80) Object.assign(c, this.makeCloud(W + 80));
    }
    for (const f of this.flakes) {
      f.y += (22 + 38 * f.z) * dt;
      f.x += (wv * 55 * f.z + Math.sin(this.t * 1.3 + f.ph) * 10) * dt;
      if (f.y > H + 4 || f.x < -10 || f.x > W + 10) {
        Object.assign(f, this.newFlake(false));
        if (wv > 0.2 && Math.random() < 0.5) f.x = -5;
        else if (wv < -0.2 && Math.random() < 0.5) f.x = W + 5;
      }
    }
  }

  drawBack(ctx) {
    ctx.drawImage(this.sky, 0, 0);
    ctx.fillStyle = rgb(this.preset.cloud, this.preset.cloudA);
    for (const c of this.clouds) for (const p of c.parts) sq(ctx, c.x + p.dx, c.y + p.dy, p.s);
  }

  drawSnow(ctx) {
    ctx.fillStyle = '#ffffff';
    for (const f of this.flakes) {
      ctx.globalAlpha = 0.45 + f.z * 0.4;
      sq(ctx, f.x, f.y, f.z > 0.9 ? 3 : 2);
    }
    ctx.globalAlpha = 1;
  }
}
