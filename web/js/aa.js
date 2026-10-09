'use strict';
// Air defence: passive mounts in their own slot (one for everyone, two for Zuihou), bought in the
// shop like guns but never fired by hand. They are always on. Whenever something comes within a
// mount's `range` of its owner (aimed at her or at anyone near her) it shoots: rockets, carpet
// bomblets, plane bombs and drone bombs as they fly in, and aircraft (planes, drones) while shots
// play out. Rounds burst at the target or at the edge of their range, whichever comes first.
//   role 'missile'  point defence: a good chance (pk) to destroy a missile or bomb outright, and
//                   one that gets through is damaged (its blast cut by `cut`); weak against aircraft
//   role 'air'      anti-aircraft: bursts that hurt planes and drones (dmg, acc), but very little
//                   chance against anything as small and fast as a missile
// Each mount engages each missile once, and gets `perTurn` rounds a turn against aircraft.
// Shooting down a rival's planes pays nothing (drones still pay their bounty).

const AA_WEAPONS = [
  { id: 'aa96', name: 'Sengoku Type 96 25mm Triple Mount', role: 'air', rarity: 1, cost: 900, range: 260, rof: 8, dmg: 18, acc: 0.7, pk: 0.04, perTurn: 4,
    short: 'Three barrels, open sights, a crew that never stops cranking. Every carrier has a dozen.', long: 'Anti-aircraft: chips at planes and drones close by.' },
  { id: 'aabofors', name: "Sengoku 'Hagoita' 40mm Quad Bofors", role: 'air', rarity: 2, cost: 2200, range: 320, rof: 10, dmg: 34, acc: 0.75, pk: 0.05, perTurn: 5,
    short: 'Four Bofors on one mount, from the Hagoita AA refit.', long: 'Anti-aircraft: heavier bursts, a little further out.' },
  { id: 'aegis', name: "LFS 'Aegis' Interceptor Pod", role: 'missile', rarity: 2, cost: 2600, range: 240, rof: 6, pk: 0.35, cut: 0.25, dmg: 10, acc: 0.5, perTurn: 1,
    short: 'Lymilark builds the rockets, so Lymilark knows how to stop them. Little seekers that go for seekers.', long: 'Point defence: a fair chance to kill an incoming rocket or bomb, and dents the ones it misses.' },
  { id: 'aafd94', name: 'Sengoku Type 94 Fire Director + 10cm Twin', role: 'air', rarity: 3, cost: 4800, range: 380, rof: 9, dmg: 60, acc: 0.85, pk: 0.07, perTurn: 6,
    short: 'A rangefinder that computes the lead, and a twin high-angle mount that listens to it.', long: 'Anti-aircraft: accurate, far-reaching, six bursts a turn.' },
  { id: 'ciws', name: "NXi SEC-11 'Bulkhead' CIWS", role: 'missile', rarity: 3, cost: 5400, range: 260, rof: 3, pk: 0.5, cut: 0.35, dmg: 14, acc: 0.5, perTurn: 2,
    short: 'A radar-laid gatling. Triple-verified, it says on the drum.', long: 'Point defence: an even chance against every rocket, bomblet or bomb that comes in.' },
  { id: 'aarocket', name: 'Sengoku 12cm 30-tube AA Rocket Launcher Kai Ni', role: 'air', rarity: 4, cost: 10000, range: 440, rof: 16, dmg: 110, acc: 0.8, pk: 0.1, perTurn: 4, splash: 60,
    short: 'Thirty rockets in a barrage, filling the sky with fire. Squadrons hate it.', long: 'Anti-aircraft: each burst hits every aircraft within 60 of it.' },
  { id: 'kotonapd', name: 'Kotona Lensed Point-Defence Laser', role: 'missile', rarity: 5, cost: 18000, range: 300, rof: 4, pk: 0.7, cut: 0.5, dmg: 30, acc: 0.8, perTurn: 3, laser: true,
    short: 'A Kotona lens that tracks at the speed of light. Missiles simply stop arriving.', long: 'Point defence: a beam, not a round. Most missiles never land.' },
  { id: 'akizukikai', name: "Sengoku 'Akizuki Kai' AA Battery", role: 'air', rarity: 6, cost: 26000, range: 460, rof: 7, dmg: 160, acc: 0.9, pk: 0.12, perTurn: 8,
    short: 'The finest anti-air battery Sengoku ever built, now with a fire director of its own.', long: 'Anti-aircraft: tears squadrons apart, eight bursts a turn.' },
  { id: 'gatewatch', name: "NXi 'Gatewatch' Aegis Net", role: 'missile', rarity: 6, cost: 28000, range: 340, rof: 3, pk: 0.8, cut: 0.6, dmg: 30, acc: 0.6, perTurn: 3,
    short: 'What guards the gate. Nothing gets through without a vote, and nobody votes yes.', long: 'Point defence: the best there is.' },
];
const AA_BY_ID = Object.fromEntries(AA_WEAPONS.map((a) => [a.id, a]));
function aaMaker(a) { return a.name.startsWith('NXi') ? 'NXi' : a.name.startsWith('LFS') ? 'Lymilark' : a.name.startsWith('Kotona') ? 'Kotona' : 'Sengoku Inc.'; }
const AA_ROUND_SPEED = { air: 26, missile: 60 }; // world units a frame (point defence is near enough hitscan)
const VTOL_MULT = 0.7; // planes launched straight up (no flight deck) hit this much as hard

// how many mounts she can carry
function aaSlots(t) { return hasTrait(t, 'twinaa') ? 2 : 1; }
// things in flight a mount can shoot at: missiles and bombs (shells and beams are too fast or too small)
function aaInterceptable(p) {
  const w = p.w;
  return !!w && (w.kind === 'rocket' || w.bomblet || w.ord || w.id === 'mobbomb' || w.id === 'shipbomb');
}
function aaKill(A, p) { // a mount's chance to destroy a missile or bomb
  return A.pk * (p.w.jet ? 0.5 : 1) * (p.w.ord ? 0.8 : 1);
}

Object.assign(Game.prototype, {
  // every mount's rounds against aircraft come back each turn
  aaNewTurn() {
    for (const t of this.tanks) t.aaGuns = (t.aa || []).map((id) => ({ cd: 0, budget: id ? AA_BY_ID[id].perTurn : 0 }));
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
        // a missile or bomb coming in (not one going away), nearest first
        let best = null, bd = A.range;
        for (const p of shots) {
          if (p.owner === t || (p.aaSeen && p.aaSeen.has(key))) continue;
          const d = dist(p.x, p.y, c.x, c.y);
          if (d >= bd) continue;
          if ((p.x - c.x) * p.vx + (p.y - c.y) * p.vy > 0 && d > 60) continue; // going away
          bd = d; best = p;
        }
        if (best) {
          (best.aaSeen || (best.aaSeen = new Set())).add(key);
          this.aaFire(t, A, best, 'shot');
          gun.cd = A.rof;
          return;
        }
        if (gun.budget <= 0) return;
        // aircraft: a rival's planes, and drones
        let air = null; bd = A.range;
        for (const e of this.aaAircraft(t)) {
          const q = e.center(), d = dist(q.x, q.y, c.x, c.y);
          if (d < bd) { bd = d; air = e; }
        }
        if (!air) return;
        gun.budget--;
        gun.cd = A.rof;
        this.aaFire(t, A, air, 'air');
      });
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
    // the burst: a dark flak puff, or point defence's sparks
    for (let i = 0; i < (A.role === 'air' ? 6 : 4); i++) {
      this.particles.add({ x: r.x + (Math.random() - 0.5) * 10, y: r.y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, g: 0, drag: 0.92, life: 0.5 + Math.random() * 0.4,
        size: A.role === 'air' ? 6 + Math.random() * 6 : 3 + Math.random() * 3, color: A.role === 'air' ? [52, 50, 56] : [255, 230, 150] });
    }
    if (r.kind === 'shot') {
      if (tg.dead || !this.projectiles.includes(tg) || dist(tg.x, tg.y, r.x, r.y) > 30 + Math.hypot(tg.vx, tg.vy) * 2) return; // gone, or out of reach
      if (rng.next() < aaKill(A, tg)) {
        tg.dead = true;
        this.particles.explosion(tg.x, tg.y, 26, 'shell');
        this.particles.text(tg.x, tg.y - 20, 'INTERCEPTED', A.role === 'missile' ? '#9ae0ff' : '#e8d8a0');
        this.sfx.explosion(10);
        if (this.report) this.report.intercepts = (this.report.intercepts || 0) + 1;
      } else if (A.cut) tg.aaCut = (tg.aaCut || 1) * (1 - A.cut); // it gets through, damaged
      return;
    }
    // aircraft
    const hits = A.splash ? this.aaAircraft(r.owner).filter((e) => { const q = e.center(); return dist(q.x, q.y, r.x, r.y) < A.splash; }) : [tg];
    for (const e of hits) {
      if (!e.alive) continue;
      const q = e.center();
      if (dist(q.x, q.y, r.x, r.y) > (A.splash || 40) + (e.hw || 12)) continue;
      if (rng.next() > A.acc) continue;
      this.damage(e, A.dmg, r.owner, { aa: true });
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
