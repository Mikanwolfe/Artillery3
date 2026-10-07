'use strict';
// CPU players.
//   - Solver: brute-force search over (elevation, power) using the real physics.
//   - CpuController: drives a tank through virtual key presses (the same Ctl a human uses).
// Banter lives in taunts.js; the game decides when to use it.

const AI_NAMES = ['Hatsuyuki', 'Kotona', 'Nadeko', 'Natsuki', 'Shigure', 'Neko-15X'];

// Virtual controller state. Humans fill it from the keyboard, CPUs from code.
class Ctl {
  constructor() { this.reset(); }
  reset() { this.left = this.right = this.up = this.down = this.charge = this.fine = false; }
}

const DIFFICULTY = {
  easy: { se: 4.5, sp: 9 },
  normal: { se: 2.2, sp: 4.5 },
  hard: { se: 0.8, sp: 1.6 },
};

// Find the (elevation, power) that lands closest to `target` with weapon `w`.
function solveShot(game, tank, w, target) {
  const facing = target.x >= tank.x ? 1 : -1;
  const tc = target.center();
  const evalShot = (elev, power) => {
    const m = tank.muzzle(elev, facing);
    const v = power * SPEED_PER_POWER * w.speed;
    const a = rad(elev);
    const r = simulateShot(game.terrain, game.wind, w, game.tanks, tank, m.x, m.y, facing * v * Math.cos(a), -v * Math.sin(a));
    let err;
    if (w.kind === 'marker') err = Math.max(0, Math.abs(r.x - target.x) - 6);
    else if (r.hit === 'tank' && r.tank === target) err = 0;
    else err = Math.max(0, dist(r.x, r.y, tc.x, tc.y) - (w.dmgR || w.sub?.dmgR || 30) * 0.35);
    if (r.hit === 'out') err += 400;
    const selfD = w.kind === 'marker' ? Math.abs(r.x - tank.x) + 40 : dist(r.x, r.y, tank.x, tank.y - 7);
    if (selfD < (w.dmgR || 30) + 12 && !(r.tank === target)) err += 150;
    return err;
  };
  let best = { err: Infinity, elev: 45, power: 50, facing };
  const lo = Math.max(w.elevMin, -10);
  for (let e = lo; e <= w.elevMax; e += 3) {
    for (let p = 10; p <= 100; p += 3) {
      const err = evalShot(e, p);
      if (err < best.err) best = { err, elev: e, power: p, facing };
    }
  }
  const e0 = best.elev;
  const p0 = best.power;
  for (let e = e0 - 3; e <= e0 + 3; e += 0.5) {
    if (e < w.elevMin || e > w.elevMax) continue;
    for (let p = p0 - 4; p <= p0 + 4; p += 0.5) {
      if (p < 8 || p > 100) continue;
      const err = evalShot(e, p);
      if (err < best.err) best = { err, elev: e, power: p, facing };
    }
  }
  // fine pass: matters for small-blast weapons like the coilgun
  const e1 = best.elev;
  const p1 = best.power;
  for (let e = e1 - 0.6; e <= e1 + 0.6; e += 0.1) {
    if (e < w.elevMin || e > w.elevMax) continue;
    for (let p = p1 - 1; p <= p1 + 1; p += 0.2) {
      if (p < 8 || p > 100) continue;
      const err = evalShot(e, p);
      if (err < best.err) best = { err, elev: e, power: p, facing };
    }
  }
  return best;
}

class CpuController {
  constructor(game, tank) {
    this.game = game;
    this.tank = tank;
    this.ctl = new Ctl();
    this.state = 'think';
    this.timer = 0.7 + Math.random() * 0.5;
    this.plan = null;
    this.moved = false;
    this.moveFrames = 0;
  }

  // choose weapon+target and solve
  makePlan() {
    const g = this.game;
    const t = this.tank;
    const cands = g.tanks.filter((x) => x.alive && x !== t);
    const owned = t.ownedWeapons();
    let weapon;
    if (t.type === 'easy') weapon = rng.chance(0.7) ? WEAPON_BY_ID.howitzer : rng.pick(owned);
    else if (t.type === 'normal') weapon = rng.chance(0.5) ? rng.pick(owned) : owned.slice().sort((a, b) => weaponValue(b) - weaponValue(a))[0];
    else weapon = owned.slice().sort((a, b) => weaponValue(b) - weaponValue(a))[rng.chance(0.25) ? 1 : 0] || owned[0];
    let best = null;
    for (const e of cands) {
      const s = solveShot(g, t, weapon, e);
      const score = s.err - (e.maxHp - e.hp) * 0.25;
      if (!best || score < best.score) best = { ...s, score, target: e, weapon };
    }
    // chosen weapon can't reach anything sensible (e.g. a flat-firing coilgun vs a hilltop):
    // try the other weapons in stock before settling
    if (best.err > 60) {
      for (const alt of owned.slice().sort((a, b) => weaponValue(b) - weaponValue(a))) {
        if (alt === best.weapon) continue;
        for (const e of cands) {
          const s = solveShot(g, t, alt, e);
          const score = s.err - (e.maxHp - e.hp) * 0.25;
          if (score < best.score - 20) { best = { ...s, score, target: e, weapon: alt }; weapon = alt; }
        }
        if (best.err <= 60) break;
      }
    }
    const k = DIFFICULTY[t.type] || DIFFICULTY.normal;
    best.elev = clamp(best.elev + rng.gauss() * k.se, weapon.elevMin, weapon.elevMax);
    best.power = clamp(best.power + rng.gauss() * k.sp, 8, 100);
    return best;
  }

  update(dt) {
    const t = this.tank;
    const c = this.ctl;
    c.reset();
    switch (this.state) {
      case 'think': {
        this.timer -= dt;
        if (this.timer > 0) return;
        this.plan = this.makePlan();
        const needMove = !this.moved && (this.plan.err > 60 || (t.type === 'easy' && rng.chance(0.15)));
        if (needMove) {
          this.moved = true;
          const dir = this.plan.target.x > t.x ? 1 : -1;
          this.moveDir = rng.chance(0.8) ? dir : -dir;
          this.moveFrames = rng.int(25, 70);
          this.state = 'move';
          this.stuck = 0;
        } else this.state = 'aim';
        break;
      }
      case 'move': {
        if (this.moveFrames-- > 0 && t.fuel > 1) {
          if (this.moveDir < 0) c.left = true; else c.right = true;
        } else {
          this.timer = 0.15;
          this.state = 'think';
        }
        break;
      }
      case 'aim': {
        const p = this.plan;
        if (t.weaponId !== p.weapon.id) t.selectWeapon(p.weapon.id);
        t.facing = p.facing;
        const diff = p.elev - t.elev;
        if (Math.abs(diff) > 0.6) {
          if (diff > 0) c.up = true; else c.down = true;
        } else {
          this.state = 'charge';
          this.timer = 0.25;
        }
        break;
      }
      case 'charge': {
        this.timer -= dt;
        if (this.timer > 0) return;
        if (t.power < this.plan.power) c.charge = true;
        else this.state = 'done';
        break;
      }
      default:
        break;
    }
  }
}
