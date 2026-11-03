'use strict';
// Shared helpers. Everything is a plain global script (no build step), the same way Artillery 3's
// web rewrite is put together, so the files load in order from index.html and the balance simulator
// (tools/sim.mjs) can load the same files into a Node vm.

const ART = {}; // filled by js/art/*.js

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (id) => document.getElementById(id);

// Seeded RNG (mulberry32). Gameplay randomness goes through rng so a run can be replayed from its seed;
// cosmetic randomness (particles) uses Math.random.
const rng = {
  s: 1,
  seed(n) { this.s = (n >>> 0) || 1; },
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  range(a, b) { return a + (b - a) * this.next(); },
  int(a, b) { return Math.floor(this.range(a, b + 1)); }, // inclusive
  chance(p) { return this.next() < p; },
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
  weighted(items, w = (x) => x.w) {
    let total = 0;
    for (const it of items) total += Math.max(0, w(it));
    let r = this.next() * total;
    for (const it of items) { r -= Math.max(0, w(it)); if (r <= 0) return it; }
    return items[items.length - 1];
  },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  },
  state() { return this.s; },
};

// Numbers: full digits with separators up to a million, then 1.23M / 45.6B, so late floors stay readable.
function fmt(n) {
  n = Math.round(n);
  const a = Math.abs(n);
  if (a < 1e6) return n.toLocaleString('en-US');
  const units = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M']];
  for (const [v, u] of units) if (a >= v) {
    const x = n / v;
    return (Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2)) + u;
  }
  return String(n);
}
const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
const sign = (n) => (n > 0 ? '+' : '') + n;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Art pieces are kept as String.raw blocks; split them into rows once.
function artRows(a) {
  if (!a) return { rows: [], mask: null, w: 0, h: 0 };
  if (a._rows) return a._rows;
  const trim = (s) => {
    const lines = s.replace(/\r/g, '').split('\n');
    if (lines.length && lines[0].trim() === '') lines.shift();
    if (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    return lines.map((l) => l.replace(/\s+$/, ''));
  };
  const rows = trim(a.art);
  const mask = a.mask ? trim(a.mask) : null;
  a._rows = { rows, mask, w: Math.max(0, ...rows.map((r) => r.length)), h: rows.length };
  return a._rows;
}

// Storage that never throws (private windows, blocked storage).
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

// The original's random name list (from :init.ssii), used for default player names.
const SS_NAMES = ['Heath', 'Alph', 'Nickolai', 'Hide', 'Lumi', 'Ryuu', 'Tora', 'Kami', 'Theo', 'Lucia', 'Aria', 'Moses',
  'Fear', 'Nao', 'Eweca', 'Laceda', 'Meles', 'Morringhan', 'Neamhain', 'Kydos', 'Soul', 'Fleta', 'Erinn'];
