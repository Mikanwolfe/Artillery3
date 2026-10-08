'use strict';
// Infrastructure on every map: bridges, highways, power lines and radio towers. Everything is built
// of sturdier stuff as the match goes on (MATERIALS: timber, then concrete from round 3, steel from
// round 5), and the bigger structures arrive later: radio towers from round 2, highways from 3.
//   Bridges span a valley: a deck of segments on columns. Vehicles drive across the deck (or
//   under it), shells stop on the deck, and both pass between the columns. Blasts break the deck
//   in sections: a broken segment falls, and so does any stretch of deck left without support (a
//   bank or a column within BRIDGE_OVERHANG segments); whoever was on it falls too.
//   Power lines run on wooden poles. Knock a pole over and the wires either side of it fall live:
//   anyone on the ground under them takes a shock at once and at the start of each of their turns
//   until the line burns out.
//   Highways are long elevated roads on paired piers: the bridge rules, a thicker, tougher deck.
//   Radio towers are tall lattice masts on high ground. Shells and beams stop on them; break a
//   section and everything above it topples away from the blast, crushing whatever it lands on.

const BRIDGE_SEG = 24; // width of a deck segment
const BRIDGE_DECK = 8; // deck thickness
const BRIDGE_SEG_HP = 140;
const BRIDGE_OVERHANG = 3; // segments of deck that can hang past their nearest support
const POLE_H = 72;
const POLE_HP = 50;
const POLE_GAP = 150;
const HIGHWAY_DECK = 14;
const HIGHWAY_SEG_HP = 220;
const TOWER_SEC = 40; // height of a radio tower section
const TOWER_SEC_HP = 120;
const TOWER_CRUSH = 14; // damage per fallen section to whatever a toppling tower lands on (up to 90)
const MATERIALS = {
  timber: { hp: 1, deck: ['#8a6440', '#a47c52', '#5a3e26'], pole: '#5a4030' },
  concrete: { hp: 1.5, deck: ['#a4a29c', '#c2c0ba', '#6a6864'], pole: '#8a8884' },
  steel: { hp: 2.2, deck: ['#56667a', '#7888a0', '#323a48'], pole: '#4a5260' },
};
function materialFor(round) { return round >= 5 ? 'steel' : round >= 3 ? 'concrete' : 'timber'; }
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
      if (y >= top && y <= top + b.deck) return b;
    }
    return null;
  },

  // a standing radio tower section at (x, y): the lattice tapers from 24 wide at the base to 8
  towerAt(x, y) {
    for (const t of this.towers || []) {
      if (!t.h) continue;
      const g = this.hAt(t.x), top = g - t.h * TOWER_SEC;
      if (y > g || y < top) continue;
      const hw = lerp(12, 4, (g - y) / (t.n * TOWER_SEC));
      if (Math.abs(x - t.x) < hw) return t;
    }
    return null;
  },
});

Object.assign(Game.prototype, {
  placeInfra(avoid) {
    const T = this.terrain;
    T.bridges = [];
    T.lines = [];
    T.towers = [];
    const round = this.round || 1;
    const mat = MATERIALS[materialFor(round)];
    const style = { stone: mat.deck[0], light: mat.deck[1], dark: mat.deck[2] };
    T.material = mat;
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
        segs.push({ y: Math.round(lerp(best.ya, best.yb, (cx - best.xa) / (best.xb - best.xa))), hp: BRIDGE_SEG_HP * mat.hp });
      }
      const cols = [];
      for (let x = best.xa + 70; x < best.xa + n * BRIDGE_SEG - 50; x += 100) cols.push(x);
      T.bridges.push({ kind: 'bridge', x0: best.xa, x1: best.xa + n * BRIDGE_SEG, segs, cols, style, deck: BRIDGE_DECK, segHp: BRIDGE_SEG_HP * mat.hp });
    }
    if (round >= 3) this.placeHighway(avoid, mat, style);
    if (round >= 2) this.placeTowers(avoid, mat, round >= 4 ? 2 : 1, Math.min(360, 220 + 20 * round));
    // a power line somewhere clear of the vehicles and the bridge
    const nPoles = rng.int(3, 5);
    const len = (nPoles - 1) * POLE_GAP;
    for (let k = 0; k < 80; k++) {
      const x0 = rng.range(120, WORLD_W - 120 - len);
      const hitsBridge = T.bridges.some((b) => x0 < b.x1 + 40 && x0 + len > b.x0 - 40) || T.towers.some((t) => x0 < t.x + 60 && x0 + len > t.x - 60);
      if (hitsBridge) continue;
      const poles = [];
      for (let i = 0; i < nPoles; i++) poles.push({ x: Math.round(x0 + i * POLE_GAP), hp: POLE_HP * mat.hp, fallen: 0 });
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

  // a highway: a long straight elevated road between two points on the ground, clear of the terrain
  // by at least 30 all along its middle, on paired piers every 90
  placeHighway(avoid, mat, style) {
    const T = this.terrain;
    const cands = [];
    for (let xa = 150; xa < WORLD_W - 700; xa += 30) {
      for (let L = 560; L <= 900; L += 60) {
        const xb = xa + L;
        if (xb > WORLD_W - 100) break;
        if (T.bridges.some((b) => xa < b.x1 + 60 && xb > b.x0 - 60)) continue;
        const ya = T.hAt(xa), yb = T.hAt(xb);
        if (Math.abs(ya - yb) > L * 0.2) continue;
        let ok = true, clear = 0;
        for (let x = xa + 60; x <= xb - 60 && ok; x += 10) {
          const c = T.hAt(x) - lerp(ya, yb, (x - xa) / L);
          if (c < 30) ok = false; else clear += c;
        }
        if (ok) cands.push({ xa, xb, ya, yb, clear: clear / L });
      }
    }
    if (!cands.length) return;
    cands.sort((a, b) => b.clear - a.clear);
    const h = cands[Math.min(cands.length - 1, rng.int(0, 2))];
    const n = Math.floor((h.xb - h.xa) / BRIDGE_SEG);
    const segs = [];
    for (let i = 0; i < n; i++) segs.push({ y: Math.round(lerp(h.ya, h.yb, (i + 0.5) / n)), hp: HIGHWAY_SEG_HP * mat.hp });
    const cols = [];
    for (let x = h.xa + 60; x < h.xa + n * BRIDGE_SEG - 50; x += 90) cols.push(x);
    T.bridges.push({ kind: 'highway', x0: h.xa, x1: h.xa + n * BRIDGE_SEG, segs, cols, style, deck: HIGHWAY_DECK, segHp: HIGHWAY_SEG_HP * mat.hp });
  },

  // radio towers on high ground, away from the vehicles and the other structures
  placeTowers(avoid, mat, count, height) {
    const T = this.terrain;
    const busy = (x) => (avoid || []).some((a) => Math.abs(a - x) < 90) || T.bridges.some((b) => x > b.x0 - 50 && x < b.x1 + 50) || T.towers.some((t) => Math.abs(t.x - x) < 600);
    for (let k = 0; k < count; k++) {
      let best = null;
      for (let x = 150; x < WORLD_W - 150; x += 15) {
        if (busy(x)) continue;
        const y = T.hAt(x);
        if (Math.abs(T.hAt(x - 12) - T.hAt(x + 12)) > 14) continue; // a flattish footing
        if (!best || y < best.y) best = { x, y };
      }
      if (!best) return;
      const n = Math.round(height / TOWER_SEC);
      T.towers.push({ x: best.x, n, h: n, hp: Array.from({ length: n }, () => TOWER_SEC_HP * mat.hp), maxHp: TOWER_SEC_HP * mat.hp, debris: [] });
    }
  },

  // a section of tower broke: it and everything above topple away from the blast and crush what
  // they land on
  toppleTower(t, k, fromX) {
    const T = this.terrain;
    const fallen = t.h - k;
    if (fallen <= 0) return;
    const dir = Math.sign(t.x - fromX) || 1;
    const L = fallen * TOWER_SEC;
    const a = t.x + dir * 6, b = t.x + dir * (6 + L);
    t.debris.push({ x0: Math.min(a, b), x1: Math.max(a, b) });
    t.h = k;
    const dmg = Math.min(90, TOWER_CRUSH * fallen);
    for (const v of this.tanks) {
      if (!v.alive || v.x < Math.min(a, b) - TANK_W / 2 || v.x > Math.max(a, b) + TANK_W / 2) continue;
      if (Math.abs(v.y - T.hAt(v.x)) > 30) continue; // up on a bridge or a fort: it falls past
      this.particles.text(v.x, v.y - 70, 'CRUSHED', '#e8c890');
      this.damage(v, dmg, null);
    }
    T.fellTrees((a + b) / 2, T.hAt((a + b) / 2) - 10, L / 2);
    for (let x = Math.min(a, b); x < Math.max(a, b); x += 12) this.particles.puff(x, T.hAt(x), [150, 145, 140]);
    this.shake = Math.max(this.shake, 6);
    this.sfx.explosion(25);
    this.ui.notice(k ? 'The radio tower snaps!' : 'The radio tower comes down!');
    this.events.push(k ? 'A radio tower lost its top.' : 'A radio tower came down.');
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
        const d = dist(cx, s.y + b.deck / 2, x, y);
        if (d < r) { s.hp -= (def.dmg * 0.5 + 40) * (1 - d / r); if (s.hp <= 0) broken.push(i); }
      });
      if (broken.length) this.breakBridge(b, broken);
    }
    for (const t of T.towers || []) {
      if (!t.h) continue;
      const g = T.hAt(t.x);
      let lowest = -1;
      for (let k = 0; k < t.h; k++) {
        const d = dist(t.x, g - (k + 0.5) * TOWER_SEC, x, y);
        if (d >= r + 10) continue;
        t.hp[k] -= (def.dmg * 0.5 + 40) * (1 - d / (r + 10));
        if (t.hp[k] <= 0 && lowest < 0) lowest = k;
      }
      if (lowest >= 0) this.toppleTower(t, lowest, x);
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

  // for the CPUs: the live span a vehicle at ground level at x would be standing under, if any
  liveWireAt(x, y) {
    if (Math.abs(y - this.terrain.hAt(x)) > 8) return null;
    for (const line of this.terrain.lines || []) {
      for (let k = 0; k < line.spans.length; k++) {
        const a = line.poles[k].x, b = line.poles[k + 1].x;
        if (line.spans[k].state === 'live' && x >= a - 6 && x <= b + 6) return { a, b };
      }
    }
    return null;
  },

  // and whether a deck (bridge or highway) is overhead, close enough to catch its shots
  coveredAt(x, y) {
    for (const b of this.terrain.bridges || []) {
      for (const dx of [-12, 0, 12]) {
        const top = deckTopAt(b, x + dx);
        if (top < y - 10 && y - top < 400) return true;
      }
    }
    return false;
  },

  // the nearest place to drive to (ground x) with open sky, within `reach`; null if none
  clearSpot(t, reach) {
    for (let d = 16; d <= reach; d += 8) {
      for (const dir of [1, -1]) {
        const x = t.x + dir * d;
        if (x < 30 || x > WORLD_W - 30) continue;
        if (!this.coveredAt(x, this.groundAt(x, t.y)) && !this.liveWireAt(x, this.terrain.hAt(x)) && this.terrain.lavaAt(x) < 0.1 && !this.terrain.voidAt(x)) return x;
      }
    }
    return null;
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
      const hw = b.kind === 'highway';
      for (const x of b.cols) { // columns from under the deck to the ground (vehicles and shells pass)
        const top = b.segs[clamp(Math.floor((x - b.x0) / BRIDGE_SEG), 0, b.segs.length - 1)].y + b.deck; // a column stands even when its deck is gone
        for (const ox of hw ? [-9, 9] : [0]) { // a highway stands on paired piers
          ctx.fillStyle = s.dark;
          ctx.fillRect(x + ox - (hw ? 6 : 5), top, hw ? 12 : 10, T.hAt(x + ox) - top + 4);
          ctx.fillStyle = s.light;
          ctx.fillRect(x + ox - (hw ? 6 : 5), top, 3, T.hAt(x + ox) - top + 4);
        }
        if (hw) { ctx.fillStyle = s.dark; ctx.fillRect(x - 16, top, 32, 5); } // pier cap
      }
      b.segs.forEach((seg, i) => {
        if (seg.gone) return;
        const x = b.x0 + i * BRIDGE_SEG;
        ctx.fillStyle = i % 2 ? s.stone : s.light;
        ctx.fillRect(x, seg.y, BRIDGE_SEG, b.deck);
        ctx.fillStyle = s.dark;
        ctx.fillRect(x, seg.y + b.deck - 2, BRIDGE_SEG, 2);
        if (seg.hp < b.segHp * 0.5) ctx.fillRect(x + 8, seg.y + 3, 4, 3); // cracks
        if (hw) { // a highway: lane markings, a crash barrier, and a street lamp every few spans
          ctx.fillStyle = '#e8e2c8';
          if (i % 2) ctx.fillRect(x + 4, seg.y + 1, 12, 2);
          ctx.fillStyle = s.dark;
          ctx.fillRect(x, seg.y - 4, BRIDGE_SEG, 4);
          if (i % 5 === 2) {
            ctx.fillRect(x + 10, seg.y - 30, 3, 26);
            ctx.fillRect(x + 10, seg.y - 30, 10, 3);
            ctx.fillStyle = '#ffe8a0';
            ctx.fillRect(x + 16, seg.y - 27, 4, 2);
          }
        } else {
          ctx.fillRect(x, seg.y - 6, 2, 6); // railing posts
          ctx.fillRect(x, seg.y - 6, BRIDGE_SEG, 1);
        }
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
        ctx.fillStyle = (T.material || MATERIALS.timber).pole;
        if (p.fallen) { ctx.fillRect(Math.min(p.x, p.x + p.fallen * POLE_H), g - 4, POLE_H, 4); continue; }
        ctx.fillRect(p.x - 2, g - POLE_H, 4, POLE_H);
        ctx.fillRect(p.x - 12, g - POLE_H + 6, 24, 3); // crossarm
        ctx.fillStyle = '#c8c0a8';
        ctx.fillRect(p.x - 12, g - POLE_H + 3, 3, 3); // insulators
        ctx.fillRect(p.x + 9, g - POLE_H + 3, 3, 3);
      }
    }
    for (const t of T.towers || []) this.drawTower(ctx, t, blink);
  },

  // a lattice mast: two tapering legs with cross-bracing every section, a red beacon on top
  drawTower(ctx, t, blink) {
    const T = this.terrain;
    const g = T.hAt(t.x);
    const col = (T.material || MATERIALS.steel).pole;
    for (const d of t.debris) { // fallen sections lying on the ground
      ctx.fillStyle = col;
      for (let x = d.x0; x < d.x1; x += 4) sq(ctx, x, T.hAt(x) - 3, 3);
      for (let x = d.x0; x < d.x1; x += 20) { sq(ctx, x + 5, T.hAt(x) - 7, 3); sq(ctx, x + 10, T.hAt(x) - 4, 3); }
    }
    if (!t.h) return;
    const H = t.n * TOWER_SEC;
    const half = (y) => lerp(12, 4, (g - y) / H);
    for (let k = 0; k < t.h; k++) {
      const y0 = g - k * TOWER_SEC, y1 = y0 - TOWER_SEC;
      const hurt = t.hp[k] < t.maxHp * 0.5;
      ctx.fillStyle = hurt ? '#7a5048' : col;
      for (let y = y0; y > y1; y -= 3) { sq(ctx, t.x - half(y), y, 3); sq(ctx, t.x + half(y), y, 3); } // legs
      for (let f = 0; f <= 1; f += 0.1) { // an X brace
        const y = lerp(y0, y1, f);
        sq(ctx, lerp(t.x - half(y0), t.x + half(y1), f), y, 2);
        sq(ctx, lerp(t.x + half(y0), t.x - half(y1), f), y, 2);
      }
      ctx.fillRect(Math.round(t.x - half(y1)), Math.round(y1), Math.round(half(y1) * 2), 2); // rung
    }
    const top = g - t.h * TOWER_SEC;
    if (t.h === t.n) { // the antenna and its beacon only while the top survives
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(t.x - 1), Math.round(top - 30), 2, 30);
      ctx.fillRect(Math.round(t.x - 8), Math.round(top - 14), 16, 2);
      ctx.fillStyle = blink ? '#ff3a3a' : '#7a2020';
      sq(ctx, t.x, top - 32, 5);
    }
  },
});
