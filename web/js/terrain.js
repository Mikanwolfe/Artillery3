'use strict';
// Midpoint-displacement terrain, lifted from A3's TerrainFactoryMidpoint: generate over the next
// power of two (4096), crop to the terrain width, reduction coefficient 0.45. Stored as a 1-D
// heightmap: height[x] is the y of the surface (bigger = lower). Drawn as flat stepped columns.

const TERRAIN_STEP = 5; // width of a drawn column (world units)
const TREE_HALF_W = 8; // tree hitbox half-width
const TREE_MAX_H = 62; // tallest tree of any kind (see treeHeight in biomes.js)

const SOOT_RGB = [96, 66, 44]; // brown scorch left on the snow by blasts


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

// A3: AverageTerrainHeight = 0.6 * TerrainDepth, BaseTerrainInitialDisplacement = 0.1 * TerrainDepth
function generateHeights(avg, rough, disp = 200) {
  const init = 0.1 * WORLD_BOTTOM;
  const m = midpoint(4096, rough, disp, avg + rng.range(-init, init), avg + rng.range(-init, init));
  return m.slice(0, WORLD_W);
}

class Terrain {
  constructor() {
    this.height = new Float32Array(WORLD_W);
    this.color = 'rgb(241,243,246)';
    this.cap = null;
    this.treeKind = 'pine';
    this.treeDensity = 1;
    this.trees = [];
    this.forts = [];
    this.bridges = [];
    this.lines = [];
    this.towers = [];
  }

  // Mountainous: rougher, deeper midpoint displacement than A3's (reduction 0.45, displacement 200),
  // plus a few raised-cosine massifs so there is usually a ridge to lob over. The biome sets the
  // numbers (desert dunes are smoother and lower) and the colours and trees.
  generate(biome = BIOMES.snow) {
    const g = biome.terrain;
    this.color = biome.ground;
    this.cap = biome.cap;
    this.sootColor = biome.soot;
    this.treeKind = biome.tree;
    this.treeDensity = biome.trees;
    this.height = generateHeights(0.62 * WORLD_BOTTOM, g.rough, g.disp);
    this.trees = [];
    this.forts = [];
    this.bridges = [];
    this.lines = [];
    this.towers = [];
    this.soot = new Float32Array(WORLD_W); // 0..1 scorch per column, drawn along the surface
    this.lava = new Float32Array(WORLD_W); // 0..1 molten ground per column (Ikaros' Apollon): permanent
    this.voids = []; // [x0, x1] spans where the ground is gone altogether (15X's Zero Point)
    const peaks = Math.round(rng.int(g.peaks[0], g.peaks[1]) * WORLD_W / 2400); // the biome's count is per 2400 units
    for (let k = 0; k < peaks; k++) {
      const cx = rng.range(250, WORLD_W - 250);
      const hh = rng.range(g.h[0], g.h[1]);
      const hw = rng.range(g.w[0], g.w[1]);
      for (let i = Math.max(0, Math.floor(cx - hw)); i < Math.min(WORLD_W, cx + hw); i++) {
        this.height[i] -= hh * 0.5 * (1 + Math.cos((Math.PI * (i - cx)) / hw));
      }
    }
    for (let i = 0; i < WORLD_W; i++) this.height[i] = clamp(this.height[i], 150, WORLD_BOTTOM - 140);
  }

  hAt(x) {
    x = clamp(x, 0, WORLD_W - 1.001);
    const i = x | 0;
    const f = x - i;
    return this.height[i] * (1 - f) + this.height[i + 1] * f;
  }

  flatten(cx, half) {
    const x0 = Math.max(0, Math.floor(cx - half));
    const x1 = Math.min(WORLD_W - 1, Math.ceil(cx + half));
    let avg = 0;
    for (let x = x0; x <= x1; x++) avg += this.height[x];
    avg /= x1 - x0 + 1;
    for (let x = x0; x <= x1; x++) this.height[x] = avg;
  }

  // A3 Projectile.BlowUpTerrain: a cosine bowl 8*explRad wide and up to 2*explRad deep,
  // dug into the ground under the blast.
  // brown soot around a blast: darkest at the centre, spread a little wider than the crater
  scorch(cx, r, amt = 0.8) {
    if (!this.soot) return;
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(WORLD_W, cx + r); x++) {
      const k = 1 - Math.abs(x - cx) / r;
      this.soot[x] = Math.min(1, this.soot[x] + amt * k * (0.6 + 0.4 * hash2(x, 7)));
    }
  }

  // the ground melted to lava within r of cx (strongest in the middle); it stays for the round
  melt(cx, r) {
    if (!this.lava) return;
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(WORLD_W, cx + r); x++) {
      const k = 1 - Math.abs(x - cx) / r;
      this.lava[x] = Math.min(1, this.lava[x] + Math.min(1, k * 1.6) * (0.75 + 0.25 * hash2(x, 19)));
    }
  }
  // the ground between x0 and x1 deleted outright, down through the bottom of the world: sheer
  // cliffs either side with molten bits along their lips
  erase(x0, x1) {
    x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(WORLD_W - 1, Math.ceil(x1));
    for (let x = x0; x <= x1; x++) { this.height[x] = VOID_Y; if (this.soot) this.soot[x] = 0; if (this.lava) this.lava[x] = 0; }
    for (const [e, dir] of [[x0 - 1, -1], [x1 + 1, 1]]) {
      for (let d = 0; d < 70; d++) {
        const x = e + dir * d;
        if (x < 0 || x >= WORLD_W || this.height[x] >= WORLD_BOTTOM) continue;
        if (hash2(x, 41) < 0.75 - d / 100) this.lava[x] = Math.max(this.lava[x], 0.9 - d / 80);
      }
    }
    for (const t of this.trees) if (t.x >= x0 && t.x <= x1) t.alive = false;
    this.forts = this.forts.filter((f) => f.x0 + f.cols * FORT_CELL < x0 || f.x0 > x1);
    this.towers = (this.towers || []).filter((t) => t.x < x0 || t.x > x1);
    this.voids.push([x0, x1]);
  }
  voidAt(x) { return this.height[clamp(Math.round(x), 0, WORLD_W - 1)] >= WORLD_BOTTOM; }

  lavaAt(x) { return this.lava ? this.lava[clamp(Math.round(x), 0, WORLD_W - 1)] : 0; }

  crater(cx, explRad) {
    const width = Math.max(8, explRad * 8 - 1);
    for (let i = 0; i < width; i++) {
      const x = Math.round(cx - width / 2 + i);
      if (x < 0 || x >= WORLD_W) continue;
      const d = explRad * (1 - Math.cos((TAU * i) / width));
      if (this.height[x] < WORLD_BOTTOM) this.height[x] = Math.min(WORLD_BOTTOM - 10, this.height[x] + d); // (a void stays a void)
    }
  }

  // Pine trees on the battlefield: they stop shells (which burst in them) and block driving,
  // and explosions knock them down. Stands are kept clear of the vehicles' starting spots.
  plantTrees(avoid) {
    this.trees = [];
    const d = this.treeDensity;
    for (let x = rng.range(60, 300); x < WORLD_W - 60; x += rng.range(160, 420) / d) {
      const stand = rng.int(1, d > 2 ? 4 : 3);
      for (let k = 0; k < stand; k++) {
        const tx = Math.round(x + k * rng.range(16, 26));
        if (tx > WORLD_W - 30 || avoid.some((a) => Math.abs(a - tx) < 70)) continue;
        if (this.fortAt(tx, this.hAt(tx) - 4)) continue;
        this.trees.push({ x: tx, h: rng.int(3, 5), alive: true, autumn: rng.int(0, 2) });
      }
    }
  }

  treeHeight(t) { return treeHeight(this.treeKind, t.h); }

  // forts (forts.js): solid blocks that stop shells
  fortAt(x, y) {
    for (const f of this.forts) if (f.at(x, y)) return f;
    return null;
  }

  // standing tree whose hitbox contains (px, py), if any
  treeAt(px, py) {
    for (const t of this.trees) {
      if (!t.alive || Math.abs(px - t.x) > TREE_HALF_W) continue;
      const base = this.hAt(t.x);
      if (py <= base && py > base - this.treeHeight(t)) return t;
    }
    return null;
  }

  // knock down standing trees within r of (x, y); returns the ones felled
  fellTrees(x, y, r) {
    const out = [];
    for (const t of this.trees) {
      if (!t.alive) continue;
      const base = this.hAt(t.x);
      const cy = base - this.treeHeight(t) / 2;
      if (Math.abs(t.x - x) < r + TREE_HALF_W && Math.abs(cy - y) < r + this.treeHeight(t) / 2) {
        t.alive = false;
        out.push(t);
      }
    }
    return out;
  }

  drawTrees(ctx, x0, x1) {
    for (const t of this.trees) {
      if (t.x < x0 - 40 || t.x > x1 + 40) continue;
      const base = Math.round(this.hAt(t.x));
      if (!t.alive) { // stump
        ctx.fillStyle = this.treeKind === 'cactus' ? 'rgb(78,128,70)' : 'rgb(70,56,50)';
        ctx.fillRect(t.x - 3, base - 5, 6, 5);
        continue;
      }
      drawTree(ctx, this.treeKind, t.x, base, t.h, t.autumn);
    }
  }

  erode(x, amt) {
    const i = clamp(Math.round(x), 0, WORLD_W - 1);
    if (this.height[i] < WORLD_BOTTOM) this.height[i] = Math.min(WORLD_BOTTOM - 10, this.height[i] + amt);
  }

  // draw the visible part as one stepped polygon (no seams between columns)
  draw(ctx, x0, x1) {
    if (this.cap) { // grass / sand crust along the surface, then the ground under it
      ctx.fillStyle = this.cap;
      fillSteps(ctx, this.height, x0, x1, TERRAIN_STEP, 0, 0);
      ctx.fillStyle = this.color;
      fillSteps(ctx, this.height, x0, x1, TERRAIN_STEP, 0, 7);
    } else {
      ctx.fillStyle = this.color;
      fillSteps(ctx, this.height, x0, x1, TERRAIN_STEP, 0, 0);
    }
    for (const f of this.forts) f.draw(ctx);
    if (this.lava) this.drawLava(ctx, x0, x1);
    if (this.voids && this.voids.length) this.drawVoids(ctx, x0, x1);
    if (!this.soot) return;
    // soot: a brown band of squares along the surface, deeper and darker where it's heavier
    const step = TERRAIN_STEP;
    for (let x = Math.max(0, Math.floor(x0 / step) * step); x < Math.min(WORLD_W, x1 + step); x += step) {
      const s = this.soot[Math.min(WORLD_W - 1, x + (step >> 1))];
      if (s < 0.04 || hash2(x, 11) > 0.25 + s) continue; // light soot is patchy
      const top = Math.round(this.height[Math.min(WORLD_W - 1, x + (step >> 1))]);
      ctx.fillStyle = rgb(this.sootColor || SOOT_RGB, 0.15 + 0.6 * s);
      ctx.fillRect(x, top, step, Math.round(2 + 8 * s));
      if (s > 0.35 && hash2(x, 3) < s * 0.6) { // flecks thrown a little further down
        ctx.fillStyle = rgb(this.sootColor || SOOT_RGB, 0.35 * s);
        ctx.fillRect(x + 1, top + Math.round(5 + 14 * s), 3, 3);
      }
    }
  }

  // where the ground was deleted: darkness welling up from below, and the sheer cut faces in black
  // glass either side, melted at their lips with molten veins running down (drawMoltenFace)
  drawVoids(ctx, x0, x1) {
    for (const [a, b] of this.voids) {
      if (b < x0 - 60 || a > x1 + 60) continue;
      const la = this.height[Math.max(0, a - 1)], lb = this.height[Math.min(WORLD_W - 1, b + 1)];
      const top = Math.min(la < WORLD_BOTTOM ? la : WORLD_BOTTOM, lb < WORLD_BOTTOM ? lb : WORLD_BOTTOM);
      for (let i = 0; i < 16; i++) { // the abyss, black a little way below the lips
        ctx.fillStyle = `rgba(6,4,10,${Math.min(1, 0.3 + i * 0.05)})`;
        ctx.fillRect(a, Math.round(top + 40 + i * 15), b - a + 1, i === 15 ? VOID_Y : 15);
      }
      for (const [x, y, dir] of [[a, la, -1], [b, lb, 1]]) {
        if (y >= WORLD_BOTTOM) continue;
        drawMoltenFace(ctx, x, y, dir, 44); // melted like the asteroid's crater
      }
    }
  }

  // lava: a dark crust over the surface with molten cracks that glow and flicker, thicker and
  // brighter toward the middle, and embers rising off the hottest parts
  drawLava(ctx, x0, x1) {
    const step = TERRAIN_STEP, now = performance.now() / 1000; // flicker only: not game state
    for (let x = Math.max(0, Math.floor(x0 / step) * step); x < Math.min(WORLD_W, x1 + step); x += step) {
      const l = this.lava[Math.min(WORLD_W - 1, x + (step >> 1))];
      if (l < 0.05) continue;
      const top = Math.round(this.height[Math.min(WORLD_W - 1, x + (step >> 1))]);
      const th = Math.round(6 + 26 * l);
      ctx.fillStyle = `rgba(52,20,14,${0.5 + 0.5 * l})`;
      ctx.fillRect(x, top - 1, step, th);
      const glow = 0.55 + 0.45 * Math.sin(now * 3 + x * 0.07);
      if (hash2(x, 23) < 0.35 + 0.6 * l) {
        ctx.fillStyle = `rgba(255,${Math.round(90 + 110 * glow * l)},30,${(0.5 + 0.5 * l) * glow})`;
        ctx.fillRect(x, top - 1 + Math.round(hash2(x, 29) * th * 0.5), step, Math.max(2, Math.round(th * 0.35)));
      }
      if (l > 0.5 && hash2(x, 31) < 0.25) { // embers
        const e = (now * 0.8 + hash2(x, 37)) % 1;
        ctx.fillStyle = `rgba(255,190,80,${1 - e})`;
        ctx.fillRect(x + 2, top - 6 - Math.round(e * 40), 3, 3);
      }
    }
  }
}

// Fill a heightmap as a stepped silhouette between world x0..x1, shifted by (ox, oy).
function fillSteps(ctx, heights, x0, x1, step, ox, oy) {
  const n = heights.length;
  const a = Math.max(0, Math.floor((x0 - ox) / step) * step);
  const b = Math.min(n, x1 - ox + step);
  const bottom = WORLD_BOTTOM + 1200;
  ctx.beginPath();
  ctx.moveTo(a + ox, bottom);
  for (let x = a; x < b; x += step) {
    const top = Math.round(heights[Math.min(n - 1, x + (step >> 1))] + oy);
    ctx.lineTo(x + ox, top);
    ctx.lineTo(x + step + ox, top);
  }
  ctx.lineTo(Math.min(n, b) + step + ox, bottom);
  ctx.closePath();
  ctx.fill();

}
