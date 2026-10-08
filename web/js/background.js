'use strict';
// Scenery, after A3's "Snowy Day" preset and its siblings in biomes.js: a sky, three parallax ridges
// (generated like the terrain, rougher) that scroll slower than the camera, treelines along the
// ridges, and ambient particles blown by the wind (snow, autumn leaves or sand).

class Background {
  constructor(biome = BIOMES.snow) {
    this.biome = biome;
    const avg = 0.6 * WORLD_BOTTOM;
    // A3 Environment generates each ridge like the terrain but rougher; the palest one sits
    // highest and hides the dark ones except where their roughness pokes through
    this.layers = biome.layers.map((l) => ({ ...l, height: generateHeights(avg - l.lift, l.rough), trees: biome.ridgeTrees ? this.plantTrees() : [] }));
    this.flakes = [];
    for (let i = 0; i < biome.particles.n; i++) this.flakes.push(this.newFlake(true));
    this.t = 0;
  }

  // stands of box trees along a ridge (the original's dark ridges read as treelines)
  plantTrees() {
    const trees = [];
    for (let x = rng.range(0, 200); x < WORLD_W; x += rng.range(40, 260)) {
      const stand = rng.int(1, 4);
      for (let k = 0; k < stand; k++) trees.push({ x: Math.round(x + k * rng.range(10, 18)), h: rng.int(3, 5) });
    }
    return trees;
  }

  newFlake(anywhere) {
    const p = this.biome.particles;
    const sand = p.kind === 'sand';
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : sand ? Math.random() * H : -8,
      s: sand ? 2 : p.kind === 'leaves' ? 3 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3) * 2,
      v: sand ? 4 + Math.random() * 8 : p.kind === 'leaves' ? 12 + Math.random() * 14 : 10 + Math.random() * 25,
      ph: Math.random() * TAU, c: rgb(p.colors[Math.floor(Math.random() * p.colors.length)]),
      k: 0.7 + Math.random() * 0.6, vx: 0, // weight: how fully it takes the wind's speed
    };
  }

  update(dt, wind) {
    this.t += dt;
    const kind = this.biome.particles.kind;
    // ambient particles ride the wind: n is -1..1 (full wind left .. right), each flake has its own
    // weight (f.k) and eases toward the wind speed, and gusts come and go, so a strong wind drives
    // snow nearly sideways and calm air lets it fall
    const n = clamp(wind.x / WIND_FULL, -1, 1);
    const gust = 1 + 0.35 * Math.sin(this.t * 0.7) + 0.15 * Math.sin(this.t * 2.3);
    const top = (kind === 'sand' ? 340 : kind === 'leaves' ? 260 : 200) * gust;
    for (const f of this.flakes) {
      const want = n * top * f.k + Math.sin(this.t * (kind === 'leaves' ? 2 : 1) + f.ph) * (kind === 'leaves' ? 18 : 6);
      f.vx += (want - f.vx) * Math.min(1, dt * 2.5);
      f.y += f.v * (1 - 0.35 * Math.abs(n)) * dt; // a hard wind keeps them aloft longer
      f.x += f.vx * dt;
      if (f.y > H + 8 || f.x < -10 || f.x > W + 10) {
        const vx = f.vx;
        Object.assign(f, this.newFlake(false));
        f.vx = vx;
        // in a wind most flakes come in from the upwind edge
        if (Math.random() < 0.15 + 0.8 * Math.abs(n)) { f.x = n > 0 ? -5 : W + 5; f.y = Math.random() * H; }
      }
    }
  }

  // sky in screen space
  drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(this.biome.sky[0]));
    g.addColorStop(1, rgb(this.biome.sky[1]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ridges: called with the world transform; each layer follows the camera by `parallax`
  drawRidges(ctx, cam) {
    const broad = this.biome.tree === 'broadleaf';
    for (const l of this.layers) {
      ctx.fillStyle = l.color;
      const ox = cam.x * (1 - l.parallax);
      fillSteps(ctx, l.height, cam.x, cam.x + VIEW_W, 8, ox, 0);
      for (const t of l.trees) {
        const tx = t.x + ox;
        if (tx < cam.x - 40 || tx > cam.x + VIEW_W + 40) continue;
        const base = Math.round(l.height[Math.min(WORLD_W - 1, t.x)]) + 2;
        ctx.fillRect(tx - 2, base - 6, 4, 6);
        if (broad) {
          const w = 10 + t.h * 3;
          ctx.fillRect(tx - w / 2, base - 8 - t.h * 7, w, t.h * 7);
          ctx.fillRect(tx - w / 2 + 3, base - 12 - t.h * 7, w - 6, 4);
          continue;
        }
        for (let i = 0; i < t.h; i++) {
          const w = (t.h - i) * 5 + 2;
          ctx.fillRect(tx - w / 2, base - 6 - (i + 1) * 7, w, 7);
        }
      }
    }
  }

  // ambient particles (screen pixels)
  drawSnow(ctx) {
    const sand = this.biome.particles.kind === 'sand';
    for (const f of this.flakes) {
      ctx.fillStyle = f.c;
      if (sand) ctx.fillRect(Math.round(f.x), Math.round(f.y), 6, 2); // streaks of blown sand
      else sq(ctx, f.x, f.y, f.s);
    }
  }
}
