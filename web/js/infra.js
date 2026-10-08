'use strict';
// Infrastructure on every map: bridges and power lines.
//   Bridges span a valley: a deck of segments on columns. Vehicles drive across the deck (or
//   under it), shells stop on the deck, and both pass between the columns. Blasts break the deck
//   in sections: a broken segment falls, and so does any stretch of deck left without support (a
//   bank or a column within BRIDGE_OVERHANG segments); whoever was on it falls too.
//   Power lines run on wooden poles. Knock a pole over and the wires either side of it fall live:
//   anyone on the ground under them takes a shock at once and at the start of each of their turns
//   until the line burns out.

const BRIDGE_SEG = 24; // width of a deck segment
const BRIDGE_DECK = 8; // deck thickness
const BRIDGE_SEG_HP = 160;
const BRIDGE_OVERHANG = 3; // segments of deck that can hang past their nearest support
const POLE_H = 72;
const POLE_HP = 50;
const POLE_GAP = 150;
const LIVE_TURNS = 6; // how many turns a fallen line stays live
const SHOCK_FALL = 30; // damage when a live wire lands on you
const SHOCK_TURN = 16; // and at the start of each of your turns under it

// the deck top at x (deck segments are stepped along a straight line from bank to bank)
function deckTopAt(b, x) {
  if (x < b.x0 || x >= b.x1) return Infinity;
  const s = b.segs[Math.floor((x - b.x0) / BRIDGE_SEG)];
  return s && !s.gone ? s.y : Infinity;
}

Object.assign(Terrain.prototype, {
  // a shell stops on a bridge deck (columns let it through)
  bridgeAt(x, y) {
    for (const b of this.bridges || []) {
      const top = deckTopAt(b, x);
      if (y >= top && y <= top + BRIDGE_DECK) return b;
    }
    return null;
  },
});

Object.assign(Game.prototype, {
  placeInfra(avoid) {
    const T = this.terrain;
    T.bridges = [];
    T.lines = [];
    // a bridge over the deepest suitable valley: banks within a gentle slope of each other and the
    // ground between at least 70 below the deck line
    let best = null;
    for (let xa = 200; xa < WORLD_W - 700; xa += 20) {
      for (let L = 260; L <= 520; L += 40) {
        const xb = xa + L;
        const ya = T.hAt(xa), yb = T.hAt(xb);
        if (Math.abs(ya - yb) > L * 0.25) continue;
        let depth = 0;
        for (let x = xa + 20; x < xb - 20; x += 10) depth = Math.max(depth, T.hAt(x) - lerp(ya, yb, (x - xa) / L));
        let ok = depth > 70;
        for (let x = xa; x <= xb && ok; x += 10) if (T.hAt(x) < lerp(ya, yb, (x - xa) / L) - 4) ok = false; // nothing pokes up through it
        if (ok && (!best || depth > best.depth)) best = { xa, xb, ya, yb, depth };
      }
    }
    if (best && rng.chance(0.85)) {
      const segs = [];
      const n = Math.floor((best.xb - best.xa) / BRIDGE_SEG);
      for (let i = 0; i < n; i++) {
        const cx = best.xa + (i + 0.5) * BRIDGE_SEG;
        segs.push({ y: Math.round(lerp(best.ya, best.yb, (cx - best.xa) / (best.xb - best.xa))), hp: BRIDGE_SEG_HP });
      }
      const cols = [];
      for (let x = best.xa + 70; x < best.xa + n * BRIDGE_SEG - 50; x += 100) cols.push(x);
      T.bridges.push({ x0: best.xa, x1: best.xa + n * BRIDGE_SEG, segs, cols, style: this.biome.fort });
    }
    // a power line somewhere clear of the vehicles and the bridge
    const nPoles = rng.int(3, 5);
    const len = (nPoles - 1) * POLE_GAP;
    for (let k = 0; k < 80; k++) {
      const x0 = rng.range(120, WORLD_W - 120 - len);
      const hitsBridge = T.bridges.some((b) => x0 < b.x1 + 40 && x0 + len > b.x0 - 40);
      if (hitsBridge) continue;
      const poles = [];
      for (let i = 0; i < nPoles; i++) poles.push({ x: Math.round(x0 + i * POLE_GAP), hp: POLE_HP, fallen: 0 });
      // rolling ground only: no pole on a vehicle, and every wire clears the ground between its poles
      if (poles.some((p) => (avoid || []).some((x) => Math.abs(x - p.x) < 50))) continue;
      let clear = true;
      for (let i = 0; i + 1 < nPoles && clear; i++) {
        const a = poles[i].x, b = poles[i + 1].x, ya = T.hAt(a) - POLE_H, yb = T.hAt(b) - POLE_H;
        if (Math.abs(ya - yb) > 70) clear = false;
        for (let x = a; x <= b && clear; x += 10) if (T.hAt(x) < lerp(ya, yb, (x - a) / (b - a)) + 30) clear = false;
      }
      if (!clear) continue;
      T.lines.push({ poles, spans: poles.slice(1).map(() => ({ state: 'up', until: 0 })) });
      break;
    }
  },

  // blasts break deck segments (any segment gone and the bridge comes down) and knock poles over
  blastInfra(x, y, def) {
    const T = this.terrain;
    const r = Math.max(28, def.dmgR * 0.6);
    for (const b of (T.bridges || []).slice()) {
      const broken = [];
      b.segs.forEach((s, i) => {
        if (s.gone) return;
        const cx = b.x0 + (i + 0.5) * BRIDGE_SEG;
        const d = dist(cx, s.y + BRIDGE_DECK / 2, x, y);
        if (d < r) { s.hp -= (def.dmg * 0.5 + 40) * (1 - d / r); if (s.hp <= 0) broken.push(i); }
      });
      if (broken.length) this.breakBridge(b, broken);
    }
    for (const line of T.lines || []) {
      line.poles.forEach((p, i) => {
        if (p.fallen) return;
        const py = T.hAt(p.x) - POLE_H / 2;
        const d = dist(p.x, py, x, y);
        if (d >= Math.max(30, def.dmgR * 0.7)) return;
        p.hp -= (def.dmg * 0.5 + 30) * (1 - d / Math.max(30, def.dmgR * 0.7));
        if (p.hp > 0) return;
        p.fallen = Math.sign(p.x - x) || 1; // topples away from the blast
        for (const k of [i - 1, i]) {
          const s = line.spans[k];
          if (s && s.state === 'up') { s.state = 'live'; s.until = this.turnCount + LIVE_TURNS; this.shockSpan(line, k, SHOCK_FALL); }
        }
        this.events.push('A power line is down.');
        this.sfx.thud();
      });
    }
  },

  // drop the broken segments, then every stretch of deck left hanging: a run of segments stays up
  // only where it rests on a bank (its end segments) or a column, out to BRIDGE_OVERHANG either side
  breakBridge(b, broken) {
    const T = this.terrain;
    for (const i of broken) b.segs[i].gone = true;
    const n = b.segs.length;
    const support = b.segs.map((_, i) => i === 0 || i === n - 1);
    for (const x of b.cols) support[clamp(Math.floor((x - b.x0) / BRIDGE_SEG), 0, n - 1)] = true;
    const falls = broken.slice();
    for (let i = 0; i < n;) {
      if (b.segs[i].gone) { i++; continue; }
      let j = i;
      while (j + 1 < n && !b.segs[j + 1].gone) j++;
      // segments of the run [i, j] further than BRIDGE_OVERHANG from a support in the run fall
      const sup = [];
      for (let k = i; k <= j; k++) if (support[k]) sup.push(k);
      for (let k = i; k <= j; k++) {
        const near = sup.length ? Math.min(...sup.map((q) => Math.abs(q - k))) : Infinity;
        if (near > BRIDGE_OVERHANG) { b.segs[k].gone = true; falls.push(k); }
      }
      i = j + 1;
    }
    const col = hexToRgb(b.style.stone);
    for (const i of falls) {
      const cx = b.x0 + (i + 0.5) * BRIDGE_SEG, y = b.segs[i].y;
      for (let k = 0; k < 4; k++) this.particles.add({ x: cx + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, g: 0.3, drag: 0.98, life: 1.2 + Math.random(), size: 5 + Math.random() * 6, color: col });
    }
    this.shake = Math.max(this.shake, 3 + falls.length * 0.5);
    if (falls.length > broken.length) { // more than the blast itself took: a section came down
      this.sfx.explosion(20);
      this.ui.notice('A bridge section collapses!');
    }
    this.events.push(falls.length > broken.length ? 'A bridge section collapsed.' : 'The bridge deck is holed.');
    if (b.segs.every((s) => s.gone)) T.bridges = T.bridges.filter((x) => x !== b);
  },

  // live wire on the ground between poles k and k+1: shocks vehicles standing on the ground there
  shockSpan(line, k, amt) {
    const a = line.poles[k].x, b = line.poles[k + 1].x;
    for (const t of this.tanks) {
      if (!t.alive || t.x < a - 6 || t.x > b + 6 || Math.abs(t.y - this.terrain.hAt(t.x)) > 8) continue;
      this.zap(t, amt);
    }
  },

  zap(t, amt) {
    for (let i = 0; i < 10; i++) this.particles.add({ x: t.x + (Math.random() - 0.5) * 30, y: t.y - Math.random() * 30, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, g: 0.1, drag: 0.9, life: 0.4, size: 3 + Math.random() * 3, color: i % 2 ? [150, 220, 255] : [255, 255, 255] });
    this.particles.text(t.x, t.y - 70, 'ZAP', '#9ad8ff');
    this.damage(t, amt, null);
  },

  // start of a vehicle's turn: live lines under it shock it; burnt-out lines go dead
  infraTurn(t) {
    for (const line of this.terrain.lines || []) {
      line.spans.forEach((s, k) => {
        if (s.state !== 'live') return;
        if (this.turnCount >= s.until) { s.state = 'dead'; return; }
        const a = line.poles[k].x, b = line.poles[k + 1].x;
        if (t.alive && t.x >= a - 6 && t.x <= b + 6 && Math.abs(t.y - this.terrain.hAt(t.x)) <= 8) this.zap(t, SHOCK_TURN);
      });
    }
  },

  drawInfra(ctx) {
    const T = this.terrain;
    for (const b of T.bridges || []) {
      const s = b.style;
      ctx.fillStyle = s.dark;
      for (const x of b.cols) { // columns from under the deck to the ground (vehicles and shells pass)
        const top = b.segs[clamp(Math.floor((x - b.x0) / BRIDGE_SEG), 0, b.segs.length - 1)].y + BRIDGE_DECK; // a column stands even when its deck is gone
        ctx.fillRect(x - 5, top, 10, T.hAt(x) - top + 4);
        ctx.fillStyle = s.light;
        ctx.fillRect(x - 5, top, 3, T.hAt(x) - top + 4);
        ctx.fillStyle = s.dark;
      }
      b.segs.forEach((seg, i) => {
        if (seg.gone) return;
        const x = b.x0 + i * BRIDGE_SEG;
        ctx.fillStyle = i % 2 ? s.stone : s.light;
        ctx.fillRect(x, seg.y, BRIDGE_SEG, BRIDGE_DECK);
        ctx.fillStyle = s.dark;
        ctx.fillRect(x, seg.y + BRIDGE_DECK - 2, BRIDGE_SEG, 2);
        if (seg.hp < BRIDGE_SEG_HP * 0.5) ctx.fillRect(x + 8, seg.y + 2, 4, 3); // cracks
        ctx.fillRect(x, seg.y - 6, 2, 6); // railing posts
        ctx.fillRect(x, seg.y - 6, BRIDGE_SEG, 1);
      });
    }
    const blink = (this.time * 8 | 0) % 2;
    for (const line of T.lines || []) {
      const top = (p) => ({ x: p.x, y: T.hAt(p.x) - POLE_H + 4 });
      line.spans.forEach((s, k) => {
        const a = line.poles[k], b = line.poles[k + 1];
        if (s.state === 'up' && !a.fallen && !b.fallen) { // a sagging wire between the pole tops
          const p = top(a), q = top(b);
          ctx.fillStyle = '#2e2a30';
          for (let f = 0; f <= 1; f += 0.04) sq(ctx, lerp(p.x, q.x, f), lerp(p.y, q.y, f) + 14 * 4 * f * (1 - f), 2);
        } else { // on the ground: live (sparking) or dead
          ctx.fillStyle = s.state === 'live' ? '#3a4a5a' : '#4a4448';
          for (let x = a.x; x <= b.x; x += 6) sq(ctx, x, T.hAt(x) - 2, 3);
          if (s.state === 'live') {
            for (let i = 0; i < 4; i++) {
              const x = a.x + ((this.time * 97 + i * 37 + k * 13) % 1) * (b.x - a.x);
              ctx.fillStyle = (i + blink) % 2 ? '#bfe8ff' : '#ffffff';
              sq(ctx, x, T.hAt(x) - 4 - Math.random() * 6, 3 + Math.random() * 3);
            }
          }
        }
      });
      for (const p of line.poles) {
        const g = T.hAt(p.x);
        ctx.fillStyle = '#5a4030';
        if (p.fallen) { ctx.fillRect(Math.min(p.x, p.x + p.fallen * POLE_H), g - 4, POLE_H, 4); continue; }
        ctx.fillRect(p.x - 2, g - POLE_H, 4, POLE_H);
        ctx.fillRect(p.x - 12, g - POLE_H + 6, 24, 3); // crossarm
        ctx.fillStyle = '#c8c0a8';
        ctx.fillRect(p.x - 12, g - POLE_H + 3, 3, 3); // insulators
        ctx.fillRect(p.x + 9, g - POLE_H + 3, 3, 3);
      }
    }
  },
});
