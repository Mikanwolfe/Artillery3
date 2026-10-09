'use strict';
// Air defence: passive mounts in their own slot (one for everyone, two for Zuihou), bought in the
// shop like guns but never fired by hand. They are always on. Whenever something comes within a
// mount's `range` of its owner (aimed at her or at anyone near her) it shoots: rockets, carpet
// bomblets, plane bombs and drone bombs as they fly in, and aircraft (planes, drones) while shots
// play out. Rounds burst at the target or at the edge of their range, whichever comes first.
//   role 'missile'  point defence: every missile or bomb that comes within range is engaged, and
//                   each engagement takes about `stop` of its damage off, more or less (half to one
//                   and a half times), less for a tough one (aaTough: heavy warheads); one left with
//                   little is shot down outright, so light rockets mostly never land while a big
//                   one gets through, damaged. Weak against aircraft
//   role 'air'      anti-aircraft: bursts that hurt planes and drones (dmg, acc), but very little
//                   chance against anything as small and fast as a missile
// Each mount engages each missile once, and gets `perTurn` rounds a turn against aircraft.
// Shooting down a rival's planes pays nothing (drones still pay their bounty).

const AA_WEAPONS = [
  { id: 'aa96', name: 'SI Type 96 25mm Triple Mount', role: 'air', rarity: 1, cost: 900, range: 260, rof: 8, dmg: 18, acc: 0.7, pk: 0.04, perTurn: 4,
    short: 'Three barrels, open sights, a crew that never stops cranking. Every carrier has a dozen.', long: 'Anti-aircraft: chips at planes and drones close by.' },
  { id: 'aabofors', name: "SI 'Hagoita' 40mm Quad Bofors", role: 'air', rarity: 2, cost: 2200, range: 320, rof: 10, dmg: 34, acc: 0.75, pk: 0.05, perTurn: 5,
    short: 'Four Bofors on one mount, from the Hagoita AA refit.', long: 'Anti-aircraft: heavier bursts, a little further out.' },
  { id: 'aegis', name: "LFS 'Aegis' Interceptor Pod", role: 'missile', rarity: 2, cost: 2600, range: 240, rof: 6, pk: 0.35, cut: 0.25, dmg: 10, acc: 0.5, perTurn: 1,
    short: 'Lymilark builds the rockets, so Lymilark knows how to stop them. Little seekers that go for seekers.', long: 'Point defence: a fair chance to kill an incoming rocket or bomb, and dents the ones it misses.' },
  { id: 'aafd94', name: 'SI Type 94 Fire Director + 10cm Twin', role: 'air', rarity: 3, cost: 4800, range: 380, rof: 9, dmg: 60, acc: 0.85, pk: 0.07, perTurn: 6,
    short: 'A rangefinder that computes the lead, and a twin high-angle mount that listens to it.', long: 'Anti-aircraft: accurate, far-reaching, six bursts a turn.' },
  { id: 'ciws', name: "NXi SEC-11 'Bulkhead' CIWS", role: 'missile', rarity: 3, cost: 5400, range: 260, rof: 3, pk: 0.5, cut: 0.35, dmg: 14, acc: 0.5, perTurn: 2,
    short: 'A radar-laid gatling. Triple-verified, it says on the drum.', long: 'Point defence: an even chance against every rocket, bomblet or bomb that comes in.' },
  { id: 'aarocket', name: 'SI 12cm 30-tube AA Rocket Launcher Kai Ni', role: 'air', rarity: 4, cost: 10000, range: 440, rof: 16, dmg: 110, acc: 0.8, pk: 0.1, perTurn: 4, splash: 60,
    short: 'Thirty rockets in a barrage, filling the sky with fire. Squadrons hate it.', long: 'Anti-aircraft: each burst hits every aircraft within 60 of it.' },
  { id: 'kotonapd', name: 'Kotona Lensed Point-Defence Laser', role: 'missile', rarity: 5, cost: 18000, range: 300, rof: 4, pk: 0.7, cut: 0.5, dmg: 30, acc: 0.8, perTurn: 3, laser: true,
    short: 'A Kotona lens that tracks at the speed of light. Missiles simply stop arriving.', long: 'Point defence: a beam, not a round. Most missiles never land.' },
  { id: 'akizukikai', name: "SI 'Akizuki Kai' AA Battery", role: 'air', rarity: 6, cost: 26000, range: 460, rof: 7, dmg: 160, acc: 0.9, pk: 0.12, perTurn: 8,
    short: 'The finest anti-air battery Sengoku ever built, now with a fire director of its own.', long: 'Anti-aircraft: tears squadrons apart, eight bursts a turn.' },
  { id: 'gatewatch', name: "NXi 'Gatewatch' Aegis Net", role: 'missile', rarity: 6, cost: 28000, range: 340, rof: 3, pk: 0.8, cut: 0.6, dmg: 30, acc: 0.6, perTurn: 3,
    short: 'What guards the gate. Nothing gets through without a vote, and nobody votes yes.', long: 'Point defence: the best there is.' },
];
// every girl comes with a mount of her own (starter: not sold in the shop, worth nothing back, and
// swapped out by the first one she buys into its slot), from weakest to best: Ikaros, Innocentia,
// Alban Eiler, G.W. Tiger, Object 15X, then Zuihou (the shop's Type 96, and a second slot) and
// November (two of her own: the Defensive Suite)
const AA_STARTERS = [
  { id: 'aa_ang', name: "'Feather' Halo Ward", role: 'air', rarity: 1, cost: 0, starter: true, range: 200, rof: 10, dmg: 10, acc: 0.55, pk: 0.02, perTurn: 2,
    short: 'The halo flicks feathers at anything that flies too close to her. It isn’t really for fighting.', long: 'Anti-aircraft, barely: Ikaros’s own.' },
  { id: 'aa_int', name: 'Kati-S Coaxial Flak', role: 'air', rarity: 1, cost: 0, starter: true, range: 220, rof: 9, dmg: 14, acc: 0.6, pk: 0.03, perTurn: 3,
    short: 'A small flak gun slaved to the twin barrels. It points where they point, roughly.', long: 'Anti-aircraft: Innocentia’s own.' },
  { id: 'aa_alb', name: "LFS 'Buckler' Micro-Interceptor", role: 'missile', rarity: 1, cost: 0, starter: true, range: 210, rof: 6, pk: 0.2, cut: 0.15, dmg: 8, acc: 0.5, perTurn: 1,
    short: 'A pocket Aegis: two tiny seekers that go for seekers.', long: 'Point defence: Alban Eiler’s own.' },
  { id: 'aa_gwt', name: 'G.W. 20mm Flakvierling', role: 'air', rarity: 1, cost: 0, starter: true, range: 250, rof: 8, dmg: 18, acc: 0.65, pk: 0.04, perTurn: 4,
    short: 'Four 20mm barrels on the autoloader’s roof. Field-tested, of course.', long: 'Anti-aircraft: G.W. Tiger’s own.' },
  { id: 'aa_obj', name: "KTS-T 'Shtora' Active Protection", role: 'missile', rarity: 1, cost: 0, starter: true, range: 230, rof: 5, pk: 0.3, cut: 0.2, dmg: 10, acc: 0.5, perTurn: 1,
    short: 'Dazzlers and a ring of shot charges round the turret: what comes in at her mostly doesn’t arrive whole.', long: 'Point defence: Object 15X’s own.' },
  { id: 'aa_nxi1', name: "NXi Mk.0 'Bulkhead' Point Defence", role: 'missile', rarity: 1, cost: 0, starter: true, range: 240, rof: 4, pk: 0.35, cut: 0.25, dmg: 12, acc: 0.5, perTurn: 2,
    short: 'Half of the Defensive Suite: a radar-laid gatling, triple-verified.', long: 'Point defence: November’s own.' },
  { id: 'aa_nxi2', name: 'NXi Mk.0 Flak Mount', role: 'air', rarity: 1, cost: 0, starter: true, range: 340, rof: 7, dmg: 32, acc: 0.8, pk: 0.04, perTurn: 6,
    short: 'The other half of the Defensive Suite: proximity flak, twin-mounted, never jams.', long: 'Anti-aircraft: November’s own.' },
];
const AA_BY_ID = Object.fromEntries(AA_WEAPONS.concat(AA_STARTERS).map((a) => [a.id, a]));
// what share of a missile's damage each engagement takes off: point defence a lot, anti-air guns a
// little (their pk). Two mounts multiply: 50% and 60% leave 20%.
const PD_STOP = { aegis: 0.5, ciws: 0.6, kotonapd: 0.75, gatewatch: 0.85, aa_alb: 0.35, aa_obj: 0.45, aa_nxi1: 0.5 };
for (const a of Object.values(AA_BY_ID)) a.stop = PD_STOP[a.id] || Math.min(0.2, a.pk * 1.5);
const AA_SHOT_DOWN = 0.2; // a missile left with this little of its damage is shot down in the air
const DRONE_ZAP_EVERY = 15; // frames between a hostile's discharges (see stepAA)
const AA_GRAZE = 0.25; // an anti-air burst that misses still grazes for this much
function aaMaker(a) { return a.name.startsWith('NXi') ? 'NXi' : a.name.startsWith('LFS') ? 'Lymilark' : a.name.startsWith('Kotona') ? 'Kotona' : 'Sengoku Inc.'; }
const AA_ROUND_SPEED = { air: 26, missile: 60 }; // world units a frame (point defence is near enough hitscan)
const VTOL_MULT = 0.7; // planes launched straight up (no flight deck) hit this much as hard

// how many mounts she can carry
function aaSlots(t) { return hasTrait(t, 'twinaa') || hasTrait(t, 'defsuite') ? 2 : 1; }
// roughly what a mount is worth a turn, to compare like with unlike
function aaPower(A) { return A.role === 'air' ? A.dmg * A.acc * A.perTurn * (A.splash ? 1.5 : 1) : A.stop * 100 + A.range * 0.05; }
// where a mount she buys goes: a free slot, else the slot her own starter mount sits in
// (a starter of the same role first)
function aaSlotFor(t, role) {
  const i = t.aa.indexOf(null);
  if (i >= 0) return i;
  const same = t.aa.findIndex((id) => aaOwn(t, id) && AA_BY_ID[id].role === role);
  return same >= 0 ? same : t.aa.findIndex((id) => aaOwn(t, id));
}
// a mount she came with (a starter, or Zuihou's Type 96): a bought one replaces it, and it sells for scrap
function aaOwn(t, id) { return !!AA_BY_ID[id] && (AA_BY_ID[id].starter || (t.vehicle.aa || []).includes(id)); }
// things in flight a mount can shoot at: missiles and bombs (shells and beams are too fast or too small)
function aaInterceptable(p) {
  const w = p.w;
  return !!w && (w.kind === 'rocket' || w.bomblet || w.ord || w.id === 'mobbomb' || w.id === 'shipbomb');
}
// how each mount looks on her back (girl units, before her scale): flak guns as a row of barrels,
// rocket launchers as a box of tubes, point defence as a gatling under a radome, a pod, or a lens
const AA_LOOK = {
  aa_ang: { k: 'wing' }, aa_int: { k: 'guns', n: 1, len: 14, w: 2 }, aa_alb: { k: 'pod', n: 2 }, aa_gwt: { k: 'guns', n: 4, len: 12, w: 2 },
  aa_obj: { k: 'pod', n: 4, flat: true }, aa_nxi1: { k: 'dome' }, aa_nxi2: { k: 'guns', n: 2, len: 18, w: 3 },
  aa96: { k: 'guns', n: 3, len: 16, w: 2 }, aabofors: { k: 'guns', n: 4, len: 18, w: 2 }, aegis: { k: 'pod', n: 3 },
  aafd94: { k: 'guns', n: 2, len: 22, w: 3, director: true }, ciws: { k: 'dome' }, aarocket: { k: 'rockets' },
  kotonapd: { k: 'lens' }, akizukikai: { k: 'guns', n: 2, len: 24, w: 4, shield: true, director: true }, gatewatch: { k: 'dome', big: true },
};
const AA_METAL = 'rgb(112,118,128)', AA_DARK = 'rgb(46,48,56)';

// her mounts, drawn behind her shoulder (slot 0) and lower on her back (slot 1), barrels on what
// they last fired at; each kicks back when it fires
function drawAAMounts(ctx, t, px, py, f) {
  if (!t.aa) return;
  t.aa.forEach((id, i) => {
    const L = AA_LOOK[id];
    if (!L) return;
    const bx = px - f * (12 + i * 11), by = py - 5 + i * 9;
    const aim = t.aaAim && t.aaAim[i] !== undefined ? t.aaAim[i] : (f > 0 ? -1.1 : Math.PI + 1.1); // (up and ahead, idle)
    const kick = (t.aaKick && t.aaKick[i]) || 0;
    ctx.fillStyle = AA_DARK; ctx.fillRect(Math.round(bx - 5), Math.round(by - 1), 10, 5); // its base
    ctx.save();
    ctx.translate(Math.round(bx), Math.round(by - 1));
    if (L.k === 'wing') { // Ikaros's halo ward: a little white wing
      ctx.fillStyle = 'rgb(240,240,248)';
      for (let k = 0; k < 4; k++) ctx.fillRect(-f * (2 + k * 2) - 1, -4 - k * 2 + Math.round(Math.sin((t.blink || 0) * 3) * 1), 3, 3 + k);
      ctx.restore(); return;
    }
    if (L.k === 'lens') { ctx.fillStyle = AA_METAL; ctx.fillRect(-4, -7, 8, 7); ctx.fillStyle = 'rgb(160,230,255)'; ctx.fillRect(-2, -5, 4, 3); ctx.restore(); return; }
    if (L.k === 'dome') { // a radome over a gatling
      const s = L.big ? 1.3 : 1;
      ctx.fillStyle = 'rgb(214,218,224)'; ctx.fillRect(Math.round(-4 * s), Math.round(-10 * s), Math.round(8 * s), Math.round(6 * s)); ctx.fillRect(Math.round(-3 * s), Math.round(-12 * s), Math.round(6 * s), 2);
      ctx.fillStyle = AA_METAL; ctx.fillRect(-4, -4, 8, 4);
    }
    ctx.rotate(aim);
    if (L.k === 'dome') { ctx.fillStyle = AA_DARK; ctx.fillRect(2 - kick * 2, -1, 9, 3); }
    else if (L.k === 'pod' || L.k === 'rockets') { // a box of tubes
      const n = L.k === 'rockets' ? 5 : L.n, h = L.flat ? 2 : 3;
      ctx.fillStyle = AA_METAL; ctx.fillRect(-2 - kick, -Math.ceil(n * h / 2) - 1, L.k === 'rockets' ? 14 : 9, n * h + 2);
      ctx.fillStyle = AA_DARK; for (let k = 0; k < n; k++) ctx.fillRect((L.k === 'rockets' ? 11 : 6) - kick, -Math.ceil(n * h / 2) + k * h, 2, h - 1);
    } else { // flak: barrels side by side along the aim
      const gap = L.w + 1;
      ctx.fillStyle = AA_METAL; ctx.fillRect(-3, -Math.ceil(L.n * gap / 2) - 1, 7, L.n * gap + 2); // the cradle
      ctx.fillStyle = AA_DARK;
      for (let k = 0; k < L.n; k++) ctx.fillRect(2 - kick * 3, -Math.ceil(L.n * gap / 2) + k * gap, L.len, L.w);
      if (L.shield) { ctx.fillStyle = AA_METAL; ctx.fillRect(-1, -Math.ceil(L.n * gap / 2) - 3, 3, L.n * gap + 6); }
    }
    ctx.restore();
    if (L.director) { ctx.fillStyle = AA_METAL; ctx.fillRect(Math.round(bx - f * 6 - 2), Math.round(by - 7), 5, 4); ctx.fillStyle = 'rgb(160,230,255)'; ctx.fillRect(Math.round(bx - f * 6 - 1), Math.round(by - 6), 2, 1); } // (its rangefinder)
  });
}

function aaKill(A, p) { // a mount's chance to destroy a missile or bomb
  return Math.min(0.95, A.stop * (0.5 + rng.next()) * (p.w.jet ? 0.7 : 1) / aaTough(p.w)); // (a jet's bombs come in faster)
}
// how hard a missile or bomb is to stop: by the weight of its warhead (a 100-damage rocket is 1)
function aaTough(w) {
  return w.tough || clamp(Math.sqrt((w.dmg || 100) / 100), 0.4, 4);
}

Object.assign(Game.prototype, {
  // every mount's rounds against aircraft come back each turn
  aaNewTurn() {
    for (const t of this.tanks) t.aaGuns = (t.aa || []).map((id) => ({ cd: 0, budget: id ? AA_BY_ID[id].perTurn : 0 }));
    for (const m of this.mobs || []) if (m.aaMount) m.aaGun = { cd: 0, budget: m.aaMount.perTurn };
  },

  // each frame while shots play out: mounts pick something in range and shoot
  stepAA() {
    if (this.phase === 'aim' || this.phase === 'menu' || !this.tanks) return;
    const shots = this.projectiles.filter((p) => p instanceof Projectile && !p.dead && aaInterceptable(p));
    for (const t of this.tanks) {
      if (!t.alive || !t.aa || !t.aa.some(Boolean)) continue;
      if (!t.aaGuns || t.aaGuns.length !== t.aa.length) t.aaGuns = t.aa.map((id) => ({ cd: 0, budget: id ? AA_BY_ID[id].perTurn : 0 }));
      const c = t.center();
      t.aa.forEach((id, i) => {
        const A = AA_BY_ID[id], gun = t.aaGuns[i];
        if (!A || gun.cd-- > 0) return;
        const key = t.idx * 4 + i;
        // every missile or bomb within range, once each (all of them: point defence never runs dry)
        let fired = false;
        for (const p of shots) {
          if (p.owner === t || (p.aaSeen && p.aaSeen.has(key)) || dist(p.x, p.y, c.x, c.y) >= A.range) continue;
          (p.aaSeen || (p.aaSeen = new Set())).add(key);
          this.aaFire(t, A, p, 'shot');
          fired = true;
        }
        if (fired) { gun.cd = 2; return; }
        if (gun.budget <= 0) return;
        // aircraft: a rival's planes, and drones
        // (focus fire: the one in range with the least left, so a squad loses planes, not paint)
        let air = null, bs = Infinity;
        for (const e of this.aaAircraft(t)) {
          const q = e.center(), d = dist(q.x, q.y, c.x, c.y);
          if (d >= A.range) continue;
          const sc = (e.hp || 0) + (e.armour || 0) + d * 0.05;
          if (sc < bs) { bs = sc; air = e; }
        }
        if (!air) return;
        gun.budget--;
        gun.cd = A.rof;
        this.aaFire(t, A, air, 'air');
      });
    }
    // the hostiles' air defence: an AA tank's flak at the players' planes, and every flying
    // hostile's static discharge field, which zaps any plane that comes close
    for (const m of this.mobs || []) {
      if (!m.alive) continue;
      if (m.aaMount) {
        const A = m.aaMount, gun = m.aaGun || (m.aaGun = { cd: 0, budget: A.perTurn });
        if (gun.cd-- <= 0 && gun.budget > 0) {
          const c = m.center();
          let air = null, bs = Infinity;
          for (const p of this.planes || []) {
            if (!p.targetable) continue;
            const q = p.center(), d = dist(q.x, q.y, c.x, c.y);
            if (d >= A.range) continue;
            const sc = p.hp + p.armour + d * 0.05;
            if (sc < bs) { bs = sc; air = p; }
          }
          if (air) { gun.budget--; gun.cd = A.rof; this.aaFire(m, A, air, 'air'); }
        }
      }
      if (m.flying && this.planes && this.planes.length && (m.zap = (m.zap || 0) + 1) % DRONE_ZAP_EVERY === 0) {
        const c = m.center(), R = DRONE_FIELD + m.hw;
        for (const p of this.planes) {
          if (!p.targetable) continue;
          const q = p.center();
          if (dist(q.x, q.y, c.x, c.y) > R) continue;
          this.lasers.push(new Laser(c.x + (Math.random() - 0.5) * m.hw, c.y, q.x, q.y, '#9ae0ff', 1, 6));
          this.damage(p, DRONE_FIELD_DMG + m.stage, null, { aa: true, field: true });
        }
      }
    }
  },

  aaAircraft(t) {
    const out = [];
    for (const p of this.planes || []) if (p.alive && p.owner !== t && p.targetable) out.push(p);
    for (const m of this.mobs || []) if (m.alive && m.flying) out.push(m);
    return out;
  },

  // a round on its way: it bursts where the target will be, or at the end of its range
  aaFire(t, A, target, kind) {
    const c = t.center(), from = { x: c.x, y: c.y - 14 };
    const q = target.center ? target.center() : { x: target.x, y: target.y };
    const slot = t.isMob ? -1 : t.aa.indexOf(A.id); // (its barrels swing onto it, and kick)
    if (t.isMob) { t.aaAng = Math.atan2(q.y - from.y, q.x - from.x); t.aaKick = 1; }
    if (slot >= 0) { (t.aaAim || (t.aaAim = []))[slot] = Math.atan2(q.y - from.y, q.x - from.x); (t.aaKick || (t.aaKick = []))[slot] = 1; }
    const speed = AA_ROUND_SPEED[A.role];
    let k = Math.max(1, Math.round(dist(q.x, q.y, from.x, from.y) / speed));
    let tx = q.x + (target.vx || 0) * k, ty = q.y + (target.vy || 0) * k; // lead it
    const d = dist(tx, ty, from.x, from.y);
    if (d > A.range) { tx = from.x + (tx - from.x) * A.range / d; ty = from.y + (ty - from.y) * A.range / d; k = Math.max(1, Math.round(A.range / speed)); }
    if (A.laser) k = 1;
    (this.aaRounds || (this.aaRounds = [])).push({ x: from.x, y: from.y, x0: from.x, y0: from.y, tx, ty, k, k0: k, target, kind, A, owner: t });
    if (A.laser) this.lasers.push(new Laser(from.x, from.y, tx, ty, '#bff0ff', 2, 8));
    if (Math.random() < 0.5) this.sfx.click();
  },

  updateAA() {
    if (!this.aaRounds || !this.aaRounds.length) return;
    for (const r of this.aaRounds) {
      r.k--;
      const u = 1 - r.k / r.k0;
      r.x = lerp(r.x0, r.tx, u);
      r.y = lerp(r.y0, r.ty, u);
      if (r.k > 0) continue;
      this.aaBurst(r);
    }
    this.aaRounds = this.aaRounds.filter((r) => r.k > 0);
  },

  aaBurst(r) {
    const A = r.A, tg = r.target;
    // the burst: point defence's sparks, or flak: a flash, fragments flung out and a black puff
    // that hangs in the sky (bigger for heavier mounts)
    if (A.role === 'air') this.flakBurst(r.x, r.y, clamp(Math.sqrt(A.dmg / 20), 0.8, 2.6), (A.splash || 0) > 0);
    else for (let i = 0; i < 4; i++) {
      this.particles.add({ x: r.x + (Math.random() - 0.5) * 10, y: r.y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, g: 0, drag: 0.92, life: 0.5 + Math.random() * 0.4,
        size: 3 + Math.random() * 3, color: [255, 230, 150] });
    }
    if (r.kind === 'shot') {
      if (tg.dead || !this.projectiles.includes(tg)) return; // gone (point defence doesn't miss: see the top)
      const was = tg.aaCut || 1;
      tg.aaCut = was * (1 - aaKill(A, tg)); // (the hit takes its share of the damage off)
      const off = (tg.w.dmg || 0) * (was - tg.aaCut); // (what it took off the warhead, shown like any hit)
      if (off >= 1) this.hitPopup(tg.x, tg.y - 20, off, { q: clamp(1 - tg.aaCut, 0, 1), alt: 0, kin: 0, front: 1, pd: true });
      tg.aaHit = true; // (it trails smoke from here)
      if (tg.aaCut <= AA_SHOT_DOWN) { // little left of it: down it goes
        tg.dead = true;
        this.particles.explosion(tg.x, tg.y, 26, 'shell');
        this.particles.text(tg.x, tg.y - 20, 'INTERCEPTED', A.role === 'missile' ? '#9ae0ff' : '#e8d8a0');
        this.sfx.explosion(10);
        if (this.report) this.report.intercepts = (this.report.intercepts || 0) + 1;
        if (this.range && this.range.drill) { this.range.stopped++; this.ui.codexReadout(); }
      }
      return;
    }
    // aircraft
    const hits = A.splash ? this.aaAircraft(r.owner).filter((e) => { const q = e.center(); return dist(q.x, q.y, r.x, r.y) < A.splash; }) : [tg];
    for (const e of hits) {
      if (!e.alive) continue;
      const q = e.center();
      if (dist(q.x, q.y, r.x, r.y) > (A.splash || 40) + (e.hw || 12)) continue;
      this.damage(e, A.dmg * (rng.next() > A.acc ? AA_GRAZE : 1), r.owner, { aa: true }); // (a miss still grazes)
    }
  },

  // a flak shell bursting: s scales it (a 25mm pop to a 10cm crack), wide for a rocket barrage
  flakBurst(x, y, s, wide) {
    const P = this.particles, n = Math.round(6 + 5 * s);
    P.add({ x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.12, size: 10 * s, color: [255, 236, 170] }); // the flash
    for (let i = 0; i < n; i++) { // fragments
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 3) * (0.7 + 0.3 * s) * (wide ? 1.5 : 1);
      P.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.12, drag: 0.9, life: 0.25 + Math.random() * 0.25, size: 2, color: i % 3 ? [255, 190, 90] : [255, 250, 220] });
    }
    for (let i = 0; i < 3 + Math.round(s * 2); i++) { // and the black puff, drifting
      P.add({ x: x + (Math.random() - 0.5) * 8 * s, y: y + (Math.random() - 0.5) * 8 * s, vx: (Math.random() - 0.5) * 0.6, vy: -0.1 - Math.random() * 0.2, g: 0, drag: 0.97, life: 1.1 + Math.random() * 0.8,
        size: (6 + Math.random() * 6) * s, color: i % 2 ? [40, 38, 44] : [62, 60, 66] });
    }
  },

  drawAA(ctx) {
    if (!this.aaRounds) return;
    for (const r of this.aaRounds) {
      if (r.A.laser) continue;
      const dx = (r.tx - r.x0) / r.k0, dy = (r.ty - r.y0) / r.k0;
      ctx.fillStyle = r.A.role === 'air' ? 'rgba(255,220,120,0.9)' : 'rgba(255,120,90,0.9)';
      for (let i = 0; i < 3; i++) sq(ctx, r.x - dx * i * 0.4, r.y - dy * i * 0.4, 3 - i * 0.6);
    }
  },
});
