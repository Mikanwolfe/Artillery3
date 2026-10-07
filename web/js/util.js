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
const WORLD_W = 2400; // Constants.TerrainWidth
const WORLD_BOTTOM = 1800; // Constants.TerrainDepth
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
