'use strict';
// The console: a character grid drawn on a canvas, like the original's 80-column cmd window, with
// colour and motion. The arena scene (backdrop, the two fighters, their bars and the effects of every
// skill) lives here; the menus are HTML (ui.js).

const BG = '#0c0c0c';
const INK = '#cccccc';
const DIM = '#767676';

class Term {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = 100; this.rows = 32;
    this.cw = 8; this.ch = 16; this.fs = 13;
    this.buf = [];
    this.t = 0;
    this.shakeT = 0; this.shakeA = 0;
    this.flashT = 0; this.flashC = '#fff';
  }
  setSize(cols, rows) { this.cols = cols; this.rows = rows; }
  resize(cssW) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = this.ctx;
    ctx.font = `100px 'Cascadia Mono', ui-monospace, monospace`;
    const adv = ctx.measureText('M').width / 100 || 0.6;
    this.cw = cssW / this.cols;
    this.fs = this.cw / adv;
    this.ch = Math.round(this.fs * 1.18 * 100) / 100;
    const cssH = this.ch * this.rows;
    this.cv.style.height = cssH + 'px';
    this.cv.width = Math.round(cssW * dpr);
    this.cv.height = Math.round(cssH * dpr);
    this.dpr = dpr;
  }
  clear() {
    this.buf = new Array(this.rows);
    for (let y = 0; y < this.rows; y++) this.buf[y] = new Array(this.cols).fill(null);
  }
  put(x, y, ch, color, o = {}) {
    x = Math.round(x); y = Math.round(y);
    if (y < 0 || y >= this.rows || x < 0 || x >= this.cols || ch === ' ' || ch == null) return;
    this.buf[y][x] = { ch, color: typeof consoleColor === 'function' ? consoleColor(color) : color, a: o.a == null ? 1 : o.a, bold: o.bold };
  }
  erase(x, y) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) this.buf[y][x] = null; }
  text(x, y, s, color, o = {}) { for (let i = 0; i < s.length; i++) this.put(x + i, y, s[i], color, o); }
  // a string centred on column cx
  ctext(cx, y, s, color, o) { this.text(Math.round(cx - s.length / 2), y, s, color, o); }
  // an art piece: rows + mask -> colours. flip mirrors it (with / and \ swapped).
  art(a, x, y, o = {}) {
    const { rows, mask } = artRows(a);
    const pal = { '.': a.color, ' ': a.color, a: a.accent || a.color, b: a.accent2 || a.accent || a.color, d: a.color, h: '#ffffff' };
    for (let r = 0; r < rows.length; r++) {
      const line = rows[r];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === ' ') continue;
        const m = (mask && mask[r] && mask[r][c]) || '.';
        let color = m === 'd' ? DIM_INK : (o.tint || pal[m] || a.color);
        let alpha = o.a == null ? 1 : o.a;
        if (o.flash) color = o.flash;
        this.put(x + c, y + r, ch, color, { a: alpha, glow: (m === 'a' || m === 'b' || m === 'h') ? (o.glow ?? 0.6) : 0 });
      }
    }
  }
  render() {
    const ctx = this.ctx, d = this.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, this.cv.width / d, this.cv.height / d);
    let sx = 0, sy = 0;
    // (a terminal doesn't shake)
    ctx.textBaseline = 'middle';
    const fontN = `${this.fs}px 'Cascadia Mono', ui-monospace, monospace`;
    const fontB = `700 ${this.fs}px 'Cascadia Mono', ui-monospace, monospace`;
    ctx.font = fontN;
    let curFont = fontN;
    for (let y = 0; y < this.rows; y++) {
      const row = this.buf[y];
      if (!row) continue;
      for (let x = 0; x < this.cols; x++) {
        const c = row[x];
        if (!c) continue;
        const f = c.bold ? fontB : fontN;
        if (f !== curFont) { ctx.font = f; curFont = f; }
        ctx.globalAlpha = c.a;
        ctx.fillStyle = c.color;
        ctx.fillText(c.ch, sx + x * this.cw, sy + (y + 0.5) * this.ch);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    // (no screen flashes either)
  }
}

// ------------------------------------------------------------------------------------- the arena scene
// Coordinates are in cells. The player stands left, the foe right; GROUND is the row they stand on.
class Arena {
  constructor(term) {
    this.term = term;
    this.parts = [];   // glyph particles
    this.floats = [];  // floating numbers and labels
    this.lines = [];   // short-lived glyph cells (beams, slashes)
    this.fighters = { p: null, e: null };
    this.backdrop = null;
    this.banner = null;
    this.time = 0;
  }
  layout() {
    const T = this.term;
    this.GROUND = 23;
    this.px = T.cols >= 90 ? 6 : 1;          // player art left edge
    this.ex = T.cols - 2;                    // foe art right edge
  }
  setFighters(p, e) {
    this.layout();
    this.fighters.p = p ? { art: p.art, x: 0, y: 0, dx: 0, dy: 0, flash: 0, a: 1, tint: null, hidden: false } : null;
    this.fighters.e = e ? { art: e.art, x: 0, y: 0, dx: 0, dy: 0, flash: 0, a: 1, tint: e.tint || null, hidden: false, aura: e.aura || null } : null;
  }
  // centre of a fighter, in cells
  center(who) {
    const f = this.fighters[who];
    if (!f || !f.art) return { x: who === 'p' ? 12 : this.term.cols - 18, y: 15 };
    const r = artRows(f.art);
    const left = who === 'p' ? this.px : this.ex - r.w;
    return { x: left + r.w / 2, y: this.GROUND - r.h / 2, w: r.w, h: r.h, left, top: this.GROUND - r.h };
  }
  update(dt) {
    this.time += dt;
    const T = this.term;
    if (T.shakeT > 0) T.shakeT -= dt;
    if (T.flashT > 0) T.flashT -= dt;
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floats) { f.life -= dt; f.y -= (f.vy || 2.5) * dt; }
    this.floats = this.floats.filter((f) => f.life > 0);
    for (const l of this.lines) l.life -= dt;
    this.lines = this.lines.filter((l) => l.life > 0);
    for (const k of ['p', 'e']) { const f = this.fighters[k]; if (f && f.flash > 0) f.flash -= dt; }
  }
  draw(hud) {
    const T = this.term;
    T.clear();
    // (no scenery: the original's arena was two signs on a black screen)
    // fighters
    for (const k of ['p', 'e']) {
      const f = this.fighters[k];
      if (!f || !f.art || f.hidden) continue;
      const r = artRows(f.art);
      const bob = Math.round(Math.sin(this.time * (k === 'p' ? 1.6 : 1.3) + (k === 'p' ? 0 : 1)) * 0.5 + 0.5) === 1 && f.a > 0.99 ? 0 : 0;
      const left = (k === 'p' ? this.px : this.ex - r.w) + Math.round(f.dx);
      const top = this.GROUND - r.h + Math.round(f.dy) - bob;
      T.art(f.art, left, top, { a: f.a, flash: f.flash > 0 ? '#ffffff' : null, tint: f.tint });
    }
    // ground
    for (let x = 0; x < T.cols; x++) T.put(x, this.GROUND, '-', DIM);
    // effects
    for (const l of this.lines) T.put(l.x, l.y, l.ch, l.color, { a: Math.min(1, l.life / (l.fade || 0.15)), glow: l.glow ?? 1 });
    for (const p of this.parts) T.put(p.x, p.y, p.ch, p.color, { a: Math.min(1, p.life / (p.fade || 0.3)), glow: p.glow ?? 0.8 });
    if (hud) hud(T);
    for (const f of this.floats) {
      const a = Math.min(1, f.life / 0.35);
      T.ctext(f.x, f.y, f.text, f.color, { a, glow: f.big ? 1 : 0.4, bold: f.big });
    }
    if (this.banner) {
      const b = this.banner;
      b.life -= 1 / 60;
      if (b.life <= 0) this.banner = null;
      else {
        const y = 3;
        const s = ` ${b.text} `;
        const w = s.length + 4;
        const x0 = Math.round(T.cols / 2 - w / 2);
        const a = Math.min(1, b.life / 0.4);
        T.text(x0, y - 1, '-'.repeat(w), b.color, { a: a * 0.6 });
        T.text(x0, y + 1, '-'.repeat(w), b.color, { a: a * 0.6 });
        T.ctext(T.cols / 2, y, s, b.color, { a, glow: 1, bold: true });
      }
    }
  }
  drawAura(left, top, r, color) {
    const T = this.term;
    const t = this.time;
    for (let i = 0; i < 6; i++) {
      const ang = t * 0.8 + i * Math.PI / 3;
      const x = left + r.w / 2 + Math.cos(ang) * (r.w / 2 + 2);
      const y = top + r.h / 2 + Math.sin(ang) * (r.h / 2 + 0.5);
      T.put(x, y, i % 2 ? '*' : '.', color, { a: 0.5, glow: 1 });
    }
  }
  // ---------------------------------------------------------------- primitives
  float(who, text, color, o = {}) {
    const c = this.center(who);
    const jitter = (o.idx || 0) * 1.2;
    this.floats.push({ x: c.x + (o.dx || 0) + (Math.random() - 0.5) * 4, y: c.top - 1 - jitter, text, color, life: o.life || 1.3, big: o.big, vy: o.vy });
  }
  burst(x, y, chars, color, n = 10, speed = 10, life = 0.5) {
    n = Math.min(n, 4); // sparing: a few glyphs, not a firework
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5, ch: chars[i % chars.length], color, life: life * (0.6 + Math.random() * 0.6) });
    }
  }
  rise(who, chars, color, n = 12, life = 1.0) {
    n = Math.min(n, 6);
    const c = this.center(who);
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: c.left + Math.random() * c.w, y: c.top + c.h * (0.4 + Math.random() * 0.6), vx: 0, vy: -4 - Math.random() * 4, ch: chars[i % chars.length], color, life: life * (0.5 + Math.random() * 0.7), fade: 0.4 });
    }
  }
  rain(who, chars, color, n = 14, life = 0.8) {
    n = Math.min(n, 8);
    const c = this.center(who);
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: c.left + Math.random() * c.w, y: c.top - 4 - Math.random() * 4, vx: 0, vy: 14 + Math.random() * 8, ch: chars[i % chars.length], color, life: life * (0.6 + Math.random() * 0.5) });
    }
  }
  line(points, ch, color, life = 0.25, o = {}) { for (const [x, y] of points) this.lines.push({ x, y, ch: typeof ch === 'function' ? ch(x, y) : ch, color, life, fade: o.fade, glow: o.glow }); }
  shake(a = 1, t = 0.25) { this.term.shakeA = a; this.term.shakeT = t; }
  flash(color = '#ffffff', t = 0.12) { this.term.flashC = color; this.term.flashT = t; }
  hitFlash(who) { const f = this.fighters[who]; if (f) f.flash = 0.12; }
}

// ------------------------------------------------------------------------------------- effects
// Each effect is an async function (arena, from, to, opts) built from the primitives. `speed` scales time.
const wait = (ms) => new Promise((r) => setTimeout(r, ms / (FX.speed || 1)));
const FX = {
  speed: 1,
  // a glyph string flying from one fighter to the other, leaving a trail
  async projectile(A, from, to, glyphs, color, o = {}) {
    const a = A.center(from), b = A.center(to);
    const x0 = from === 'p' ? a.left + a.w : a.left, x1 = to === 'p' ? b.left + b.w : b.left;
    const y0 = (o.y0 ?? a.y), y1 = (o.y1 ?? b.y);
    const steps = Math.max(6, Math.round(Math.abs(x1 - x0) / (o.step || 2.2)));
    const g = from === 'e' ? mirrorGlyph(glyphs) : glyphs;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(x0, x1, t), y = lerp(y0, y1, t) - Math.sin(t * Math.PI) * (o.arc || 0);
      for (let k = 0; k < g.length; k++) A.lines.push({ x: x + (from === 'p' ? k - g.length + 1 : -k + g.length - 1) * 1, y, ch: g[k], color, life: 0.05, fade: 0.05, glow: 1 });
      if (o.trail) A.parts.push({ x: x - (from === 'p' ? g.length : -g.length), y, vx: 0, vy: 0, ch: o.trail[i % o.trail.length], color: o.trailColor || color, life: 0.3, fade: 0.3 });
      await wait(o.ms || 14);
    }
  },
  async slash(A, to, color, o = {}) {
    const c = A.center(to);
    const n = o.n || 1;
    for (let s = 0; s < n; s++) {
      const pts = [];
      const len = Math.max(6, Math.round(Math.min(c.w, c.h * 2) * (o.size || 0.8)));
      const dir = (s % 2) ? -1 : 1;
      for (let i = 0; i < len; i++) pts.push([c.x - dir * (len / 2 - i), c.y - len / 4 + i / 2]);
      A.line(pts, dir > 0 ? '\\' : '/', color, 0.25);
      A.burst(c.x, c.y, o.chars || "'.`", color, 6, 12, 0.35);
      await wait(90);
    }
  },
  async bolt(A, to, color, o = {}) {
    const c = A.center(to);
    let x = c.x + (Math.random() - 0.5) * 4;
    const pts = [];
    for (let y = 0; y <= c.y; y++) { x += Math.round((Math.random() - 0.5) * 3); pts.push([x, y]); }
    A.line(pts.map(([px, py], i) => [px, py]), (px, py) => (Math.random() < 0.5 ? '/' : '\\'), color, 0.3, { glow: 1.5 });
    A.flash(color, 0.1);
    A.shake(0.8, 0.2);
    A.burst(c.x, c.y, '*+x', color, 12, 16, 0.5);
    await wait(240);
  },
  async beam(A, from, to, ch, color, o = {}) {
    const a = A.center(from), b = A.center(to);
    const x0 = from === 'p' ? a.left + a.w : a.left, x1 = to === 'p' ? b.left + b.w : b.left;
    const y = Math.round(b.y);
    const pts = [];
    const dir = x1 > x0 ? 1 : -1;
    for (let x = x0; dir > 0 ? x <= x1 : x >= x1; x += dir) pts.push([x, y]);
    for (let i = 0; i < pts.length; i += 3) { A.line(pts.slice(i, i + 3), ch, color, (o.dur || 0.35) + 0.002 * (pts.length - i)); await wait(6); }
    if (o.thick) { A.line(pts.map(([x, yy]) => [x, yy - 1]), o.thick, color, o.dur || 0.35); A.line(pts.map(([x, yy]) => [x, yy + 1]), o.thick, color, o.dur || 0.35); }
    A.burst(b.x, b.y, o.burst || '*+', color, 14, 18, 0.5);
    await wait(o.hold || 160);
  },
  async aura(A, who, chars, color, o = {}) {
    A.rise(who, chars, color, o.n || 14, o.life || 1);
    await wait(o.ms || 380);
  },
  async charge(A, who, color) {
    const c = A.center(who);
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 6;
      A.parts.push({ x: c.x + Math.cos(ang) * r, y: c.y + Math.sin(ang) * r * 0.5, vx: -Math.cos(ang) * r * 2.2, vy: -Math.sin(ang) * r * 1.1, ch: '.:*'[i % 3], color, life: 0.45, fade: 0.2 });
    }
    await wait(450);
  },
  async lunge(A, who, dist = 3) {
    const f = A.fighters[who];
    if (!f) return;
    const d = who === 'p' ? dist : -dist;
    for (let i = 1; i <= 3; i++) { f.dx = d * i / 3; await wait(20); }
    await wait(40);
    for (let i = 2; i >= 0; i--) { f.dx = d * i / 3; await wait(25); }
  },
};
const MIRROR = { '>': '<', '<': '>', '(': ')', ')': '(', '/': '\\', '\\': '/', '[': ']', ']': '[', '{': '}', '}': '{' };
function mirrorGlyph(g) { return g.split('').reverse().map((c) => MIRROR[c] || c).join(''); }

// Skill effects: what each fx id looks like. `who` acts on `foe`.
const SKILL_FX = {
  async slash(A, who, foe) { await FX.lunge(A, who); await FX.projectile(A, who, foe, ')', '#e4def2', { step: 3 }); await FX.slash(A, foe, '#ffffff'); },
  async arrow(A, who, foe) { await FX.projectile(A, who, foe, '-->', '#9fd8ff', { step: 3, trail: '-', trailColor: '#4a7fa8' }); A.burst(A.center(foe).x, A.center(foe).y, '*.', '#9fd8ff', 8); },
  async claw(A, who, foe) { await FX.slash(A, foe, '#c3b0ff', { n: 2, size: 0.9, chars: '\\\\/' }); },
  async sokatsui(A, who, foe) { await FX.projectile(A, who, foe, '~*', '#5ab0ff', { trail: '~.', trailColor: '#2d6fd0', step: 2 }); A.burst(A.center(foe).x, A.center(foe).y, '*~', '#5ab0ff', 14, 14); A.shake(0.5); },
  async drain(A, who, foe) {
    const a = A.center(foe), b = A.center(who);
    A.burst(a.x, a.y, '*', '#ff4d6a', 8, 8);
    for (let i = 0; i < 14; i++) A.parts.push({ x: a.x, y: a.y + (Math.random() - 0.5) * 4, vx: (b.x - a.x) * (1.4 + Math.random()), vy: (b.y - a.y) * 1.4, ch: '.*'[i % 2], color: '#ff4d6a', life: 0.6 });
    await wait(500);
  },
  async lightning(A, who, foe) { await FX.charge(A, who, '#ffe066'); await FX.bolt(A, foe, '#ffe066'); },
  async fusion(A, who, foe) { await FX.charge(A, who, '#ff9a5a'); await FX.projectile(A, who, foe, '(O)', '#ffb36b', { trail: 'o.', step: 2 }); A.shake(0.8); A.burst(A.center(foe).x, A.center(foe).y, '#*%', '#ff9a5a', 16, 16); },
  async ice(A, who, foe) { await FX.projectile(A, who, foe, '<==>', '#7fe3ff', { step: 3, trail: '.', trailColor: '#bff3ff' }); A.burst(A.center(foe).x, A.center(foe).y, '*<>', '#bff3ff', 14, 12, 0.7); },
  async fire(A, who, foe) {
    const c = A.center(foe);
    for (let k = 0; k < 3; k++) { for (let i = 0; i < 10; i++) A.parts.push({ x: c.left + Math.random() * c.w, y: A.GROUND - 1, vx: 0, vy: -8 - Math.random() * 10, ch: '^*~'[i % 3], color: i % 2 ? '#ff7a4d' : '#ffd36b', life: 0.7 }); await wait(110); }
    A.shake(0.6);
  },
  async scythe(A, who, foe) {
    const c = A.center(foe);
    const pts = [];
    for (let i = 0; i < 18; i++) { const ang = Math.PI * (0.15 + i / 18 * 0.7); pts.push([c.x + Math.cos(ang) * (c.w / 2 + 2) * (who === 'p' ? 1 : -1), c.y - Math.sin(ang) * (c.h / 2 + 1)]); }
    for (let i = 0; i < pts.length; i += 2) { A.line(pts.slice(i, i + 2), '(', '#e6e0ff', 0.3); await wait(12); }
    A.burst(c.x, c.y, "'.", '#e6e0ff', 10, 12);
    await wait(120);
  },
  async holy(A, who, foe) { await FX.charge(A, who, '#fff1b8'); await FX.beam(A, who, foe, '=', '#fff1b8', { thick: '-', burst: '+*', dur: 0.45 }); A.flash('#fff1b8', 0.15); A.shake(1); },
  async cero(A, who, foe) { await FX.charge(A, who, '#ff4d6a'); await FX.beam(A, who, foe, '=', '#ff4d6a', { thick: '~', dur: 0.35 }); A.shake(0.8); },
  async spear(A, who, foe) { await FX.lunge(A, who, 4); await FX.projectile(A, who, foe, '----->', '#e6e0ff', { step: 4, ms: 8 }); A.burst(A.center(foe).x, A.center(foe).y, '>*', '#ffffff', 8, 18); },
  async bigslash(A, who, foe) { await FX.lunge(A, who, 6); await FX.slash(A, foe, '#ff4d6a', { size: 1.3 }); A.shake(1.2, 0.3); A.flash('#ff4d6a', 0.1); },
  async fury(A, who, foe) { await FX.lunge(A, who, 6); await FX.slash(A, foe, '#ff4d6a', { n: 4, size: 1.1 }); A.shake(1.2, 0.35); },
  async direblade(A, who, foe) { await FX.lunge(A, who, 5); await FX.slash(A, foe, '#b06bff', { size: 1.2, n: 2 }); A.shake(1); },
  async smash(A, who, foe) { await FX.lunge(A, who, 8); A.burst(A.center(foe).x, A.center(foe).y, '#%*', '#d0c8b0', 18, 18); A.shake(1.3, 0.3); await wait(150); },
  async brandish(A, who, foe) { await FX.lunge(A, who, 6); await FX.slash(A, foe, '#ffd866', { size: 1.4, n: 1 }); A.flash('#ffd866', 0.1); A.shake(1); },
  async wrath(A, who, foe) { const c = A.center(foe); await FX.charge(A, who, '#ffd866'); A.rain(foe, '|!', '#ffd866', 20, 0.6); await wait(250); A.burst(c.x, c.y, '#*', '#ffd866', 20, 20); A.shake(1.5, 0.35); A.flash('#ffd866', 0.12); },
  async wings(A, who, foe) { for (let i = 0; i < 3; i++) { FX.projectile(A, who, foe, 'v', '#ffffff', { y0: A.center(who).y - 3 + i * 3, arc: 2, step: 2.6 }); await wait(70); } await wait(260); A.burst(A.center(foe).x, A.center(foe).y, 'v^', '#ffffff', 12, 14); },
  async darklight(A, who, foe) { const c = A.center(foe); for (let i = 0; i < 18; i++) { const ang = i / 18 * Math.PI * 2; A.parts.push({ x: c.x + Math.cos(ang) * 14, y: c.y + Math.sin(ang) * 6, vx: -Math.cos(ang) * 28, vy: -Math.sin(ang) * 12, ch: '@', color: '#9a5bff', life: 0.45 }); } await wait(450); A.flash('#2b1640', 0.2); A.burst(c.x, c.y, '@*%', '#d9b8ff', 20, 20); A.shake(1.2); },
  async arc(A, who, foe) { const c = A.center(foe); for (let i = 0; i < 5; i++) { const x = c.left + Math.random() * c.w; const pts = []; for (let y = 0; y < c.y; y++) pts.push([x + Math.sin(y / 2) * 2, y]); A.line(pts, '|', '#ffd866', 0.25); A.burst(x, c.y, '*', '#ffffff', 6, 12, 0.4); await wait(90); } A.shake(1.4, 0.35); A.flash('#fff6d0', 0.12); },
  async silence(A, who, foe) { A.rain(foe, '*.', '#cfe8ff', 30, 1.2); await wait(400); A.flash('#cfe8ff', 0.15); },
  async heal(A, who) { await FX.aura(A, who, '+', '#7fe08a'); },
  async rest(A, who) { await FX.aura(A, who, 'zZ', '#7fb8ff', { n: 8, life: 1.2 }); },
  async buff(A, who) { await FX.aura(A, who, '*^', '#c3b0ff', { n: 16 }); },
  async shield(A, who) { const c = A.center(who); const pts = []; for (let y = c.top; y < A.GROUND; y++) pts.push([c.left + c.w + 1, y]); A.line(pts, ']', '#ffd866', 0.6); await FX.aura(A, who, '+', '#ffd866', { n: 8 }); },
  async guard(A, who) { const c = A.center(who); const pts = []; for (let y = c.top + 1; y < A.GROUND; y++) pts.push([c.left + c.w + 1, y]); A.line(pts, '[', '#9fd8ff', 0.5); await wait(200); },
  async potion(A, who) { await FX.aura(A, who, 'o0.', '#ff9ad5', { n: 10 }); },
  // ------- enemy moves (the colour is the foe's accent)
  async ehit(A, who, foe, col) { await FX.lunge(A, who, 4); await FX.projectile(A, who, foe, ')', col, { step: 3 }); },
  async emulti(A, who, foe, col) { await FX.lunge(A, who, 4); },
  async emag(A, who, foe, col) { await FX.projectile(A, who, foe, '*~', col, { trail: '.', step: 2.4 }); },
  async emagmulti(A, who, foe, col) { await FX.charge(A, who, col); },
  async ebig(A, who, foe, col) { await FX.lunge(A, who, 7); A.shake(1.5, 0.35); },
  async ebigmag(A, who, foe, col) { await FX.beam(A, who, foe, '=', col, { thick: '~', dur: 0.4 }); A.shake(1.5, 0.35); A.flash(col, 0.12); },
  async edrain(A, who, foe, col) { await SKILL_FX.drain(A, who, foe); },
  async ecurse(A, who, foe, col) { A.rain(foe, '~?', '#c38bff', 12, 0.9); await wait(380); },
  async ebuff(A, who, foe, col) { await FX.aura(A, who, '^*', col, { n: 14 }); },
  async eheal(A, who) { await FX.aura(A, who, '+', '#7fe08a'); },
  async charge(A, who, foe, col) { await FX.charge(A, who, '#ff5a7a'); },
};
// per-hit impact for multi-hit moves
async function impactFX(A, who, color, idx) {
  const c = A.center(who);
  A.burst(c.x + (Math.random() - 0.5) * c.w * 0.5, c.y + (Math.random() - 0.5) * c.h * 0.4, "*'.", color, 5, 10, 0.3);
  A.hitFlash(who);
}

// ------------------------------------------------------------------------------------- backdrops
// One per stratum: dim characters behind the fight. Seeded so they don't flicker; some parts move.
function makeBackdrop(sIdx, cols) {
  const R = (n) => { let s = n * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
  const r = R(sIdx + 7);
  const stars = [];
  for (let i = 0; i < 60; i++) stars.push([Math.floor(r() * cols), Math.floor(r() * 20), r()]);
  const S = STRATA[sIdx] || STRATA[0];
  const col = S.color;
  const hills = [];
  for (let x = 0; x < cols; x++) hills.push(Math.round(16 + Math.sin(x / 9 + sIdx) * 2 + Math.sin(x / 4.3) * 1));
  return (T, t, G) => {
    switch (sIdx % 10) {
      case 0: // the Outskirts: hills, grass
        for (let x = 0; x < T.cols; x++) { T.put(x, hills[x], '_', '#5a5040', { a: 0.5 }); if ((x * 7) % 5 === 0) T.put(x, G - 1, (x % 3) ? ',' : '"', '#4f6a3a', { a: 0.6 }); }
        for (const [x, y, k] of stars) if (y < 8 && k > 0.6) T.put(x, y, '.', '#8a8070', { a: 0.4 });
        break;
      case 1: // the Barrow: graves and fog
        for (let x = 4; x < T.cols; x += 13) { T.text(x, G - 3, ' _ ', '#5c6a58', { a: 0.5 }); T.text(x, G - 2, '| |', '#5c6a58', { a: 0.5 }); T.text(x, G - 1, '|+|', '#5c6a58', { a: 0.5 }); }
        for (let i = 0; i < 30; i++) { const x = (i * 17 + t * 3) % T.cols; T.put(x, G - 1 - (i % 3), '~', '#a8c79a', { a: 0.15 }); }
        break;
      case 2: // the Spire: runes in the dark
        for (const [x, y, k] of stars) T.put(x, y + 1, '&%$#@'[Math.floor(k * 5)], '#5a6ab0', { a: 0.15 + 0.15 * Math.sin(t * 2 + k * 9) });
        for (let y = 0; y < G; y++) { T.put(1, y, '|', '#3a4070', { a: 0.4 }); T.put(T.cols - 2, y, '|', '#3a4070', { a: 0.4 }); }
        break;
      case 3: // the Fomorian Shore: waves
        for (let x = 0; x < T.cols; x++) for (let k = 0; k < 2; k++) T.put(x, G - 2 + k, Math.sin(x / 3 + t * 2 + k) > 0.3 ? '~' : '-', '#3f8f86', { a: 0.35 });
        for (const [x, y, k] of stars) if (k > 0.75) T.put(x, y, '.', '#7a8a8a', { a: 0.3 });
        break;
      case 4: // the Wild Mythos: crags and red sky
        for (let x = 0; x < T.cols; x++) T.put(x, hills[x] - 3, x % 4 ? '^' : '/', '#7a3a2a', { a: 0.45 });
        break;
      case 5: // the Elemental Planes: embers rising
        for (const [x, y, k] of stars) { const yy = (y - t * (2 + k * 3)) % 22; T.put(x, (yy + 22) % 22, k > 0.5 ? '*' : '.', k > 0.5 ? '#ff9a4d' : '#7fe3ff', { a: 0.35, glow: 0.5 }); }
        break;
      case 6: // the Otherworld: stars and mist
        for (const [x, y, k] of stars) T.put(x, y, k > 0.85 ? '*' : '.', '#d0ffd0', { a: 0.2 + 0.3 * Math.abs(Math.sin(t + k * 9)), glow: 0.5 });
        for (let i = 0; i < 40; i++) { const x = (i * 11 + t * 2) % T.cols; T.put(x, G - 1 - (i % 4), '~', '#b6e3a0', { a: 0.12 }); }
        break;
      case 7: // the Celestial Host: rays
        for (let y = 0; y < G; y++) for (let k = 0; k < 5; k++) { const x = Math.round(T.cols / 2 + (k - 2) * 8 + (y - 2) * (k - 2) * 0.9); if ((y + Math.floor(t * 4)) % 3 === 0) T.put(x, y, '|', '#fff1b8', { a: 0.12 }); }
        break;
      case 8: // the Abyss: drifting void
        for (const [x, y, k] of stars) { const xx = (x + t * (k - 0.5) * 4 + 1000) % T.cols; T.put(xx, y + 1, 'o.'[Math.floor(k * 2)], '#6a3a9a', { a: 0.3 }); }
        break;
      case 9: // the Primordial Throne: prismatic stars
        for (const [x, y, k] of stars) T.put(x, y, '*+.'[Math.floor(k * 3)], `hsl(${(k * 360 + t * 40) % 360},80%,75%)`, { a: 0.35, glow: 0.6 });
        break;
    }
  };
}
