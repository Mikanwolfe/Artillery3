'use strict';
// Midpoint-displacement terrain, lifted from A3's TerrainFactoryMidpoint: generate over the next
// power of two (4096), crop to the terrain width, reduction coefficient 0.45. Stored as a 1-D
// heightmap: height[x] is the y of the surface (bigger = lower). Drawn as flat stepped columns.

const TERRAIN_STEP = 5; // width of a drawn column (world units)
const TREE_HALF_W = 8; // tree hitbox half-width
const TREE_MAX_H = 48; // tallest tree (trunk + 5 tiers of 8)

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
    this.trees = [];
  }

  generate() {
    this.height = generateHeights(0.6 * WORLD_BOTTOM, 0.45);
    this.trees = [];
    for (let i = 0; i < WORLD_W; i++) this.height[i] = clamp(this.height[i], 450, WORLD_BOTTOM - 150);
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
  crater(cx, explRad) {
    const width = Math.max(8, explRad * 8 - 1);
    for (let i = 0; i < width; i++) {
      const x = Math.round(cx - width / 2 + i);
      if (x < 0 || x >= WORLD_W) continue;
      const d = explRad * (1 - Math.cos((TAU * i) / width));
      this.height[x] = Math.min(WORLD_BOTTOM - 10, this.height[x] + d);
    }
  }

  // Pine trees on the battlefield: they stop shells (which burst in them) and block driving,
  // and explosions knock them down. Stands are kept clear of the vehicles' starting spots.
  plantTrees(avoid) {
    this.trees = [];
    for (let x = rng.range(60, 300); x < WORLD_W - 60; x += rng.range(160, 420)) {
      const stand = rng.int(1, 3);
      for (let k = 0; k < stand; k++) {
        const tx = Math.round(x + k * rng.range(16, 26));
        if (tx > WORLD_W - 30 || avoid.some((a) => Math.abs(a - tx) < 70)) continue;
        this.trees.push({ x: tx, h: rng.int(3, 5), alive: true });
      }
    }
  }

  treeHeight(t) { return 8 + t.h * 8; }

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
      ctx.fillStyle = 'rgb(70,56,50)';
      if (!t.alive) { ctx.fillRect(t.x - 3, base - 5, 6, 5); continue; } // stump
      ctx.fillRect(t.x - 2, base - 8, 4, 8);
      for (let i = 0; i < t.h; i++) {
        const w = (t.h - i) * 6 + 4;
        const y = base - 8 - (i + 1) * 8;
        ctx.fillStyle = 'rgb(38,62,64)';
        ctx.fillRect(t.x - w / 2, y, w, 8);
        ctx.fillStyle = 'rgb(236,240,246)';
        ctx.fillRect(t.x - w / 2, y, Math.ceil(w * 0.45), 2); // snow on the boughs
      }
    }
  }

  erode(x, amt) {
    const i = clamp(Math.round(x), 0, WORLD_W - 1);
    this.height[i] = Math.min(WORLD_BOTTOM - 10, this.height[i] + amt);
  }

  // draw the visible part as one stepped polygon (no seams between columns)
  draw(ctx, x0, x1) {
    ctx.fillStyle = this.color;
    fillSteps(ctx, this.height, x0, x1, TERRAIN_STEP, 0, 0);
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
