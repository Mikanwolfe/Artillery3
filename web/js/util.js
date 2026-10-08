'use strict';
// Shared constants, math helpers and a seedable RNG.
// All gameplay randomness goes through `rng` so a match can be replayed with ?seed=N.
// Visual-only randomness (particles, snow) uses Math.random.

// Canvas is drawn at W x H CSS pixels; the camera looks at VIEW_W x VIEW_H world units
// (the original's 1600x900 window), so world numbers below are lifted straight from A3.
const W = 1024;
const H = 576;
const VIEW_W = 1600;
const VIEW_H = 900;
const VIEW_SCALE = W / VIEW_W;
const HUD_FONT = '"Cascadia Mono", ui-monospace, Menlo, Consolas, monospace';
// canvas HUD palette (matches style.css)
const HUD = {
  plate: 'rgba(18,17,25,0.86)', line: '#312d42', ash: '#7a7490', dim: '#aba5c0', fg: '#e4def2', bright: '#ffffff',
  accent: '#c3b0ff', hot: '#ff7c66', cool: '#78d8c4', gold: '#f2c45a', plateInk: '#17132a',
};
// a short readout on its own dark plate (numbers beside bars, captions over the scene)
function plateText(ctx, txt, x, y, color, align = 'center') {
  ctx.textAlign = align;
  const w = ctx.measureText(String(txt)).width + 8;
  const x0 = align === 'right' ? x - w : align === 'left' ? x : x - w / 2;
  ctx.fillStyle = HUD.plate;
  ctx.fillRect(Math.round(x0), y - 13, Math.round(w), 17);
  ctx.fillStyle = color;
  ctx.fillText(txt, align === 'right' ? x - 4 : align === 'left' ? x + 4 : x, y);
}
const WORLD_W = 3600; // A3 Constants.TerrainWidth was 2400; widened for room to move and lob
const WORLD_BOTTOM = 1800; // Constants.TerrainDepth
const VOID_Y = WORLD_BOTTOM + 1200;
// a face cut sheer through the ground (15X's Zero Point): black glass, melted at the lip like the
// asteroid's lava, with molten veins running down it that cool and fade with depth. x, y: the top
// of the face's outer edge; dir: -1 for a face looking right (the void's left side), 1 looking left.
function drawMoltenFace(ctx, x, y, dir, w, a = 1) {
  const now = performance.now() / 1000; // flicker only: not game state
  const fx = dir < 0 ? x - w : x + 1;
  ctx.fillStyle = '#07060b'; ctx.fillRect(fx, Math.round(y), w, VOID_Y - y);
  // the lip: a melted crust along the top of the face
  ctx.fillStyle = `rgba(52,20,14,${a})`; ctx.fillRect(fx, Math.round(y), w, 14);
  for (let i = 0; i < w; i += 4) {
    const glow = 0.55 + 0.45 * Math.sin(now * 3 + i * 0.3 + x * 0.01);
    ctx.fillStyle = `rgba(255,${Math.round(110 + 100 * glow)},30,${a * glow})`;
    ctx.fillRect(fx + i, Math.round(y + 2 + hash2(i, x) * 6), 4, 4);
  }
  // veins running down the face, hottest at the top
  for (let k = 0; k < 6; k++) {
    const vx = fx + Math.round(hash2(k, x * 3 + 7) * (w - 3)), len = 50 + hash2(k + 9, x) * 180;
    for (let d = 0; d < len; d += 6) {
      const u = d / len, glow = (1 - u) * (0.6 + 0.4 * Math.sin(now * 4 + k + d * 0.05));
      ctx.fillStyle = `rgba(255,${Math.round(80 + 120 * (1 - u))},30,${a * glow})`;
      ctx.fillRect(vx + Math.round(Math.sin(d * 0.08 + k) * 3), Math.round(y + 12 + d), 3, 6);
    }
  }
  // the very edge, glowing where it meets the void
  ctx.fillStyle = `rgba(255,120,40,${0.45 * a})`; ctx.fillRect(dir < 0 ? x - 2 : x + 1, Math.round(y), 2, 220);
} // ground height where the ground is gone altogether (15X's Zero Point)
const GRAV = 0.6; // Constants.Gravity, px / frame^2
const DT = 1 / 60;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = {
  _f: Math.random,
  seed(s) { this._f = mulberry32(s >>> 0); },
  next() { return this._f(); },
  range(a, b) { return a + (b - a) * this._f(); },
  int(a, b) { return Math.floor(this.range(a, b + 1)); },
  pick(arr) { return arr[Math.floor(this._f() * arr.length)]; },
  chance(p) { return this._f() < p; },
  gauss() { return (this._f() + this._f() + this._f() + this._f() - 2) * 1.2247; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._f() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
};

// Deterministic integer hash -> [0, 1). Used for terrain texture noise.
function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Art rule: everything in the world is an axis-aligned square (any size, may move, resize or
// fade, never rotates). No curves, lines, gradients or blur. This draws one, centred on (x, y).
function sq(ctx, x, y, s) {
  const n = Math.max(1, Math.round(s));
  ctx.fillRect(Math.round(x - n / 2), Math.round(y - n / 2), n, n);
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
