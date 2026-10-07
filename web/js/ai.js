'use strict';
// CPU players.
//   - solveShot: brute-force search over (elevation, charge) using the real physics. In A3 the
//     muzzle speed *is* the charge, so the search runs up to each weapon's maxCharge.
//   - CpuController: drives a tank through virtual key presses (the same Ctl a human uses).
// Banter lives in taunts.js; the game decides when to use it.

const AI_NAMES = ['Ace', 'Major', 'Rookie', 'Sarge', 'Byron', 'Unit 7'];

// Virtual controller state. Humans fill it from the keyboard, CPUs from code.
class Ctl {
  constructor() { this.reset(); }
  reset() { this.left = this.right = this.up = this.down = this.charge = this.fine = false; }
}

// aim error: elevation in degrees, charge as a fraction of the weapon's maxCharge
const DIFFICULTY = {
  easy: { se: 4, sc: 0.07 },
  normal: { se: 2, sc: 0.035 },
  hard: { se: 0.7, sc: 0.012 },
};

function solveShot(game, tank, w, target) {
  const facing = target.x >= tank.x ? 1 : -1;
  const tc = target.center();
  const maxV = Math.min(w.maxCharge, 140); // beyond this everything leaves the map anyway
  const evalShot = (elev, v) => {
    const m = tank.muzzle(elev, facing);
    const u = tank.aimVec(elev, facing); // elevation is relative to the hull
    const r = simulateShot(game.terrain, game.wind, game.tanks, tank, m.x, m.y, u.x * v, u.y * v);
    let err;
    if (r.hit === 'tank' && r.tank === target) err = 0;
    else err = Math.max(0, dist(r.x, r.y, tc.x, tc.y) - w.dmgR * 0.25);
    if (r.hit === 'out') err += 1000;
    const selfD = dist(r.x, r.y, tank.x, tank.y - 8);
    if (selfD < Math.max(w.dmgR, w.sat ? 150 : 0) + 20 && r.tank !== target) err += 400;
    return err;
  };
  let best = { err: Infinity, elev: (w.elevMin + w.elevMax) / 2, v: maxV / 2, facing };
  const vStep = maxV / 40;
  for (let e = w.elevMin; e <= w.elevMax; e += 3) {
    for (let v = maxV * 0.08; v <= maxV; v += vStep) {
      const err = evalShot(e, v);
      if (err < best.err) best = { err, elev: e, v, facing };
    }
  }
  for (const [de, dv, n] of [[0.5, vStep / 4, 6], [0.1, vStep / 20, 6]]) {
    const e0 = best.elev;
    const v0 = best.v;
    for (let i = -n; i <= n; i++) {
      const e = e0 + i * de;
      if (e < w.elevMin || e > w.elevMax) continue;
      for (let j = -n; j <= n; j++) {
        const v = v0 + j * dv;
        if (v <= 0 || v > maxV) continue;
        const err = evalShot(e, v);
        if (err < best.err) best = { err, elev: e, v, facing };
      }
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
    this.timer = (tank.firedThisTurn ? 0.3 : 0.8) + Math.random() * 0.4;
    this.plan = null;
    this.moved = tank.firedThisTurn;
  }

  makePlan() {
    const g = this.game;
    const t = this.tank;
    const enemies = g.tanks.filter((x) => x.alive && x !== t);
    // weapon is locked once the clip has started; otherwise pick by difficulty
    let options = t.firedThisTurn ? [t.weapon] : t.weapons.map((id) => WEAPON_BY_ID[id]);
    options = options.slice().sort((a, b) => weaponValue(b) - weaponValue(a));
    if (t.type === 'easy') options = rng.chance(0.6) ? [rng.pick(options)] : options.slice(-1);
    else if (t.type === 'normal' && rng.chance(0.4)) options = [rng.pick(options)];
    let best = null;
    for (const w of options) {
      for (const e of enemies) {
        const s = solveShot(g, t, w, e);
        const score = s.err - (e.maxHp + e.maxArmour - e.hp - e.armour) * 0.1;
        if (!best || score < best.score) best = { ...s, score, target: e, weapon: w };
      }
      if (best && best.err < 40) break; // good enough with the strongest usable weapon
    }
    const k = DIFFICULTY[t.type] || DIFFICULTY.normal;
    const w = best.weapon;
    best.elev = clamp(best.elev + rng.gauss() * k.se, w.elevMin, w.elevMax);
    best.v = clamp(best.v * (1 + rng.gauss() * k.sc), w.maxCharge * 0.05, w.maxCharge);
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
        const needMove = !this.moved && (this.plan.err > 80 || (t.type === 'easy' && rng.chance(0.15)));
        if (needMove) {
          this.moved = true;
          const dir = this.plan.target.x > t.x ? 1 : -1;
          this.moveDir = rng.chance(0.8) ? dir : -dir;
          this.moveFrames = rng.int(40, 120);
          this.state = 'move';
        } else this.state = 'aim';
        break;
      }
      case 'move':
        if (this.moveFrames-- > 0 && t.fuel > 1) {
          if (this.moveDir < 0) c.left = true; else c.right = true;
        } else {
          this.timer = 0.15;
          this.state = 'think';
        }
        break;
      case 'aim': {
        const p = this.plan;
        if (t.weapon.id !== p.weapon.id && !t.firedThisTurn) {
          t.weaponIdx = t.weapons.indexOf(p.weapon.id);
          t.shotsLeft = p.weapon.clip;
        }
        t.facing = p.facing;
        const diff = p.elev - t.elev;
        if (Math.abs(diff) > 0.6) {
          if (diff > 0) c.up = true; else c.down = true;
        } else {
          t.elev = p.elev;
          this.state = 'charge';
          this.timer = 0.2;
        }
        break;
      }
      case 'charge':
        this.timer -= dt;
        if (this.timer > 0) return;
        if (t.charge < this.plan.v) c.charge = true;
        else this.state = 'done';
        break;
      default:
        break;
    }
  }
}
