'use strict';
// Hostile mobs (events on): they belong to nobody, attack the players once per turn cycle, and pay a
// bounty to whoever destroys them. All are targets for shells, blasts and CPUs.
//   Drone     Hatsuyuki bomber (named after A3's shelved AI project): flies up to MOB_MOVE toward the
//             nearest vehicle each cycle and drops a bomb if it got over one.
//   Gunner    a drone with a gun: closes in the same way, then fires a three-round burst if it has a
//             clear line of sight within GUNNER_RANGE.
//   Turret    an emplacement built into the ground: lobs a shell at the nearest vehicle every cycle.
//   Mothership the boss: drifts high above the map, launches drones, rains bombs on the leaders, and
//             every third cycle fires a heavy beam.
// Mobs arrive in waves: some at the start of later rounds, and reinforcements that grow every cycle
// once a round has dragged on, so players who are hard to hit still get hunted down.

const MOB_MOVE = 320; // most a drone can fly in one cycle (world units)
const MOB_SPEED = 7; // per frame while moving
const GUNNER_RANGE = 720;
const MOB_CAP = 9; // most drones alive at once
const FLAK_MOB_MULT = 2; // flak does double damage to mobs

class Mob {
  constructor(kind, x, y, stage) {
    this.isMob = true;
    this.kind = kind;
    this.x = x;
    this.y = y; // bottom of the hitbox (like a vehicle's ground point)
    this.alive = true;
    this.dest = null;
    this.t = rng.next() * 100;
    this.flash = 0;
    this.armour = 0;
    this.maxArmour = 0;
    this.color = '#5a5a6a';
    this.stage = stage;
    const S = {
      drone: { name: 'Hatsuyuki drone', hp: 50 + 20 * stage, hw: 18, hh: 16, bounty: 250 + 60 * stage },
      gunner: { name: 'Hatsuyuki gunner', hp: 45 + 18 * stage, hw: 18, hh: 16, bounty: 300 + 70 * stage },
      turret: { name: 'Shore battery', hp: 150 + 30 * stage, hw: 24, hh: 22, bounty: 500 + 80 * stage },
      mothership: { name: 'Mothership Shirayuki', hp: 1500 + 300 * stage, hw: 120, hh: 46, bounty: 4000 + 600 * stage },
    }[kind];
    Object.assign(this, S);
    this.maxHp = this.hp;
    this.aim = { x: 1, y: 0 };
    this.cycles = 0;
  }

  get flying() { return this.kind !== 'turret'; }
  center() { return { x: this.x, y: this.y - this.hh / 2 }; }

  update(game) {
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
    if (!this.alive) return;
    if (this.kind === 'turret') { this.y = game.terrain.hAt(this.x); return; }
    if (this.kind === 'mothership') {
      if (this.dest) this.x += clamp(this.dest.x - this.x, -3, 3);
      this.y += (Mob.shipY(game.terrain) + Math.sin(this.t / 70) * 6 - this.y) * 0.03;
      return;
    }
    const hover = Mob.hoverY(game.terrain, this.dest ? this.dest.x : this.x);
    if (this.dest) {
      this.x += clamp(this.dest.x - this.x, -MOB_SPEED, MOB_SPEED);
      this.y += clamp(hover - this.y, -MOB_SPEED, MOB_SPEED);
    } else {
      this.y += (hover + Math.sin(this.t / 40) * 8 - this.y) * 0.05;
    }
  }

  arrived() { return !this.dest || Math.abs(this.dest.x - this.x) < (this.kind === 'mothership' ? 4 : 2); }

  // cruise well clear of the highest ground underneath
  static hoverY(terrain, x) {
    let top = Infinity;
    for (let dx = -80; dx <= 80; dx += 20) top = Math.min(top, terrain.hAt(clamp(x + dx, 0, WORLD_W - 1)));
    return Math.max(-150, top - 240);
  }

  static shipY(terrain) {
    let top = Infinity;
    for (let x = 0; x < WORLD_W; x += 40) top = Math.min(top, terrain.hAt(x));
    return Math.max(-160, top - 300);
  }

  draw(ctx) {
    if (!this.alive) return;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const white = this.flash > 0.3;
    const c = (col) => (white ? '#ffffff' : col);
    const blink = (this.t >> 4) % 2;
    if (this.kind === 'drone' || this.kind === 'gunner') {
      const cy = y - 8;
      ctx.fillStyle = c('#3c3c48');
      ctx.fillRect(x - 14, cy - 5, 28, 10);
      ctx.fillStyle = c('#5a5a6a');
      ctx.fillRect(x - 26, cy - 3, 12, 3);
      ctx.fillRect(x + 14, cy - 3, 12, 3);
      const blade = (this.t >> 2) % 2 ? 14 : 8;
      ctx.fillStyle = 'rgba(200,200,214,0.8)';
      ctx.fillRect(x - 20 - blade / 2, cy - 7, blade, 2);
      ctx.fillRect(x + 20 - blade / 2, cy - 7, blade, 2);
      ctx.fillStyle = blink ? 'rgb(255,120,200)' : 'rgb(160,60,120)';
      ctx.fillRect(x - 2, cy - 2, 4, 4);
      if (this.kind === 'drone') {
        ctx.fillStyle = c('#20202a'); // bomb bay
        ctx.fillRect(x - 4, cy + 5, 8, 4);
      } else {
        ctx.fillStyle = c('#20202a'); // gun pod and barrel squares toward its aim
        ctx.fillRect(x - 5, cy + 5, 10, 5);
        for (let i = 1; i <= 4; i++) sq(ctx, x + this.aim.x * (4 + i * 4), cy + 8 + this.aim.y * (4 + i * 4), 3);
      }
    } else if (this.kind === 'turret') {
      // a concrete casemate sunk into the ground, with a rotating gun
      ctx.fillStyle = c('#6e6a64');
      ctx.fillRect(x - 24, y - 16, 48, 18);
      ctx.fillStyle = c('#8a857e');
      ctx.fillRect(x - 20, y - 22, 40, 7);
      ctx.fillStyle = c('#4a4640');
      ctx.fillRect(x - 24, y - 2, 48, 4);
      ctx.fillRect(x - 10, y - 12, 20, 3); // firing slit
      ctx.fillStyle = blink ? 'rgb(255,90,70)' : 'rgb(150,40,30)';
      ctx.fillRect(x + 14, y - 20, 3, 3);
      ctx.fillStyle = c('#2e2c2a');
      for (let i = 1; i <= 6; i++) sq(ctx, x + this.aim.x * (6 + i * 5), y - 20 + this.aim.y * (6 + i * 5), 5);
    } else {
      this.drawShip(ctx, x, y, c, blink);
    }
  }

  // the mothership: a long box-built airship hull, gondola and drone bay, a glowing core,
  // engines at the back, and running lights
  drawShip(ctx, x, y, c, blink) {
    const top = y - 92;
    ctx.fillStyle = c('#4a4660');
    ctx.fillRect(x - 120, top + 20, 240, 40);
    ctx.fillRect(x - 100, top + 10, 200, 10);
    ctx.fillRect(x - 100, top + 60, 200, 10);
    ctx.fillStyle = c('#5e5a78');
    ctx.fillRect(x - 120, top + 20, 240, 6);
    ctx.fillRect(x - 136, top + 28, 16, 24); // nose
    ctx.fillStyle = c('#38344a');
    for (let i = -100; i <= 90; i += 30) ctx.fillRect(x + i, top + 30, 4, 22); // hull ribs
    ctx.fillStyle = c('#2c2838'); // gondola and drone bay
    ctx.fillRect(x - 50, top + 70, 100, 16);
    ctx.fillStyle = blink ? 'rgb(255,120,200)' : 'rgb(190,70,150)';
    ctx.fillRect(x - 40, top + 82, 80, 4);
    // glowing core
    const pulse = 0.6 + 0.4 * Math.sin(this.t / 10);
    ctx.fillStyle = `rgba(255,120,200,${pulse})`;
    ctx.fillRect(x - 12, top + 32, 24, 16);
    ctx.fillStyle = '#ffe0f0';
    ctx.fillRect(x - 5, top + 37, 10, 6);
    // engines with flickering exhaust at the back (right), fins
    ctx.fillStyle = c('#38344a');
    ctx.fillRect(x + 118, top + 14, 22, 14);
    ctx.fillRect(x + 118, top + 52, 22, 14);
    ctx.fillRect(x + 104, top - 4, 12, 16);
    ctx.fillStyle = `rgba(255,180,90,${0.5 + Math.random() * 0.4})`;
    ctx.fillRect(x + 140, top + 17, 6 + Math.random() * 6, 8);
    ctx.fillRect(x + 140, top + 55, 6 + Math.random() * 6, 8);
    ctx.fillStyle = blink ? '#ff5a46' : '#7a2a22';
    ctx.fillRect(x - 118, top + 22, 4, 4);
    ctx.fillStyle = blink ? '#7a2a22' : '#ff5a46';
    ctx.fillRect(x + 114, top + 22, 4, 4);
  }

  // screen space: a health bar (the boss gets a long one with its name)
  drawLabel(ctx, sx, sy) {
    if (!this.alive) return;
    if (this.kind === 'mothership') {
      ctx.fillStyle = HUD.plate;
      ctx.fillRect(Math.round(sx - 130), Math.round(sy - 128), 260, 30);
      ctx.fillStyle = HUD.hot;
      ctx.fillRect(Math.round(sx - 124), Math.round(sy - 108), Math.round(248 * clamp(this.hp / this.maxHp, 0, 1)), 6);
      ctx.font = `12px ${HUD_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = HUD.fg;
      ctx.fillText(`${this.name} · ${Math.ceil(this.hp)}`, Math.round(sx), Math.round(sy - 113));
      return;
    }
    const top = this.kind === 'turret' ? 40 : 34;
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(Math.round(sx - 26), Math.round(sy - top - 8), 52, 8);
    ctx.fillStyle = HUD.hot;
    ctx.fillRect(Math.round(sx - 24), Math.round(sy - top - 6), Math.round(48 * clamp(this.hp / this.maxHp, 0, 1)), 4);
    // armed (fires on the next hostile turn): a blinking red pip; reloading: a dim one
    ctx.fillStyle = this.armed ? ((this.t | 0) % 30 < 18 ? '#ff4a3a' : '#7a2420') : HUD.ash;
    ctx.fillRect(Math.round(sx + 30), Math.round(sy - top - 10), 7, 7);
  }
}

// projectile definitions for mob attacks (scaled by stage)
function mobWeapon(kind, st) {
  const base = { kind: 'shell', salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: 1, maxCharge: 60 };
  if (kind === 'bomb') return { ...base, id: 'mobbomb', name: 'Drone bomb', dmg: 35 + 12 * st, dmgR: 70, explR: 8 };
  if (kind === 'bullet') return { ...base, id: 'mobgun', name: 'Drone gun', dmg: 14 + 5 * st, dmgR: 30, explR: 2 };
  if (kind === 'battery') return { ...base, id: 'mobshell', name: 'Battery shell', dmg: 20 + 8 * st, dmgR: 80, explR: 10 };
  return { ...base, id: 'shipbomb', name: 'Mothership bomb', dmg: 50 + 15 * st, dmgR: 85, explR: 12 };
}

// clear line of sight from a to b over the terrain (and forts)
function lineOfSight(terrain, ax, ay, bx, by) {
  const n = Math.ceil(dist(ax, ay, bx, by) / 16);
  for (let i = 1; i < n; i++) {
    const x = lerp(ax, bx, i / n);
    const y = lerp(ay, by, i / n);
    if (x >= 0 && x < WORLD_W && y >= terrain.hAt(x)) return false;
    if (terrain.fortAt && terrain.fortAt(x, y)) return false;
  }
  return true;
}

// a battery's firing solution: brute force over angle and speed with the real physics
function mobSolve(game, mob, target, err) {
  const tc = target.center();
  const m = { x: mob.x, y: mob.y - 22 };
  const dir = tc.x >= m.x ? 1 : -1;
  let best = null;
  for (let a = 25; a <= 80; a += 2.5) {
    for (let v = 10; v <= 75; v += 1.5) {
      const vx = Math.cos(rad(a)) * v * dir;
      const vy = -Math.sin(rad(a)) * v;
      const r = simulateShot(game.terrain, game.wind, game.targets(), mob, m.x, m.y, vx, vy);
      const e = r.tank === target ? 0 : dist(r.x, r.y, tc.x, tc.y);
      if (!best || e < best.e) best = { e, vx, vy };
    }
  }
  const k = 1 + rng.gauss() * err;
  return { x: m.x, y: m.y, vx: best.vx * k, vy: best.vy * (1 + rng.gauss() * err) };
}

Object.assign(Game.prototype, {
  addMob(kind, x) {
    const st = Math.max(1, Math.round(this.stage()));
    const y = kind === 'turret' ? this.terrain.hAt(x) : kind === 'mothership' ? Mob.shipY(this.terrain) : Mob.hoverY(this.terrain, x);
    const m = new Mob(kind, x, y, st);
    // enemies attack every other hostile turn, staggered so about half of them fire each time
    m.armed = this.mobs.filter((x) => x.alive && x.armed).length * 2 < this.mobs.filter((x) => x.alive).length + 1;
    this.mobs.push(m);
    return m;
  },

  // pick a spot away from the players (and other ground mobs)
  mobSpot(margin = 260) {
    const avoid = this.tanks.map((t) => t.x).concat(this.mobs.filter((m) => !m.flying).map((m) => m.x));
    let x = WORLD_W / 2;
    for (let k = 0; k < 40; k++) {
      x = rng.range(120, WORLD_W - 120);
      if (avoid.every((a) => Math.abs(a - x) > margin)) break;
    }
    return x;
  },

  damageMob(m, amt, owner, def, hit) {
    if (!m.alive) return;
    if (def && (def.kind === 'flak' || def.airburst)) { amt *= FLAK_MOB_MULT; if (hit) hit.flak = true; }
    m.hp -= amt;
    m.flash = 1;
    if (hit) this.hitPopup(m.x, m.y - m.hh - 20, amt, hit);
    else this.particles.text(m.x, m.y - m.hh - 20, String(Math.round(amt)), '#ffffff', amt > 100);
    if (m.hp > 0) return;
    m.alive = false;
    const c = m.center();
    this.particles.explosion(c.x, c.y, m.kind === 'mothership' ? 300 : 90, 'shell');
    this.sfx.explosion(m.kind === 'mothership' ? 60 : 30);
    this.shake = Math.max(this.shake, m.kind === 'mothership' ? 14 : 4);
    if (m.kind === 'mothership') {
      for (let i = 0; i < 6; i++) this.particles.explosion(c.x + rng.range(-110, 110), c.y + rng.range(-30, 30), 120, 'shell');
    }
    if (owner && !owner.isMob) {
      owner.money += m.bounty;
      this.particles.text(c.x, c.y - 40, `+¢${m.bounty}`, '#ffd84a', true);
      this.events.push(`${owner.name} destroyed the ${m.name} (+¢${m.bounty}).`);
      this.ui.notice(`${owner.name} destroyed the ${m.name}! +¢${m.bounty}`);
      if (owner.isCpu && Math.random() < 0.6) this.banter(owner, 'hit_big');
    } else this.events.push(`The ${m.name} was destroyed.`);
  },

  // Plan this cycle's mob actions: flyers pick their nearest vehicle and move toward it (at most
  // MOB_MOVE); returns true if anything will happen.
  planMobs() {
    const live = this.mobs.filter((m) => m.alive);
    const victims = this.tanks.filter((t) => t.alive);
    if (!live.length || !victims.length) return false;
    const taken = new Map();
    for (const m of live) {
      m.cycles++;
      const near = victims.slice().sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x));
      m.victim = m.kind === 'drone' || m.kind === 'gunner' ? near[0] : rng.pick(victims);
      if (m.kind === 'drone' || m.kind === 'gunner') {
        const k = taken.get(m.victim) || 0; // fan out drones that chase the same vehicle
        taken.set(m.victim, k + 1);
        const want = m.victim.x + (k ? (k % 2 ? 1 : -1) * 60 * Math.ceil(k / 2) : rng.range(-20, 20));
        const stopShort = m.kind === 'gunner' ? 160 * Math.sign(m.x - m.victim.x || 1) : 0; // gunners hang back a little
        m.dest = { x: clamp(m.x + clamp(want + stopShort - m.x, -MOB_MOVE, MOB_MOVE), 20, WORLD_W - 20) };
      } else if (m.kind === 'mothership') {
        const lead = victims.slice().sort((a, b) => b.wins - a.wins || b.hp - a.hp)[0];
        m.dest = { x: clamp(m.x + clamp(lead.x - m.x, -160, 160), 140, WORLD_W - 140) };
      }
    }
    return true;
  },

  // every mob attacks once its move is done; returns the number of shots in the air
  mobAttacks() {
    const st = Math.max(1, Math.round(this.stage()));
    let shots = 0;
    const live = this.mobs.filter((m) => m.alive);
    for (const m of live) {
      const armed = m.armed;
      m.armed = !m.armed; // every other turn: reload while the others fire
      if (!armed) continue;
      const v = m.victim;
      if (!v || !v.alive) continue;
      const vc = v.center();
      if (m.kind === 'drone') {
        if (Math.abs(m.x - v.x) < 50) {
          this.projectiles.push(new Projectile(this, mobWeapon('bomb', st), m, m.x, m.y + 2, 0, 1, false));
          shots++;
        }
      } else if (m.kind === 'gunner') {
        const c = m.center();
        const d = dist(c.x, c.y, vc.x, vc.y);
        if (d > GUNNER_RANGE || !lineOfSight(this.terrain, c.x, c.y + 10, vc.x, vc.y)) continue;
        const sp = 26;
        const tFly = d / sp;
        for (let i = 0; i < 3; i++) {
          const dx = vc.x - c.x + rng.range(-25, 25);
          const dy = vc.y - c.y - 0.5 * GRAV * tFly * tFly + rng.range(-20, 20);
          const len = Math.hypot(dx, dy) || 1;
          const p = new Projectile(this, mobWeapon('bullet', st), m, c.x, c.y + 8, (dx / len) * sp, (dy / len) * sp, false);
          p.delay = i * 8; // a short burst
          this.projectiles.push(p);
          shots++;
        }
        m.aim = { x: Math.sign(vc.x - c.x), y: 0.3 };
      } else if (m.kind === 'turret') {
        const s = mobSolve(this, m, v, 0.04);
        m.aim = { x: Math.sign(s.vx), y: -0.7 };
        this.projectiles.push(new Projectile(this, mobWeapon('battery', st), m, s.x, s.y, s.vx, s.vy, false));
        this.particles.muzzle(s.x, s.y, { x: Math.sign(s.vx), y: -0.7 });
        shots++;
      } else if (m.kind === 'mothership') {
        shots += this.shipAttack(m, st);
      }
    }
    return shots;
  },

  shipAttack(m, st) {
    let shots = 0;
    const victims = this.tanks.filter((t) => t.alive);
    // launch drones from the bay
    const flyers = this.mobs.filter((x) => x.alive && x.flying && x.kind !== 'mothership').length;
    for (let i = 0; i < 2 && flyers + i < MOB_CAP; i++) this.addMob(rng.chance(0.5) ? 'gunner' : 'drone', m.x + (i ? 40 : -40)).y = m.y + 10;
    if (m.cycles % 3 === 0) {
      // the main gun: a heavy beam on one vehicle
      const v = rng.pick(victims);
      const c = v.center();
      this.lasers.push(new Laser(m.x, m.y - 20, c.x, c.y, '#ff78c8', 20, 80));
      this.sfx.satFire();
      this.explode(c.x, c.y, { dmg: 120 + 20 * st, dmgR: 90, explR: 16 }, m, 'laser');
      this.events.push(`The mothership fires its main gun at ${v.name}.`);
    } else {
      // a barrage of bombs on up to three vehicles, aimed to fall on them
      for (const v of rng.shuffle(victims.slice()).slice(0, 3)) {
        for (let k = 0; k < 2; k++) {
          const fall = Math.max(60, v.y - m.y);
          const tFall = Math.sqrt((2 * fall) / GRAV);
          const vx = (v.x - m.x + rng.range(-50, 50)) / tFall;
          const p = new Projectile(this, mobWeapon('shipbomb', st), m, m.x + rng.range(-40, 40), m.y + 4, vx, 0, false);
          p.delay = k * 10 + shots * 3;
          this.projectiles.push(p);
          shots++;
        }
      }
      this.events.push('The mothership drops a barrage.');
    }
    return shots;
  },

  // reinforcements: once a round has gone `reinforceAt` cycles, more drones join every cycle
  reinforce(cycles) {
    if (!this.reinforceAt || cycles < this.reinforceAt) return;
    const st = this.stage();
    const flyers = this.mobs.filter((m) => m.alive && m.flying && m.kind !== 'mothership').length;
    const n = Math.min(MOB_CAP - flyers, 1 + Math.floor((cycles - this.reinforceAt) / 2));
    for (let i = 0; i < n; i++) {
      const edge = rng.chance(0.5) ? 60 : WORLD_W - 60;
      this.addMob(st >= 5 && rng.chance(0.5) ? 'gunner' : st >= 4 && rng.chance(0.25) ? 'gunner' : 'drone', edge + rng.range(-30, 30));
    }
    if (n > 0) {
      this.ui.notice(`${n} more drone${n > 1 ? 's' : ''} incoming.`);
      this.events.push(`${n} drone reinforcement${n > 1 ? 's' : ''} arrive.`);
    }
  },
});
