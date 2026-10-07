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

// Aim error multiplier by range: RANGE_ERR_BASE at point blank, +1 every RANGE_ERR_SCALE world units
// (capped at 3x), so CPUs are deadly close up and shaky at long range.
const RANGE_ERR_BASE = 0.35;
const RANGE_ERR_SCALE = 650;

// Retaliation: a CPU strongly prefers whoever last damaged it. The bonus is in the same units as
// the solver's miss distance, so it will take a somewhat worse shot to hit back.
const RETALIATE = { easy: 180, normal: 260, hard: 320 };
const BOUNTY_PULL = 0.1; // score bonus per $ of bounty on a target

// aim error: elevation in degrees, charge as a fraction of the weapon's maxCharge.
// arc: how much the solver values the altitude / kinetic damage bonuses, in miss-distance units per
// +100% damage. Higher = happier to trade a little accuracy for a high, plunging lob.
const DIFFICULTY = {
  easy: { se: 4, sc: 0.07, arc: 25 },
  normal: { se: 2, sc: 0.035, arc: 60 },
  hard: { se: 0.7, sc: 0.012, arc: 90 },
};

// Search for the best shot at `target`. Each candidate is scored by its miss distance minus a bonus
// for the damage multiplier it would earn (bonusFactor), so among shots that land, high arcs win.
function solveShot(game, tank, w, target) {
  const facing = target.x >= tank.x ? 1 : -1;
  const tc = target.center();
  const arc = (DIFFICULTY[tank.type] || DIFFICULTY.normal).arc;
  const kinR = Math.max(18, w.dmgR * KINETIC_RADIUS);
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
    // only shots that would actually do damage earn the bonus
    const d = dist(r.x, r.y, tc.x, tc.y);
    const f = d < w.dmgR ? bonusFactor(w, r.drop, r.speed, d < kinR) : 1;
    return { err, score: err - arc * (f - 1), f };
  };
  let best = { err: Infinity, score: Infinity, f: 1, elev: (w.elevMin + w.elevMax) / 2, v: maxV / 2, facing };
  const vStep = maxV / 40;
  for (let e = w.elevMin; e <= w.elevMax; e += 3) {
    for (let v = maxV * 0.08; v <= maxV; v += vStep) {
      const r = evalShot(e, v);
      if (r.score < best.score) best = { ...r, elev: e, v, facing };
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
        const r = evalShot(e, v);
        if (r.score < best.score) best = { ...r, elev: e, v, facing };
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
    const grudge = t.lastAttacker && t.lastAttacker.alive && t.lastAttacker !== t ? t.lastAttacker : null;
    // weapon is locked once the clip has started; otherwise pick by difficulty
    let options = t.firedThisTurn ? [t.weapon] : t.weapons.map((id) => WEAPON_BY_ID[id]);
    options = options.slice().sort((a, b) => weaponValue(b) - weaponValue(a));
    if (t.type === 'easy') options = rng.chance(0.6) ? [rng.pick(options)] : options.slice(-1);
    else if (t.type === 'normal' && rng.chance(0.4)) options = [rng.pick(options)];
    let best = null;
    for (const w of options) {
      for (const e of enemies) {
        const s = solveShot(g, t, w, e);
        let score = s.score - (e.maxHp + e.maxArmour - e.hp - e.armour) * 0.1 - (e.bounty || 0) * BOUNTY_PULL;
        if (e === grudge) score -= RETALIATE[t.type] || RETALIATE.normal;
        if (!best || score < best.score) best = { ...s, score, target: e, weapon: w };
      }
      if (best && best.err < 40) break; // good enough with the strongest usable weapon
    }
    const k = DIFFICULTY[t.type] || DIFFICULTY.normal;
    const w = best.weapon;
    // aim error grows with range: sharp up close, increasingly loose across the map
    const range = Math.abs(best.target.x - t.x);
    const f = clamp(RANGE_ERR_BASE + range / RANGE_ERR_SCALE, RANGE_ERR_BASE, 3);
    best.elev = clamp(best.elev + rng.gauss() * k.se * f, w.elevMin, w.elevMax);
    best.v = clamp(best.v * (1 + rng.gauss() * k.sc * f), w.maxCharge * 0.05, w.maxCharge);
    best.revenge = best.target === grudge;
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
        // badly hurt and carrying a kit: patch up instead of shooting
        if (t.kits > 0 && !t.firedThisTurn && t.hp < t.maxHp * 0.45 && rng.chance(0.75)) {
          this.state = 'done';
          this.game.useRepair(t);
          return;
        }
        // a landed crate within driving range: go and get it first
        if (!this.moved && t.fuel > 30) {
          const reach = t.fuel * TANK_SPEED * 0.9;
          const crate = this.game.crates.filter((c) => c.alive && c.landed && Math.abs(c.x - t.x) < reach)
            .sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
          const keen = t.type === 'easy' ? 0.5 : t.type === 'normal' ? 0.8 : 1;
          if (crate && rng.chance(keen)) {
            this.moved = true;
            this.moveDir = crate.x > t.x ? 1 : -1;
            this.moveFrames = Math.ceil(Math.abs(crate.x - t.x) / TANK_SPEED) + 6;
            this.state = 'move';
            return;
          }
        }
        // Deflector when hurt (it doesn't cost the turn)
        if (t.abilityReady('shield') && !t.shield && t.hp < t.maxHp * 0.6 && rng.chance(t.type === 'easy' ? 0.3 : 0.7)) this.game.useAbility(t, 'shield');
        this.plan = this.makePlan();
        // a good firing solution is worth a Double Shot
        if (!t.armed.double && t.abilityReady('double') && this.plan.err < 40 && rng.chance(t.type === 'hard' ? 0.8 : t.type === 'normal' ? 0.5 : 0.25)) this.game.useAbility(t, 'double');
        // announce a grudge once per attacker
        if (this.plan.revenge && t.vowed !== this.plan.target && !t.firedThisTurn) {
          t.vowed = this.plan.target;
          if (rng.chance(0.6 * CHATTINESS)) this.game.banter(t, 'revenge', this.plan.target);
        }
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
