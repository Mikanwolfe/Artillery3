'use strict';
// Midpoint-displacement terrain, lifted from A3's TerrainFactoryMidpoint: generate over the next
// power of two (4096), crop to the terrain width, reduction coefficient 0.45. Stored as a 1-D
// heightmap: height[x] is the y of the surface (bigger = lower). Drawn as flat stepped columns.

const TERRAIN_STEP = 5; // width of a drawn column (world units)

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
  }

  generate() {
    this.height = generateHeights(0.6 * WORLD_BOTTOM, 0.45);
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
