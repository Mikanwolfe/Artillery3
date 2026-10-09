'use strict';
// CPU players.
//   - solveShot: brute-force search over (elevation, charge) using the real physics. In A3 the
//     muzzle speed *is* the charge, so the search runs up to each weapon's maxCharge.
//   - CpuController: drives a tank through virtual key presses (the same Ctl a human uses).
// Banter lives in taunts.js; the game decides when to use it.

// CPU names, after everything the game borrows from: HapyMaher, Land of the Lustrous, Mabinogi,
// KanColle, the SCP Foundation and Stellaris (personalities in taunts.js PERSONA_BY_NAME)
const AI_NAMES = [
  'Arisu', 'Saki', 'Yayoi', 'Keiko', 'Mia', // HapyMaher
  'Phos', 'Cinnabar', 'Bort', 'Antarc', 'Kongo', // Land of the Lustrous
  'Nao', 'Tarlach', 'Mari', 'Ruairi', // Mabinogi
  'Fubuki', 'Shimakaze', 'Hibiki', // KanColle
  'Dr. Bright', 'SCP-079', // SCP Foundation
  'Custodian', 'The Shroud', // Stellaris
];
// a CPU name not already in use (the menu's pick; auto matches take AI_NAMES in order)
function cpuName(taken = []) {
  const free = AI_NAMES.filter((n) => !taken.includes(n));
  const pool = free.length ? free : AI_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
// spread the fire: a rival other CPUs have already gone after this turn cycle is less attractive, per
// CPU, so a table of CPUs doesn't all pile onto one player (a grudge still outweighs one of these)
const CROWD = 150;
const AI_MOBS = 2; // mobs (drones, motherships) a CPU weighs as targets: the nearest few
const AI_BUDGET_MS = 8; // planning time per frame, so a CPU's aim search never stalls a frame
const DODGE = { easy: 0.35, normal: 0.75, hard: 0.95 }; // chance it drives out from under a drone
const MOB_AIM = 0.6; // aim error against hostiles (they hold still, and CPUs practise on them)
const MOB_DISLIKE = 90; // score penalty for going after a mob instead of a player (less for big bounties / with flak)
const SAT_DISLIKE = 220; // score penalty for shooting at MAIA rather than a rival (less when it is healthy)

// aim error: elevation in degrees, charge as a fraction of the weapon's maxCharge.
// arc: how much the solver values the altitude / kinetic damage bonuses, in miss-distance units per
// +100% damage. Higher = happier to trade a little accuracy for a high, plunging lob.
// Ranging in, like a person would: a CPU's first shot at a target misjudges the wind (by a
// persistent error, WIND_GUESS of it at worst) and aims loosely; each further shot at the same
// target from the same spot tightens both (LEARN, by shots already fired) and makes it bolder about
// high lobs (LOB_TRUST), which would be hopeless guesses first time. Any movement by either side,
// or a change of wind, and it starts over. Kept per tank in tank.aimMemo for the round.
const LEARN = [1.25, 0.9, 0.65, 0.5, 0.4];
const LOB_TRUST = [0.5, 0.8, 1.1, 1.3, 1.45];
const WIND_GUESS = { easy: 0.6, normal: 0.4, hard: 0.25 };
const MEMO_MOVE = 4; // world units of sideways movement that resets it (craters under a target don't)

const DIFFICULTY = {
  easy: { se: 4, sc: 0.07, arc: 25 },
  normal: { se: 2, sc: 0.035, arc: 60 },
  hard: { se: 0.7, sc: 0.012, arc: 90 },
};

// Search for the best shot at `target`. Each candidate is scored by its miss distance minus a bonus
// for the damage multiplier it would earn (bonusFactor), so among shots that land, high arcs win.
// A generator: it yields after each row of the grid so the search can be spread over frames
// (CpuController plans with a per-frame time budget, so the game never freezes while a CPU
// thinks); solveShot runs it to the end in one go.
function solveShot(...args) { return runGen(solveShotGen(...args)); }
function runGen(gen) { let r = gen.next(); while (!r.done) r = gen.next(); return r.value; }
function* solveShotGen(game, tank, w, target, wind = game.wind, arcScale = 1) {
  const facing = target.x >= tank.x ? 1 : -1;
  const tc = target.center();
  const arc = (DIFFICULTY[tank.type] || DIFFICULTY.normal).arc * arcScale;
  const kinR = Math.max(18, w.dmgR * KINETIC_RADIUS);
  const maxV = Math.min(w.maxCharge, 140); // beyond this everything leaves the map anyway
  const seek = w.guide ? game.seekables() : null;
  const evalShot = (elev, v) => {
    const m = tank.muzzle(elev, facing);
    const u = tank.aimVec(elev, facing); // elevation is relative to the hull
    let r = simulateShot(game.terrain, wind, game.targets(), tank, m.x, m.y, u.x * v, u.y * v, w.drift, w, seek);
    if (w.kind === 'laser' && r.hit !== 'out') { // the pointer only marks: the drone's beam is what lands
      const b = droneShot(game.terrain, game.targets(), tank, w, r).end;
      r = { ...r, x: b.x, y: b.y, hit: b.hit === 'spot' ? r.hit : b.hit, tank: b.hit === 'spot' ? r.tank : b.tank || null };
    }
    let err;
    if ((r.hit === 'tank' && r.tank === target) || (w.maia && r.lock === target)) err = 0; // a barrage follows the lock
    else err = Math.max(0, dist(r.x, r.y, tc.x, tc.y) - w.dmgR * 0.25);
    if (r.hit === 'out') err += 1000;
    if (r.early) err += 80; // a split or carpet rocket that hits before it transforms does half damage
    const selfD = dist(r.x, r.y, tank.x, tank.y - 8);
    if (selfD < Math.max(w.dmgR, w.sat ? 150 : 0) + 20 && r.tank !== target) err += 400;
    // only shots that would actually do damage earn the bonus
    const d = dist(r.x, r.y, tc.x, tc.y);
    const f = d < w.dmgR ? bonusFactor(w, r.drop, r.speed, d < kinR, rad(elev + tank.hullAngle(facing))) : 1;
    return { err, score: err - arc * (f - 1), f };
  };
  let best = { err: Infinity, score: Infinity, f: 1, elev: (w.elevMin + w.elevMax) / 2, v: maxV / 2, facing };
  const vStep = maxV / 28; // a coarse pass (the refinement below closes in)
  for (let e = w.elevMin; e <= w.elevMax; e += 5) {
    for (let v = maxV * 0.08; v <= maxV; v += vStep) {
      const r = evalShot(e, v);
      if (r.score < best.score) best = { ...r, elev: e, v, facing };
    }
    yield;
  }
  for (const [de, dv, n] of [[1, vStep / 4, 6], [0.2, vStep / 20, 6]]) {
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
      if (i % 4 === 0) yield;
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
    this.timer = (tank.firedThisTurn ? 0.3 : 0.8) + rng.next() * 0.4;
    this.plan = null;
    this.moved = tank.firedThisTurn;
  }

  makePlan() { return runGen(this.makePlanGen()); }

  *makePlanGen() {
    const g = this.game;
    const t = this.tank;
    // drones are fair game too, but a CPU would rather hit a rival
    // (only the nearest few: every target multiplies the search, and with a mothership's swarm
    // overhead a full search could hold the world still for many seconds)
    const mobs = g.mobs.filter((d) => d.alive).sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x));
    let enemies = g.tanks.filter((x) => x.alive && x !== t).concat(mobs.slice(0, AI_MOBS));
    if (t.lastAttacker && t.lastAttacker.isMob && t.lastAttacker.alive && !enemies.includes(t.lastAttacker)) enemies.push(t.lastAttacker);
    // the rest of an autoloader's clip goes at the same target, if it still stands
    if (t.firedThisTurn && t.planTarget && t.planTarget.alive && t.planTarget !== t) enemies = [t.planTarget];
    // MAIA: worth shooting down when a rival can call it and this CPU can't
    const sat = g.satellite;
    const rivalsUplink = g.tanks.some((x) => x.alive && x !== t && x.weapons.some((id) => WEAPON_BY_ID[id].sat));
    const ownUplink = t.weapons.some((id) => WEAPON_BY_ID[id].sat);
    if (sat && sat.alive && rivalsUplink && !ownUplink && sat.health > 0.6 && rng.chance(0.3)) enemies.push(sat);
    const grudge = t.lastAttacker && t.lastAttacker.alive && t.lastAttacker !== t ? t.lastAttacker : null;
    const cycle = g.tanks.filter((x) => x.alive).length;
    const crowd = (e) => g.tanks.filter((o) => o !== t && o.isCpu && o.alive && o.planTarget === e && g.turnCount - (o.planTurn ?? -99) < cycle).length;
    // weapon is locked once the clip has started; otherwise pick by difficulty
    let options = t.firedThisTurn ? [t.weapon] : t.weapons.filter((id) => t.weaponReady(id)).map((id) => WEAPON_BY_ID[id]);
    options = options.slice().sort((a, b) => weaponValue(b) - weaponValue(a));
    if (t.type === 'easy') options = rng.chance(0.6) ? [rng.pick(options)] : options.slice(-1);
    else if (t.type === 'normal' && rng.chance(0.4)) options = [rng.pick(options)];
    let best = null;
    const memo = (t.aimMemo = t.aimMemo || new Map());
    const learn = (e) => { // how many shots it has ranged in on e with, and its wind guess
      let m = memo.get(e);
      if (!m || Math.abs(m.sx - t.x) > MEMO_MOVE || Math.abs(m.tx - e.x) > MEMO_MOVE || m.windDir !== g.windDir) {
        m = { sx: t.x, tx: e.x, windDir: g.windDir, shots: 0, werr: clamp(rng.gauss(), -1.5, 1.5) * (WIND_GUESS[t.type] || WIND_GUESS.normal) };
        memo.set(e, m);
      }
      return m;
    };
    for (const w of options) {
      for (const e of enemies) {
        const m = learn(e);
        const k = Math.min(m.shots, LEARN.length - 1);
        const wf = 1 + m.werr * LEARN[k] / LEARN[0]; // the wind as it judges it, closer each shot
        const s = yield* solveShotGen(g, t, w, e, { x: g.wind.x * wf, y: g.wind.y * wf }, LOB_TRUST[k]);
        let score = s.score - (e.isSat ? 0 : (e.maxHp + e.maxArmour - e.hp - e.armour) * 0.1) - (e.bounty || 0) * BOUNTY_PULL;
        if (e.isSat) score += SAT_DISLIKE - sat.health * 60;
        if (e === grudge) score -= RETALIATE[t.type] || RETALIATE.normal;
        if (!e.isMob && !e.isSat) score += CROWD * crowd(e);
        if (e.isMob) score += MOB_DISLIKE - Math.min(150, e.bounty * 0.03) - (w.kind === 'flak' ? 120 : 0);
        if (!best || score < best.score) best = { ...s, score, target: e, weapon: w };
      }
      if (best && best.err < 40) break; // good enough with the strongest usable weapon
    }
    const k = DIFFICULTY[t.type] || DIFFICULTY.normal;
    const w = best.weapon;
    // aim error grows with range: sharp up close, increasingly loose across the map
    const range = Math.abs(best.target.x - t.x);
    const m = memo.get(best.target);
    const f = clamp(RANGE_ERR_BASE + range / RANGE_ERR_SCALE, RANGE_ERR_BASE, 3) * (t.upgrades.computer ? 0.7 : 1) * LEARN[Math.min(m.shots, LEARN.length - 1)] * (best.target.isMob ? MOB_AIM : 1);
    m.shots++;
    best.elev = clamp(best.elev + rng.gauss() * k.se * f, w.elevMin, w.elevMax);
    best.v = clamp(best.v * (1 + rng.gauss() * k.sc * f), w.maxCharge * 0.05, w.maxCharge);
    best.revenge = best.target === grudge;
    t.planTarget = best.target;
    t.planTurn = g.turnCount;
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
        // standing under a live wire, or under a deck that will catch its shots: drive clear first
        if (!this.cleared && t.fuel > 10) {
          this.cleared = true;
          const g = this.game;
          const wire = g.liveWireAt(t.x, t.y);
          const reach = t.fuel * TANK_SPEED * 0.9;
          let to = null;
          if (wire) to = t.x - wire.a < wire.b - t.x ? wire.a - 24 : wire.b + 24;
          else if (g.coveredAt(t.x, t.y) || g.terrain.lavaAt(t.x) >= 0.1) to = g.clearSpot(t, Math.min(reach, 700)); // under a deck, or in lava
          if (to !== null && Math.abs(to - t.x) <= reach) {
            this.moveDir = to > t.x ? 1 : -1;
            this.moveFrames = Math.ceil(Math.abs(to - t.x) / TANK_SPEED) + 4;
            this.escaping = true;
            this.state = 'move';
            return;
          }
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
        // in the whiteout fog: head for the higher side first
        if (!this.moved && this.game.fogY !== null && t.y > this.game.fogY - 80 && t.fuel > 30) {
          const tr = this.game.terrain;
          this.moved = true;
          this.moveDir = tr.hAt(t.x - 160) < tr.hAt(t.x + 160) ? -1 : 1;
          this.moveFrames = 160;
          this.state = 'move';
          return;
        }
        // a bomber, carrier or kamikaze close by: get out from under it before it gets its turn
        if (!this.moved && t.fuel > 40) {
          const g = this.game;
          const threat = g.mobs.filter((m) => m.alive && (m.kind === 'drone' || m.kind === 'carrier' || m.kind === 'fpv') && Math.abs(m.x - t.x) < (m.kind === 'fpv' ? 260 : 150))
            .sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
          if (threat && rng.chance(DODGE[t.type] || DODGE.normal)) {
            this.moved = true;
            this.moveDir = t.x >= threat.x ? 1 : -1;
            if (t.x + this.moveDir * 160 < 40 || t.x + this.moveDir * 160 > WORLD_W - 40) this.moveDir = -this.moveDir;
            this.moveFrames = rng.int(70, 130);
            this.state = 'move';
            return;
          }
        }
        // Bulwark Barrier toward whoever it expects fire from (its grudge, else the nearest rival),
        // tilted up because most of that fire comes down in an arc
        if (t.abilityReady('barrier') && !t.barrier && rng.chance(t.type === 'easy' ? 0.3 : 0.8)) {
          const foes = this.game.tanks.filter((x) => x.alive && x !== t);
          const foe = t.lastAttacker && t.lastAttacker.alive ? t.lastAttacker : foes.sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
          if (foe) this.game.useAbility(t, 'barrier', { x: Math.sign(foe.x - t.x) || 1, y: -1 });
        }
        // Deflector when hurt (it doesn't cost the turn)
        if (t.abilityReady('shield') && !t.shield && t.hp < t.maxHp * 0.6 && rng.chance(t.type === 'easy' ? 0.3 : 0.7)) this.game.useAbility(t, 'shield');
        // plan over the next frames, a few milliseconds at a time (see AI_BUDGET_MS)
        this.planGen = this.makePlanGen();
        this.state = 'plan';
        break;
      }
      case 'plan': {
        // the search runs a few milliseconds a frame; the game world holds still meanwhile (see
        // Game.step), so a seeded match replays the same however long the search takes
        const t0 = performance.now();
        let r = this.planGen.next();
        while (!r.done && performance.now() - t0 < AI_BUDGET_MS) r = this.planGen.next();
        if (!r.done) return;
        this.planGen = null;
        this.plan = r.value;
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
      case 'move': {
        // other moves stop short of a live wire or a deck overhead (escaping one, it drives on)
        const g = this.game, nx = t.x + this.moveDir * TANK_SPEED * 6;
        const into = !this.escaping && !t.falling && (g.liveWireAt(nx, g.groundAt(nx, t.y)) || g.coveredAt(nx, g.groundAt(nx, t.y)) || (g.terrain.lavaAt(nx) >= 0.1 && g.terrain.lavaAt(t.x) < 0.1) || g.terrain.voidAt(nx + this.moveDir * 20));
        if (!into && this.moveFrames-- > 0 && t.fuel > 1) {
          if (this.moveDir < 0) c.left = true; else c.right = true;
          // stuck against a wall or fort for a moment: jump it, if there's the fuel
          if (!t.falling && this.lastX !== undefined && Math.abs(t.x - this.lastX) < 0.01) this.stuck = (this.stuck || 0) + 1; else this.stuck = 0;
          this.lastX = t.x;
          if (this.stuck > 6 && t.fuel >= t.maxFuel * JUMP_FUEL + 20) { t.facing = this.moveDir; this.game.jump(t); this.stuck = 0; }
        } else {
          this.escaping = false;
          this.timer = 0.15;
          this.state = 'think';
        }
        break;
      }
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
        if (t.charge < Math.min(this.plan.v, t.chargeCap())) c.charge = true; // (a plan past the cap would hold the trigger forever)
        else this.state = 'done';
        break;
      default:
        break;
    }
  }
}
