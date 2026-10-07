'use strict';
// Procedural scenery: sky, parallax-ish mountain ranges (also midpoint-displaced),
// drifting clouds, aurora and wind-blown snow. Everything is generated, no image assets.

const PRESETS = [
  {
    name: 'Dusk',
    sky: ['#17213f', '#3d4f86', '#c98b95', '#f1b793'], stars: 0.35,
    orb: { x: 0.74, y: 0.62, r: 26, color: '#ffe7bd' }, fog: '#d9a9a8', cloud: [255, 214, 200], cloudA: 0.5,
    ranges: ['#59638f', '#46507c', '#333c63'], aurora: false,
    rockTop: [128, 120, 138], rockBot: [46, 44, 66], snow: [248, 240, 244],
  },
  {
    name: 'Dawn',
    sky: ['#2c3a6e', '#7a78b3', '#f2a6a0', '#ffd9a0'], stars: 0.1,
    orb: { x: 0.25, y: 0.58, r: 30, color: '#fff3c9' }, fog: '#f3c7b0', cloud: [255, 226, 214], cloudA: 0.55,
    ranges: ['#8b82ad', '#6f6a99', '#514f7d'], aurora: false,
    rockTop: [142, 128, 142], rockBot: [58, 50, 72], snow: [255, 246, 244],
  },
  {
    name: 'Polar night',
    sky: ['#050a1c', '#0b1c3a', '#16365a', '#245170'], stars: 1,
    orb: { x: 0.82, y: 0.2, r: 16, color: '#eaf3ff' }, fog: '#2e5576', cloud: [140, 170, 205], cloudA: 0.22,
    ranges: ['#2a4a6d', '#1d3a5c', '#142c49'], aurora: true,
    rockTop: [96, 112, 140], rockBot: [26, 34, 54], snow: [226, 240, 255],
  },
  {
    name: 'Overcast',
    sky: ['#56667a', '#7d8da0', '#a9b7c6', '#cfd9e2'], stars: 0,
    orb: null, fog: '#cfd9e2', cloud: [235, 240, 246], cloudA: 0.6,
    ranges: ['#93a2b4', '#7a8aa0', '#5f6f87'], aurora: false,
    rockTop: [118, 126, 140], rockBot: [52, 58, 72], snow: [244, 248, 252],
  },
];

class Background {
  constructor(preset) {
    this.preset = preset;
    this.sky = makeCanvas(W, H);
    this.paintSky();
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      this.clouds.push({ x: Math.random() * W, y: 30 + Math.random() * 170, s: 0.7 + Math.random() * 1.1, v: 2 + Math.random() * 4 });
    }
    this.cloudSprite = this.makeCloudSprite();
    this.flakes = [];
    for (let i = 0; i < 150; i++) this.flakes.push(this.newFlake(true));
    this.t = 0;
  }

  paintSky() {
    const p = this.preset;
    const c = this.sky.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H * 0.82);
    p.sky.forEach((col, i) => g.addColorStop(i / (p.sky.length - 1), col));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    if (p.stars > 0) {
      for (let i = 0; i < 160 * p.stars; i++) {
        const y = Math.random() * H * 0.5;
        c.fillStyle = `rgba(255,255,255,${(0.2 + Math.random() * 0.7) * (1 - y / (H * 0.55))})`;
        const s = Math.random() < 0.1 ? 1.8 : 1;
        c.fillRect(Math.random() * W, y, s, s);
      }
    }
    if (p.orb) {
      const ox = p.orb.x * W;
      const oy = p.orb.y * H;
      const glow = c.createRadialGradient(ox, oy, 0, ox, oy, p.orb.r * 6);
      glow.addColorStop(0, rgb(hexToRgb(p.orb.color), 0.5));
      glow.addColorStop(1, rgb(hexToRgb(p.orb.color), 0));
      c.fillStyle = glow;
      c.fillRect(ox - p.orb.r * 6, oy - p.orb.r * 6, p.orb.r * 12, p.orb.r * 12);
      c.fillStyle = p.orb.color;
      c.beginPath();
      c.arc(ox, oy, p.orb.r, 0, TAU);
      c.fill();
    }

    // far -> near mountain ranges with snow-capped peaks and haze between layers
    const fog = hexToRgb(p.fog);
    p.ranges.forEach((col, i) => {
      const n = 512;
      const base = H * (0.5 + i * 0.07);
      const m = midpoint(n, 0.55 + i * 0.03, 150 - i * 25, base + rng.range(-40, 40), base + rng.range(-40, 40));
      let top = H;
      const pts = [];
      for (let x = 0; x <= W; x += 4) {
        const y = m[Math.min(n, Math.round((x / W) * n))] - 30 * i;
        pts.push([x, y]);
        if (y < top) top = y;
      }
      const grad = c.createLinearGradient(0, top, 0, top + 190);
      grad.addColorStop(0, rgb(mixRgb(p.snow, hexToRgb(col), 0.12)));
      grad.addColorStop(0.28, rgb(mixRgb(p.snow, hexToRgb(col), 0.35)));
      grad.addColorStop(0.5, col);
      grad.addColorStop(1, rgb(mixRgb(hexToRgb(col), fog, 0.35)));
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(0, H);
      for (const [x, y] of pts) c.lineTo(x, y);
      c.lineTo(W, H);
      c.closePath();
      c.fill();
      const haze = c.createLinearGradient(0, top, 0, H * 0.85);
      haze.addColorStop(0, rgb(fog, 0));
      haze.addColorStop(1, rgb(fog, 0.28));
      c.fillStyle = haze;
      c.fillRect(0, top, W, H - top);
    });
  }

  makeCloudSprite() {
    const c = makeCanvas(200, 70);
    const g = c.getContext('2d');
    const col = this.preset.cloud;
    for (let i = 0; i < 9; i++) {
      const x = 30 + Math.random() * 140;
      const y = 28 + Math.random() * 16;
      const r = 14 + Math.random() * 18;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgb(col, this.preset.cloudA));
      gr.addColorStop(1, rgb(col, 0));
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
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
      c.x += (c.v * 0.5 + wv * 14 * c.s) * dt;
      if (c.x > W + 120) c.x = -220;
      if (c.x < -240) c.x = W + 100;
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
    if (this.preset.aurora) this.drawAurora(ctx);
    for (const c of this.clouds) {
      ctx.drawImage(this.cloudSprite, c.x, c.y, 200 * c.s, 70 * c.s);
    }
  }

  drawAurora(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let layer = 0; layer < 3; layer++) {
      const hue = [150, 175, 280][layer];
      for (let x = 0; x < W; x += 6) {
        const wave = Math.sin(x * 0.011 + this.t * (0.4 + layer * 0.15) + layer * 2) + Math.sin(x * 0.027 - this.t * 0.3);
        const y0 = 80 + layer * 26 + wave * 28;
        const len = 70 + 45 * Math.sin(x * 0.02 + this.t * 0.6 + layer);
        const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
        g.addColorStop(0, `hsla(${hue},90%,60%,0)`);
        g.addColorStop(0.25, `hsla(${hue},90%,62%,${0.11 - layer * 0.025})`);
        g.addColorStop(1, `hsla(${hue},90%,60%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y0, 6, len);
      }
    }
    ctx.restore();
  }

  drawSnow(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const f of this.flakes) {
      const s = 0.8 + f.z * 1.1;
      ctx.globalAlpha = 0.35 + f.z * 0.4;
      ctx.fillRect(f.x, f.y, s, s);
    }
    ctx.globalAlpha = 1;
  }
}
