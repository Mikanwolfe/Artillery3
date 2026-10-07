'use strict';
// Scenery lifted from A3's "Snowy Day" preset: a lavender sky, three parallax ridges (navy,
// charcoal, grey-blue; generated like the terrain, rougher) that scroll slower than the
// camera, and slow square snowflakes blown by the wind.

const PRESET = {
  name: 'Snowy Day',
  sky: [[166, 160, 204], [188, 172, 210]],
  layers: [
    { color: 'rgb(3,21,46)', rough: 0.7, parallax: 0.45, lift: 60 },
    { color: 'rgb(52,51,50)', rough: 0.65, parallax: 0.6, lift: 90 },
    { color: 'rgb(188,195,210)', rough: 0.55, parallax: 0.75, lift: 230 },
  ],
};

class Background {
  constructor() {
    const avg = 0.6 * WORLD_BOTTOM;
    // A3 Environment generates each ridge like the terrain but rougher; the grey-blue one sits
    // highest and hides the dark ones except where their roughness pokes through
    this.layers = PRESET.layers.map((l) => ({ ...l, height: generateHeights(avg - l.lift, l.rough), trees: this.plantTrees() }));
    this.flakes = [];
    for (let i = 0; i < 70; i++) this.flakes.push(this.newFlake(true));
    this.t = 0;
  }

  // stands of box pine trees along a ridge (the original's dark ridges read as treelines)
  plantTrees() {
    const trees = [];
    for (let x = rng.range(0, 200); x < WORLD_W; x += rng.range(40, 260)) {
      const stand = rng.int(1, 4);
      for (let k = 0; k < stand; k++) trees.push({ x: Math.round(x + k * rng.range(10, 18)), h: rng.int(3, 5) });
    }
    return trees;
  }

  newFlake(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : -8,
      s: 2 + Math.floor(Math.random() * 3) * 2, v: 10 + Math.random() * 25, ph: Math.random() * TAU,
    };
  }

  update(dt, wind) {
    this.t += dt;
    for (const f of this.flakes) {
      f.y += f.v * dt;
      f.x += (wind.x * 900 + Math.sin(this.t + f.ph) * 6) * dt;
      if (f.y > H + 8 || f.x < -10 || f.x > W + 10) {
        Object.assign(f, this.newFlake(false));
        if (wind.x > 0.01 && Math.random() < 0.4) f.x = -5;
        else if (wind.x < -0.01 && Math.random() < 0.4) f.x = W + 5;
      }
    }
  }

  // sky in screen space
  drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(PRESET.sky[0]));
    g.addColorStop(1, rgb(PRESET.sky[1]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ridges: called with the world transform; each layer follows the camera by `parallax`
  drawRidges(ctx, cam) {
    for (const l of this.layers) {
      ctx.fillStyle = l.color;
      const ox = cam.x * (1 - l.parallax);
      fillSteps(ctx, l.height, cam.x, cam.x + VIEW_W, 8, ox, 0);
      for (const t of l.trees) {
        const tx = t.x + ox;
        if (tx < cam.x - 40 || tx > cam.x + VIEW_W + 40) continue;
        const base = Math.round(l.height[Math.min(WORLD_W - 1, t.x)]) + 2;
        ctx.fillRect(tx - 2, base - 6, 4, 6);
        for (let i = 0; i < t.h; i++) {
          const w = (t.h - i) * 5 + 2;
          ctx.fillRect(tx - w / 2, base - 6 - (i + 1) * 7, w, 7);
        }
      }
    }
  }

  drawSnow(ctx) {
    ctx.fillStyle = 'rgb(248,244,252)';
    for (const f of this.flakes) sq(ctx, f.x, f.y, f.s);
  }
}
