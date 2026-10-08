'use strict';
// Laser drones. A laser weapon is a drone that floats above its girl's head and only ever moves
// straight up and down. She fires a laser pointer (a marker round, lobbed like any shell); where it
// lands, the drone rises until it can see the spot, up to its weapon's ceiling (w.ceil above its
// resting height), and fires a beam straight at it. If a ridge still blocks the line at the
// ceiling, the beam burns into the ridge instead: lasers can't shoot over ridges, but in direct
// fire they land exactly where the pointer did, at full strength. At rest it perches beside her head;
// to fire it always rises clear of her name plate first (DRONE_CLEAR). Anything in the beam's path (a
// vehicle, a drone, a fort, a bridge deck) takes the hit first; trees don't stop it.
// The Void Between Stars is a lightning drone: its bolt arcs on from whatever it hits to the
// nearest other thing in reach (vehicles, drones, MAIA, trees, poles, crates), weaker each jump.

const DRONE_REST = 32; // at rest the drone perches beside its girl's head, just behind her
const DRONE_BACK = 20; // (this far behind her, under her health bars)
const DRONE_CLEAR = 90; // to fire it first rises at least this far, clear of her name plate
const DRONE_RISE = 7; // units a frame it climbs toward a shot (faster on a long climb)
const DRONE_SINK = 4; // and sinks back when it's done
// a shot plays out like a MAIA strike: the camera rides the drone up while it charges, then pans to
// the target, and only then does the beam land. Later beams in the same volley skip the wind-up.
const DRONE_CHARGE = 30;
const DRONE_PAN = 28;
const BEAM_STEP = 5; // beam trace resolution
const CEIL_STEP = 6; // height search resolution

function droneOrigin(t, h = t.drone ? t.drone.h : 0) { return { x: t.x - t.facing * DRONE_BACK, y: t.y - DRONE_REST - h }; }
function laserCeil(w) { return 3 * (w.ceil || 100 + 20 * w.rarity); } // how far above DRONE_CLEAR it can climb

// march a beam from (x0,y0) toward (x1,y1); `solid` only (no targets) for line-of-sight checks.
// Stops on terrain, forts, bridge decks or (unless solid) the first target hitbox in the way.
function beamTrace(terrain, targets, owner, x0, y0, x1, y1, solid = false) {
  const d = dist(x0, y0, x1, y1);
  const n = Math.max(1, Math.ceil(d / BEAM_STEP));
  for (let i = 1; i <= n; i++) {
    const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n);
    if (x < 0 || x >= WORLD_W) return { x, y, hit: 'out' };
    if (y >= terrain.hAt(x)) return { x, y, hit: 'terrain' };
    if (terrain.forts.length && terrain.fortAt(x, y)) return { x, y, hit: 'fort' };
    if (terrain.bridges && terrain.bridges.length && terrain.bridgeAt(x, y)) return { x, y, hit: 'bridge' };
    if (terrain.towers && terrain.towers.length && terrain.towerAt(x, y)) return { x, y, hit: 'tower' };
    if (solid) continue;
    for (const t of targets) {
      if (!t.alive || t === owner) continue;
      const hw = t.hw || TANK_W / 2 + 2, hh = t.hh || TANK_H + 2;
      const by = t.hitY === undefined ? t.y : t.hitY;
      if (Math.abs(x - t.x) < hw && y > by - hh && y < by + 2) return { x, y, hit: 'tank', tank: t };
    }
  }
  return { x: x1, y: y1, hit: 'spot' };
}

// The drone's shot at a pointer spot: how high it has to climb (capped at its ceiling) and where the
// beam ends. Shared by the game and the CPU's solver.
function droneShot(terrain, targets, owner, w, spot) {
  const ceil = laserCeil(w);
  // aim a little past the spot so a beam onto the ground meets the surface
  const o0 = droneOrigin(owner, 0);
  const sees = (h) => {
    const r = beamTrace(terrain, targets, owner, o0.x, o0.y - h, spot.x, spot.y - 3, true);
    return r.hit === 'spot';
  };
  const top = DRONE_CLEAR + ceil;
  let h = top;
  for (let k = DRONE_CLEAR; k <= top; k += CEIL_STEP * 3) { // coarse, then fine
    if (sees(k)) { h = k; for (let j = Math.max(DRONE_CLEAR, k - CEIL_STEP * 3); j < k; j += CEIL_STEP) if (sees(j)) { h = j; break; } break; }
  }
  if (h < top) h = Math.min(top, h + 12); // a little margin over the ridge that only just allowed it
  const o = { x: o0.x, y: o0.y - h };
  const L = dist(o.x, o.y, spot.x, spot.y) || 1;
  const ex = spot.x + ((spot.x - o.x) / L) * 8, ey = spot.y + ((spot.y - o.y) / L) * 8;
  const end = beamTrace(terrain, targets, owner, o.x, o.y, ex, ey);
  if (end.hit === 'spot') { end.x = spot.x; end.y = spot.y; }
  return { h, origin: o, end };
}

// One beam: waits for the drone to climb, fires, lingers a moment so the turn doesn't end mid-flash.
class DroneBeam {
  constructor(game, w, owner, pointer) {
    this.game = game;
    this.w = w;
    this.owner = owner;
    this.x = pointer.x; this.y = pointer.y;
    this.front = game.frontMult(pointer);
    this.main = pointer.main;
    this.uplink = pointer.uplink;
    this.age = 0;
    this.shot = droneShot(game.terrain, game.targets(), owner, w, pointer);
    this.hold = 0;
    this.fired = false;
  }

  update() {
    const g = this.game, t = this.owner;
    this.age++;
    if (!t.drone) t.drone = { h: 0, busy: 0, charge: 0, primed: false };
    const d = t.drone;
    d.busy = 30;
    if (!this.fired) {
      if (!this.stage) { // a later beam in the same volley skips the wind-up
        this.stage = 'move';
        this.charge = d.primed ? 4 : DRONE_CHARGE;
        const far = Math.abs(this.shot.end.x - g.cam.x - VIEW_W / 2) > VIEW_W * 0.3;
        this.pan = d.primed && !far ? 0 : DRONE_PAN;
        if (!d.primed) g.cam.follow(this.droneFocus());
      }
      if (this.stage === 'move') {
        const gap = this.shot.h - d.h;
        if (Math.abs(gap) > 0.5) { d.h += Math.sign(gap) * Math.min(Math.abs(gap), Math.max(DRONE_RISE, Math.abs(gap) * 0.1)); return true; }
        d.h = this.shot.h;
        this.stage = 'charge';
      }
      if (this.stage === 'charge') {
        d.charge = Math.min(1, d.charge + 1 / DRONE_CHARGE);
        if (--this.charge > 0) return true;
        this.stage = 'pan';
        if (this.pan) g.cam.follow({ x: this.shot.end.x, y: this.shot.end.y });
      }
      if (this.stage === 'pan' && --this.pan > 0) return true;
      this.fire(g);
      this.fired = true;
      d.primed = true;
      d.charge = 0;
      this.hold = 24;
      return true;
    }
    return --this.hold > 0;
  }

  // a camera target that tracks the drone as it climbs
  droneFocus() {
    const t = this.owner;
    return { get x() { return droneOrigin(t).x; }, get y() { return droneOrigin(t).y + VIEW_H * 0.2; } };
  }

  fire(g) {
    const w = this.w, t = this.owner;
    // re-trace from where the drone actually is: things may have moved since the pointer landed
    const o = droneOrigin(t);
    const s = this.shot;
    const L = dist(o.x, o.y, s.end.x, s.end.y) || 1;
    let end = beamTrace(g.terrain, g.targets(), t, o.x, o.y, s.end.x + ((s.end.x - o.x) / L) * 8, s.end.y + ((s.end.y - o.y) / L) * 8);
    if (end.hit === 'spot') end = s.end;
    t.drone.flash = 1;
    if (w.chain) g.boltBetween(o, end, 26);
    else {
      const c = RARITY[w.rarity].color;
      g.lasers.push(new Laser(o.x, o.y, end.x, end.y, (DRONE_ART[w.id] && DRONE_ART[w.id].beam) || (c === '#ffffff' ? '#e0e0ff' : c), Math.min(18, 8 + w.dmg / 250), 50));
    }
    if (w.chain) g.sfx.thunder(); else g.sfx.laser();
    g.explode(end.x, end.y, { ...w, front: this.front, dmg: w.dmg * this.front, from: { x: o.x - end.x, y: o.y - end.y } }, t, 'laser');
    if (w.acid) { // an acid laser (the Ichor): the beam leaves a boiling pool
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI * (0.15 + 0.7 * rng.next());
        const sp = 1.5 + rng.next() * 4;
        g.drops.push(new AcidDrop(g, t, end.x, end.y - 4, Math.cos(a) * sp, Math.sin(a) * sp, w.acid));
      }
    }
    if (w.chain) g.chainArc(end, w, t, w.dmg * this.front);
    if ((w.sat || this.uplink) && this.main) g.satTarget = { x: end.x, y: end.y, owner: t };
  }

  draw() {}
}

Object.assign(Game.prototype, {
  // drones sink back to rest when no beam needs them
  stepDrones() {
    for (const t of this.tanks) {
      const d = t.drone;
      if (!d) continue;
      if (d.flash) d.flash = Math.max(0, d.flash - 0.08);
      if (d.busy > 0) { d.busy--; continue; }
      d.primed = false;
      d.charge = 0;
      if (d.h > 0) d.h = Math.max(0, d.h - Math.max(DRONE_SINK, d.h * 0.04));
    }
  },

  boltBetween(a, b, life = 22) {
    const pts = [{ x: a.x, y: a.y }];
    const n = Math.max(3, Math.round(dist(a.x, a.y, b.x, b.y) / 40));
    const amp = Math.min(40, dist(a.x, a.y, b.x, b.y) * 0.12);
    for (let i = 1; i < n; i++) pts.push({ x: lerp(a.x, b.x, i / n) + (Math.random() - 0.5) * amp, y: lerp(a.y, b.y, i / n) + (Math.random() - 0.5) * amp });
    pts.push({ x: b.x, y: b.y });
    this.chainBolts = (this.chainBolts || []).concat({ pts, life });
    this.screenFlash = Math.max(this.screenFlash || 0, 0.2);
  },

  // lightning arcs from `from` to the nearest unvisited thing within w.chain.range, chain.n times,
  // each jump doing chain.fall of the last. Trees, poles and crates are fair game, so they soak arcs.
  chainArc(from, w, owner, dmg) {
    const C = w.chain;
    const T = this.terrain;
    const seen = new Set();
    // whatever the main bolt struck doesn't take an arc as well
    for (const t of this.targets()) if (t.alive && dist(seekCenter(t).x, seekCenter(t).y, from.x, from.y) < Math.max(30, w.dmgR * 0.5)) seen.add(t);
    let at = { x: from.x, y: from.y };
    for (let k = 1; k <= C.n; k++) {
      dmg *= C.fall;
      const cands = [];
      for (const t of this.targets()) if (t.alive && t !== owner && !seen.has(t)) cands.push({ o: t, kind: 'target', ...seekCenter(t) });
      for (const tr of T.trees) if (tr.alive && !seen.has(tr)) cands.push({ o: tr, kind: 'tree', x: tr.x, y: T.hAt(tr.x) - T.treeHeight(tr) * 0.6 });
      for (const line of T.lines || []) for (const p of line.poles) if (!p.fallen && !seen.has(p)) cands.push({ o: p, kind: 'pole', x: p.x, y: T.hAt(p.x) - POLE_H + 6 });
      for (const c of this.crates) if (c.alive && !seen.has(c)) cands.push({ o: c, kind: 'crate', x: c.x, y: c.y - 9 });
      let best = null, bd = C.range;
      for (const c of cands) { const d = dist(c.x, c.y, at.x, at.y); if (d < bd) { bd = d; best = c; } }
      if (!best) break;
      seen.add(best.o);
      this.boltBetween(at, best, 20);
      this.particles.text(best.x, best.y - 20, 'ARC', '#bfe8ff');
      if (best.kind === 'target') this.damage(best.o, dmg, owner);
      else if (best.kind === 'tree') { best.o.alive = false; this.particles.puff(best.x, best.y, [60, 50, 40]); this.particles.explosion(best.x, best.y, 16, 'laser'); }
      else if (best.kind === 'pole') this.blastInfra(best.x, best.y, { dmg: 999, dmgR: 40 });
      else if (owner && !owner.isMob) this.claimCrate(best.o, owner);
      at = { x: best.x, y: best.y };
    }
  },

  // every vehicle carrying a laser shows its drone; lifted while it works
  drawDrones(ctx, aiming) {
    for (const t of this.tanks) {
      if (!t.alive || t.weapon.kind !== 'laser') continue;
      const o = droneOrigin(t);
      if (t === aiming) { // how high it can climb: a faint rail of ticks up to its ceiling
        const top = droneOrigin(t, DRONE_CLEAR + laserCeil(t.weapon)).y;
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let y = droneOrigin(t, DRONE_CLEAR).y; y > top; y -= 12) ctx.fillRect(Math.round(o.x - 1), Math.round(y), 2, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(Math.round(o.x - 7), Math.round(top), 14, 2);
      }
      drawDrone(ctx, t.weapon, o.x, o.y + Math.sin(this.time * 3 + t.x) * 1.5, t.facing, this.time, t.drone ? t.drone.flash || 0 : 0, t.drone && t.drone.busy > 0, t.drone ? t.drone.charge || 0 : 0);
    }
  },
});

// ------------------------------------------------------------------------------------------ art
// Box-built drones, one per laser. Each part is [x, y, w, h, colour] in drone-local units around the
// drone's centre (x mirrored by facing); 'L' marks a lens (glows on firing), 'T' a thruster.
const DRONE_ART = {
  // CLS-T, duct tape everywhere: a grey box with two lenses and a rotor
  lensx2: { beam: '#9ae8ff', parts: [
    [-11, -5, 22, 10, '#6a7078'], [-11, -5, 22, 2, '#8a9098'], [-4, -5, 3, 10, '#d8c8a0'], [5, -5, 3, 10, '#d8c8a0'],
    [-8, 5, 5, 4, 'L'], [3, 5, 5, 4, 'L'], [-1, -9, 2, 4, '#3a3e44'], [-10, -10, 20, 2, 'R']] },
  // Kotona relic: a bronze stepped diamond, three lenses and a glowing glyph
  lensae: { beam: '#ffd88a', parts: [
    [-4, -11, 8, 3, '#8a6a3a'], [-9, -8, 18, 4, '#b08a4a'], [-13, -4, 26, 6, '#c8a058'], [-9, 2, 18, 4, '#b08a4a'], [-4, 6, 8, 3, '#8a6a3a'],
    [-2, -3, 4, 4, '#fff0b0'], [-10, 9, 4, 3, 'L'], [-2, 9, 4, 3, 'L'], [6, 9, 4, 3, 'L']] },
  // LFS Neko Paradise: pink and round, cat ears, three lenses
  lfs75: { beam: '#ff9ad8', parts: [
    [-10, -7, 4, 4, '#f088c0'], [6, -7, 4, 4, '#f088c0'], [-11, -4, 22, 10, '#f8b8d8'], [-11, -4, 22, 2, '#ffd8ec'],
    [-5, -1, 2, 2, '#4a2a3a'], [3, -1, 2, 2, '#4a2a3a'], [-9, 6, 4, 3, 'L'], [-2, 6, 4, 3, 'L'], [5, 6, 4, 3, 'L'], [-1, 2, 2, 1, '#ff6aa8']] },
  // Nadeko Snake: green-and-white coiled segments with a head and three fangs (lenses)
  laser88: { beam: '#9affc0', parts: [
    [-14, -2, 6, 6, '#3a6a4a'], [-8, -6, 6, 6, '#e8fff0'], [-2, -8, 6, 6, '#3a6a4a'], [4, -6, 6, 6, '#e8fff0'], [8, -2, 8, 7, '#3a6a4a'],
    [12, -1, 2, 2, '#ff4a4a'], [-6, 4, 4, 3, 'L'], [0, 5, 4, 3, 'L'], [6, 5, 4, 3, 'L']] },
  // Neko-15X: sleek white, cat ears, little wings, one big pink lens
  laser15x: { beam: '#ffb0f0', parts: [
    [-9, -9, 4, 4, '#ffffff'], [5, -9, 4, 4, '#ffffff'], [-10, -5, 20, 9, '#f4f2fa'], [-10, 2, 20, 2, '#c8c4d8'],
    [-18, -2, 8, 3, '#d8d4e8'], [10, -2, 8, 3, '#d8d4e8'], [-4, 4, 8, 5, 'L'], [-6, -2, 2, 2, '#ff8ad8'], [4, -2, 2, 2, '#ff8ad8']] },
  // Kotona lens on a CLS-T acid tank
  ichor: { beam: '#c8ff6a', parts: [
    [-10, -6, 20, 7, '#9a7a4a'], [-10, -6, 20, 2, '#c8a058'], [-6, 1, 12, 7, '#3c5a34'], [-5, 2, 3, 5, '#8ad84a'],
    [-2, 8, 4, 4, 'L'], [-13, -3, 3, 3, '#6a5030'], [10, -3, 3, 3, '#6a5030']] },
  // NXi INTEL-3 Gatewatch: navy, angular, gold trim, an eye and twin emitters
  nxiintel3: { beam: '#ffd86a', parts: [
    [-14, -4, 28, 8, '#1e2a48'], [-10, -8, 20, 4, '#2a3a60'], [-14, 4, 28, 2, '#d8b048'], [-3, -3, 6, 4, '#8ad8ff'],
    [-12, 6, 4, 4, 'L'], [8, 6, 4, 4, 'L']] },
  // NXi Void Between Stars: a void-dark core between tesla spikes, crackling
  nxivoid: { beam: '#bfe8ff', bolt: true, parts: [
    [-8, -8, 16, 16, '#14102a'], [-6, -6, 12, 12, '#2a2050'], [-2, -2, 4, 4, '#bfe8ff'],
    [-1, -15, 2, 7, '#8a8aa8'], [-1, 8, 2, 7, '#8a8aa8'], [-15, -1, 7, 2, '#8a8aa8'], [8, -1, 7, 2, '#8a8aa8'],
    [-2, -17, 4, 3, 'L'], [-2, 14, 4, 3, 'L'], [-17, -2, 3, 4, 'L'], [14, -2, 3, 4, 'L']] },
  // Kotona Umbress mass driver: a long twin rail with a white band
  massdriver: { beam: '#c8f0ff', parts: [
    [-20, -6, 40, 3, '#8a90a0'], [-20, 3, 40, 3, '#8a90a0'], [-14, -3, 22, 6, '#4a505e'], [-4, -6, 4, 12, '#ffffff'],
    [18, -2, 4, 4, 'L'], [-24, -4, 4, 8, '#5a6070']] },
};

function drawDrone(ctx, w, x, y, facing, time, flash, working, charge = 0) {
  const art = DRONE_ART[w.id] || genericDrone(w);
  const lens = RARITY[w.rarity].color === '#ffffff' ? '#e0e0ff' : RARITY[w.rarity].color;
  // thrusters underneath, brighter while it climbs
  const thr = working ? 0.9 : 0.5;
  ctx.fillStyle = `rgba(160,220,255,${thr * (0.6 + 0.4 * Math.sin(time * 30))})`;
  ctx.fillRect(Math.round(x - 6), Math.round(y + 12), 3, 3 + (working ? 3 : 0));
  ctx.fillRect(Math.round(x + 3), Math.round(y + 12), 3, 3 + (working ? 3 : 0));
  for (const [px, py, pw, ph, col] of art.parts) {
    const lx = facing > 0 ? px : -px - pw;
    if (col === 'R') { // rotor blades flicking
      ctx.fillStyle = '#2a2e34';
      const k = (time * 20 | 0) % 2;
      ctx.fillRect(Math.round(x + lx + (k ? 0 : pw / 2)), Math.round(y + py), Math.round(pw / 2), ph);
      continue;
    }
    if (col === 'L') {
      ctx.fillStyle = flash > 0.05 ? '#ffffff' : lens;
      ctx.fillRect(Math.round(x + lx), Math.round(y + py), pw, ph);
      continue;
    }
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x + lx), Math.round(y + py), pw, ph);
  }
  if (art.bolt) { // the lightning drone crackles between its spikes
    ctx.fillStyle = (time * 12 | 0) % 2 ? '#bfe8ff' : '#ffffff';
    const a = time * 7;
    sq(ctx, x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2);
    sq(ctx, x - Math.cos(a * 1.3) * 10, y + Math.sin(a * 1.3) * 10, 2);
  }
  if (charge > 0) { // powering up, like MAIA: a growing glow under the lens
    const c = hexToRgb((DRONE_ART[w.id] && DRONE_ART[w.id].beam) || lens);
    ctx.fillStyle = rgb(c, 0.25 + 0.35 * charge);
    sq(ctx, x, y + 10, 6 + 18 * charge * (0.85 + 0.15 * Math.sin(time * 40)));
    ctx.fillStyle = `rgba(255,255,255,${0.5 * charge})`;
    sq(ctx, x, y + 10, 4 + 6 * charge);
  }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`; sq(ctx, x, y, 26 * flash); }
}

// any laser without hand-made art: a body in the laser tint with a lens per round
function genericDrone(w) {
  const parts = [[-10, -5, 20, 10, KIND_TINT.laser], [-10, -5, 20, 2, RARITY[w.rarity].color]];
  const n = clamp(w.salvo, 1, 3);
  for (let i = 0; i < n; i++) parts.push([-2 - (n - 1) * 3.5 + i * 7, 5, 4, 3, 'L']);
  return { parts };
}
