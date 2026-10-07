'use strict';
// Game: owns the match state machine (menu -> aim -> resolve -> roundEnd -> shop -> ... -> gameEnd),
// the fixed-timestep simulation, damage/economy rules and canvas rendering.

class Input {
  constructor(game) {
    this.g = game;
    this.ctl = new Ctl();
    this.queue = [];
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.ctl.reset());
  }

  key(e, down) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const c = this.ctl;
    let handled = true;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': c.left = down; break;
      case 'ArrowRight': case 'KeyD': c.right = down; break;
      case 'ArrowUp': case 'KeyW': c.up = down; break;
      case 'ArrowDown': case 'KeyS': c.down = down; break;
      case 'ShiftLeft': case 'ShiftRight': c.fine = down; break;
      case 'Space':
        if (down && !e.repeat) c.charge = true;
        else if (!down) c.charge = false;
        break;
      case 'KeyQ': if (down && !e.repeat) this.queue.push({ cycle: -1 }); break;
      case 'KeyE': case 'Tab': if (down && !e.repeat) this.queue.push({ cycle: 1 }); break;
      case 'KeyM': if (down && !e.repeat) this.g.toggleMute(); break;
      case 'Escape': if (down && !e.repeat) this.g.togglePause(); break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          if (down && !e.repeat) this.queue.push({ slot: +e.code.slice(5) - 1 });
        } else handled = false;
    }
    if (handled && this.g.phase !== 'menu') e.preventDefault();
  }
}

// scales every reaction probability in Game.react(); lower = quieter CPUs
const CHATTINESS = 0.7;

class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.sfx = new Sfx();
    this.particles = new Particles();
    this.terrain = new Terrain();
    this.bg = null;
    this.tanks = [];
    this.projectiles = [];
    this.drops = [];
    this.beams = [];
    this.wind = 0;
    this.shake = 0;
    this.phase = 'menu';
    this.round = 0;
    this.rounds = 3;
    this.events = [];
    this.time = 0;
    this.speed = 1;
    this.paused = false;
    this.active = null;
    this.cpu = null;
    this.charging = false;
    this.k = 1;
    this.input = new Input(this);
    this.newEnvironment();
  }

  // ------------------------------------------------------------ setup
  newEnvironment() {
    const p = rng.pick(PRESETS);
    this.bg = new Background(p);
    this.terrain.setPalette({ rockTop: p.rockTop, rockBot: p.rockBot, snow: p.snow });
    this.terrain.generate();
  }

  // integer backing scale + no smoothing keeps every square's edges hard
  resize(cssWidth) {
    this.k = clamp(Math.round((cssWidth * (window.devicePixelRatio || 1)) / W), 1, 3);
    this.canvas.width = W * this.k;
    this.canvas.height = H * this.k;
    this.ctx.imageSmoothingEnabled = false;
  }

  startMatch(configs, rounds) {
    this.sfx.unlock();
    this.turnSerial = 0;
    this.report = null;
    this.tanks = configs.map((c, i) => new Tank(i, c));
    this.rounds = rounds;
    this.round = 0;
    this.events = [];
    this.ui.showHud(true);
    this.startRound();
  }

  startRound() {
    this.round++;
    this.newEnvironment();
    this.projectiles = [];
    this.drops = [];
    this.beams = [];
    this.particles.clear();
    this.placeTanks();
    this.wind = rng.range(-0.012, 0.012);
    this.turnCount = 0;
    this.order = rng.shuffle(this.tanks.map((_, i) => i));
    this.turnPtr = -1;
    this.events.push(`Round ${this.round} begins on the ${this.bg.preset.name.toLowerCase()} range.`);
    this.nextTurn();
  }

  placeTanks() {
    const n = this.tanks.length;
    const slot = (W - 120) / n;
    const xs = this.tanks.map((_, i) => 60 + slot * (i + 0.5) + rng.range(-slot * 0.2, slot * 0.2));
    rng.shuffle(xs);
    this.tanks.forEach((t, i) => {
      this.terrain.flatten(xs[i], 16);
      t.resetRound(xs[i], this.terrain);
    });
  }

  nextTurn() {
    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length <= 1) { this.endRound(); return; }
    do { this.turnPtr = (this.turnPtr + 1) % this.order.length; } while (!this.tanks[this.order[this.turnPtr]].alive);
    const t = this.tanks[this.order[this.turnPtr]];
    this.active = t;
    this.turnSerial++;
    if (this.turnCount++ > 0) this.wind = clamp(this.wind + rng.range(-0.005, 0.005), -0.012, 0.012);
    t.fuel = t.maxFuel;
    t.power = 0;
    t.clampElev();
    this.input.ctl.reset();
    this.input.queue.length = 0;
    this.charging = false;
    this.sfx.chargeStop();
    this.phase = 'aim';
    this.cpu = t.isCpu ? new CpuController(this, t) : null;
    this.ui.turn(t);
  }

  // ------------------------------------------------------------ main loop
  step() {
    this.time += DT;
    this.bg.update(DT, this.wind);
    this.particles.update(DT);
    for (const t of this.tanks) {
      t.update(DT);
      if (t.alive && t.hp < 35 && Math.random() < 0.04) this.particles.smoke(t.x, t.y - 10, 3);
    }
    this.stepTanks();
    if (this.phase === 'aim') this.updateAim(DT);
    else if (this.phase === 'resolve') this.updateResolve();
    this.shake *= 0.9;
  }

  stepTanks() {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const gy = this.terrain.hAt(t.x);
      if (t.y < gy - 0.5) {
        if (!t.falling) { t.falling = true; t.fallFrom = t.y; t.vy = 0; }
        t.vy += 0.22;
        t.y += t.vy;
        if (t.y >= gy) { t.y = gy; this.land(t); }
      } else {
        if (t.falling) this.land(t);
        t.y = gy;
      }
      t.drawY = t.falling ? t.y : this.terrain.blockTop(t.x);
    }
  }

  land(t) {
    const fall = t.y - t.fallFrom;
    t.falling = false;
    t.vy = 0;
    if (fall > 4) { this.sfx.thud(); this.particles.dust(t.x, t.y, 8); }
    if (fall > 35) this.damage(t, (fall - 35) * 0.4, null);
  }

  moveTank(t, dir, dt) {
    t.facing = dir;
    if (t.fuel <= 0) return;
    const step = 38 * dt;
    const nx = t.x + dir * step;
    if (nx < 14 || nx > W - 14) return;
    if ((this.terrain.hAt(t.x) - this.terrain.hAt(nx)) / step > 1.4) return;
    for (const o of this.tanks) {
      if (o !== t && o.alive && Math.abs(o.x - nx) < 24 && Math.abs(o.x - nx) < Math.abs(o.x - t.x)) return;
    }
    t.x = nx;
    t.fuel = Math.max(0, t.fuel - step);
  }

  updateAim(dt) {
    const t = this.active;
    let c;
    if (this.cpu) {
      this.cpu.update(dt);
      c = this.cpu.ctl;
    } else {
      c = this.input.ctl;
      const q = this.input.queue.splice(0);
      for (const a of q) {
        if (a.cycle) { t.cycleWeapon(a.cycle); this.sfx.click(); }
        else if (a.slot !== undefined) {
          const w = t.ownedWeapons()[a.slot];
          if (w) { t.selectWeapon(w.id); this.sfx.click(); }
        }
      }
    }
    if (c.left) this.moveTank(t, -1, dt);
    if (c.right) this.moveTank(t, 1, dt);
    const rate = (c.fine ? 10 : 40) * dt;
    if (c.up) t.elev += rate;
    if (c.down) t.elev -= rate;
    t.clampElev();
    if (c.charge) {
      if (!this.charging) { this.charging = true; this.sfx.chargeStart(); }
      t.power = Math.min(100, t.power + 55 * dt);
      this.sfx.chargeUpdate(t.power);
    } else if (this.charging) {
      this.charging = false;
      this.sfx.chargeStop();
      if (t.power >= 5) this.fire(t);
      else t.power = 0;
    }
  }

  fire(t) {
    const w = t.weapon;
    if (!(t.ammo[w.id] > 0)) return;
    if (!w.infinite) t.ammo[w.id]--;
    const m = t.muzzle();
    const v = t.power * SPEED_PER_POWER * w.speed;
    const a = rad(t.elev);
    const p = new Projectile(this, w, t, m.x, m.y, t.facing * v * Math.cos(a), -v * Math.sin(a));
    p.rec = [];
    this.projectiles.push(p);
    const dir = t.aimVec();
    this.particles.muzzle(m.x, m.y, Math.atan2(dir.y, dir.x));
    this.sfx.shot(w);
    this.shake = Math.max(this.shake, 2 + t.power * 0.03);
    t.recoil = 1;
    t.lastPower = t.power;
    t.power = 0;
    this.events.push(`${t.name} fired the ${w.name}.`);
    this.report = { shooter: t, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
    if (t.isCpu && TAUNTS.any['fire_' + w.id] && Math.random() < 0.25) this.banter(t, 'fire_' + w.id);
    this.phase = 'resolve';
    this.resolveSteps = 0;
    this.quiet = 0;
    this.ui.turn(t);
  }

  updateResolve() {
    this.resolveSteps++;
    // projectiles may spawn others (cluster split) mid-update: queue those instead of
    // pushing into the array being rebuilt
    const next = [];
    this.spawned = [];
    for (const p of this.projectiles) {
      const alive = p.update();
      if (p.rec && p.age % 3 === 0) p.rec.push(p.x, p.y);
      if (!alive && p.rec) p.owner.lastTrail = p.rec;
      if (alive) next.push(p);
    }
    this.projectiles = next.concat(this.spawned);
    this.spawned = [];
    this.drops = this.drops.filter((d) => d.update());
    this.beams = this.beams.filter((b) => b.update());
    const busy = this.projectiles.length || this.drops.length || this.beams.length || this.tanks.some((t) => t.alive && t.falling);
    this.quiet = busy ? 0 : this.quiet + 1;
    if (this.quiet > 45 || this.resolveSteps > 60 * 30) {
      this.projectiles.length = this.drops.length = this.beams.length = 0;
      this.finishTurn();
    }
  }

  finishTurn() {
    const t = this.active;
    if (t && t.ammo[t.weaponId] <= 0) t.weaponId = 'howitzer';
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
    this.react(this.report);
    this.report = null;
    this.nextTurn();
  }

  // ------------------------------------------------------------ combat rules
  impact(p, r) {
    const w = p.w;
    if (w.kind === 'marker') {
      this.particles.explosion(p.x, p.y, 8, [255, 140, 220]);
      this.beams.push(new Beam(this, w, p.owner, p.x));
      return;
    }
    if (w.kind === 'cluster') {
      const s = w.sub;
      this.explode(p.x, p.y, { dmg: s.dmg * 1.8, blast: s.blast * 1.5, dmgR: s.dmgR * 1.4 }, p.owner);
      return;
    }
    this.explode(p.x, p.y, w, p.owner);
    if (w.kind === 'acid') {
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI * (0.08 + 0.84 * Math.random());
        const s = 1.2 + Math.random() * 3.2;
        this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 2, Math.cos(a) * s, Math.sin(a) * s));
      }
      this.sfx.acid();
    }
  }

  clusterSplit(p) {
    const s = p.w.sub;
    this.particles.add({ type: 'fireball', x: p.x, y: p.y, life: 0.2, r: 16, color: [255, 200, 120] });
    this.sfx.click();
    const def = { id: 'bomblet', kind: 'shell', grav: 1, wind: 1, speed: 1, color: '#ffcf8a', dmg: s.dmg, blast: s.blast, dmgR: s.dmgR };
    for (let i = 0; i < s.count; i++) {
      // the centre bomblet keeps the parent's exact velocity so it lands where the shell would have
      const spread = (i - (s.count - 1) / 2) * 0.45;
      const jitter = i === (s.count - 1) / 2 ? 0 : (Math.random() - 0.3) * 0.4;
      this.spawned.push(new Projectile(this, def, p.owner, p.x, p.y, p.vx + spread, p.vy + jitter));
    }
  }

  explode(x, y, def, owner) {
    if (this.report) this.report.blasts.push({ x, y });
    this.terrain.crater(x, y, def.blast);
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const c = t.center();
      const d = dist(c.x, c.y, x, y);
      if (d < def.dmgR + 8) {
        const amt = def.dmg * clamp(1 - (d - 6) / def.dmgR, 0, 1);
        if (amt >= 1) this.damage(t, amt, owner);
      }
    }
    this.particles.explosion(x, y, def.blast * 0.9 + 6);
    this.sfx.explosion(def.blast);
    this.shake = Math.max(this.shake, Math.min(12, def.blast * 0.22));
  }

  beamStrike(b) {
    const half = b.w.beamHalf;
    this.sfx.beamFire();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const dx = Math.abs(t.x - b.x);
      const amt = b.w.dmg * (dx <= half ? 1 : clamp(1 - (dx - half) / 40, 0, 1));
      if (amt >= 1) this.damage(t, amt, b.owner);
    }
    const gy = this.terrain.hAt(b.x);
    if (this.report) this.report.blasts.push({ x: b.x, y: gy });
    this.terrain.shaft(b.x, half - 1, 85);
    this.particles.explosion(b.x, gy, 30, [255, 150, 225]);
    for (let i = 0; i < 40; i++) {
      this.particles.add({
        type: 'spark', x: b.x + (Math.random() - 0.5) * 12, y: gy - Math.random() * 120,
        vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 3, g: 0.05, life: 0.6, size: 1.6, color: [255, 190, 240],
      });
    }
    this.shake = Math.max(this.shake, 9);
  }

  damage(t, amt, owner, quiet = false) {
    if (!t.alive || amt <= 0) return;
    t.hp -= amt;
    t.flash = 1;
    if (this.report) {
      const m = owner ? this.report.dmg : this.report.fall;
      m.set(t, (m.get(t) || 0) + amt);
    }
    if (owner && owner !== t) {
      owner.stats.dealt += amt;
      owner.roundDealt += amt;
      owner.cash += amt * 3;
      owner.roundEarned += amt * 3;
    }
    if (quiet) {
      t.dmgAcc += amt;
      if (t.dmgAcc >= 6) {
        this.particles.text(t.x, t.y - 42, '-' + Math.round(t.dmgAcc), '#b6f27a');
        t.dmgAcc = 0;
      }
    } else {
      this.particles.text(t.x, t.y - 42, '-' + Math.round(amt), '#ff9d8a', amt > 40);
      this.sfx.hit();
      if (owner && owner !== t) this.events.push(`${owner.name} hit ${t.name} for ${Math.round(amt)}.`);
      else if (!owner) this.events.push(`${t.name} took ${Math.round(amt)} from a fall.`);
    }
    if (t.hp <= 0) this.kill(t, owner);
  }

  kill(t, owner) {
    t.hp = 0;
    t.alive = false;
    t.speech = null;
    if (this.report) this.report.kills.push({ victim: t, killer: owner && owner !== t ? owner : null });
    this.particles.explosion(t.x, t.y - 6, 36, [255, 170, 70]);
    this.particles.explosion(t.x, t.y - 14, 20, [255, 120, 60]);
    this.sfx.explosion(45);
    this.shake = Math.max(this.shake, 10);
    if (owner && owner !== t) {
      owner.stats.kills++;
      owner.cash += 300;
      owner.roundEarned += 300;
      this.particles.text(t.x, t.y - 55, '+$300', '#ffe27a', true);
      this.events.push(`${owner.name} destroyed ${t.name}!`);
    } else {
      this.events.push(`${t.name} destroyed themselves.`);
    }
  }

  say(tank, text, delay = 0) {
    tank.say(text, 0, delay);
    this.events.push(`${tank.name}: "${text}"`);
    this.ui.chat(tank, text);
  }

  // CPU tank says a canned line for `situation` (no-op if it has none)
  banter(tank, situation, foe, delay = 0) {
    const line = pickTaunt(tank, situation, foe && foe.name);
    if (line) this.say(tank, line, delay);
  }

  // Decide who (if anyone) comments on the shot that just resolved. Roughly 0-2 CPUs speak per
  // turn, with a per-tank cooldown, so it reads as banter rather than a chat log.
  react(rep) {
    if (!rep) return;
    const s = rep.shooter;
    const cands = []; // {tank, sit, foe, p, force}
    let dealt = 0;
    for (const [t, a] of rep.dmg) if (t !== s) dealt += a;
    const self = rep.dmg.get(s) || 0;
    const enemies = this.tanks.filter((t) => t !== s);
    const nearest = (pt) => Math.min(...enemies.map((e) => { const c = e.center(); return dist(pt.x, pt.y, c.x, c.y); }));
    const killedBy = rep.kills.filter((k) => k.killer === s);

    if (s.isCpu && s.alive) {
      if (killedBy.length) cands.push({ tank: s, sit: 'kill', foe: killedBy[0].victim, p: 0.9 });
      else if (dealt >= 40) cands.push({ tank: s, sit: 'hit_big', foe: this.firstVictim(rep, s), p: 0.7 });
      else if (dealt >= 3) cands.push({ tank: s, sit: 'hit', foe: this.firstVictim(rep, s), p: 0.45 });
      else if (self >= 5) cands.push({ tank: s, sit: 'self_hit', p: 0.8 });
      else if (!rep.blasts.length) { /* shot flew off the map: say nothing */ }
      else {
        const closest = Math.min(...rep.blasts.map(nearest));
        if (closest <= 85) cands.push({ tank: s, sit: 'miss_close', foe: this.nearestEnemy(rep, s), p: 0.6 });
        else cands.push({ tank: s, sit: 'miss_far', p: 0.28 });
      }
    }
    for (const c of this.tanks) {
      if (c === s || !c.isCpu) continue;
      const took = rep.dmg.get(c) || 0;
      if (c.alive) {
        if (took >= 40) cands.push({ tank: c, sit: 'got_hit_big', foe: s, p: 0.65 });
        else if (took >= 3) cands.push({ tank: c, sit: c.hp < c.maxHp * 0.3 ? 'low_hp' : 'got_hit', foe: s, p: 0.6 });
        else if (rep.blasts.some((b) => dist(b.x, b.y, c.x, c.y - 7) <= 95)) cands.push({ tank: c, sit: 'enemy_missed_me', foe: s, p: 0.75 });
        else if ((rep.fall.get(c) || 0) >= 5) cands.push({ tank: c, sit: 'fall', p: 0.5 });
      }
    }
    if (s.isCpu && s.alive && (rep.fall.get(s) || 0) >= 5) cands.push({ tank: s, sit: 'fall', p: 0.5 });
    for (const k of rep.kills) {
      if (k.victim.isCpu) cands.push({ tank: k.victim, sit: 'death', foe: k.killer || undefined, p: 1, force: true });
      for (const c of this.tanks) {
        if (c.isCpu && c.alive && c !== k.victim && c !== k.killer) cands.push({ tank: c, sit: 'rival_down', foe: k.victim, p: 0.3 });
      }
    }
    // dead tanks have the last word (chat log only); the rest are limited to two live speakers
    let speakers = 0;
    const used = new Set();
    for (const c of rng.shuffle(cands.slice()).sort((a, b) => (b.force ? 1 : 0) - (a.force ? 1 : 0))) {
      if (used.has(c.tank)) continue;
      if (!c.force && (speakers >= 2 || this.turnSerial - (c.tank.lastSpoke || -9) < 3)) continue;
      if (!c.force && Math.random() > c.p * CHATTINESS) continue;
      used.add(c.tank);
      c.tank.lastSpoke = this.turnSerial;
      this.banter(c.tank, c.sit, c.foe, c.force ? 0 : 0.5 + speakers * 1.1);
      if (!c.force) speakers++;
    }
  }

  firstVictim(rep, shooter) {
    for (const [t] of rep.dmg) if (t !== shooter) return t;
    return undefined;
  }

  nearestEnemy(rep, shooter) {
    const b = rep.blasts[rep.blasts.length - 1];
    let best;
    let bd = Infinity;
    for (const e of this.tanks) {
      if (e === shooter) continue;
      const d = dist(b.x, b.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------ round / shop flow
  endRound() {
    this.phase = 'roundEnd';
    this.sfx.chargeStop();
    const alive = this.tanks.filter((t) => t.alive);
    const winner = alive[0] || null;
    for (const t of this.tanks) {
      t.cash += 400;
      t.roundEarned += 400;
    }
    if (winner) {
      winner.wins++;
      winner.cash += 600;
      winner.roundEarned += 600;
      this.sfx.win();
      this.events.push(`${winner.name} wins round ${this.round}.`);
    } else this.events.push(`Round ${this.round} ends in mutual destruction.`);
    for (const t of this.tanks) t.cash = Math.round(t.cash);
    const last = this.round >= this.rounds;
    this.ui.showRoundEnd({ round: this.round, winner, tanks: this.tanks }, last);
    // round-end banter from CPUs (the dead can still talk)
    const cpus = this.tanks.filter((t) => t.isCpu);
    if (winner) {
      if (winner.isCpu) this.ui.addQuip(winner, pickTaunt(winner, 'round_win'));
      for (const t of rng.shuffle(cpus.filter((c) => c !== winner)).slice(0, 2)) this.ui.addQuip(t, pickTaunt(t, 'round_lose', winner.name));
    } else if (cpus.length) {
      this.ui.addQuip(cpus[0], pickTaunt(cpus[0], 'round_draw'));
    }
  }

  afterRoundEnd() {
    if (this.round >= this.rounds) {
      const st = this.tanks.slice().sort((a, b) => b.wins - a.wins || b.cash - a.cash);
      this.phase = 'gameEnd';
      this.ui.showHud(false);
      this.ui.showGameEnd(st);
      if (st[0].isCpu && st[0].wins > (st[1] ? st[1].wins : -1)) this.ui.addEndQuip(st[0], pickTaunt(st[0], 'match_win'));
      return;
    }
    this.phase = 'shop';
    for (const t of this.tanks.filter((x) => x.isCpu)) this.autoBuy(t);
    this.shopQueue = this.tanks.filter((t) => !t.isCpu);
    this.nextShop();
  }

  nextShop() {
    const t = this.shopQueue.shift();
    if (!t) { this.ui.hideShop(); this.startRound(); return; }
    this.ui.showShop(t, () => this.nextShop());
  }

  buy(tank, kind, id) {
    let item;
    let cost;
    if (kind === 'weapon') {
      item = WEAPON_BY_ID[id];
      cost = item.cost;
    } else {
      item = UPGRADES.find((u) => u.id === id);
      cost = item.cost;
      if (tank.upgrades[id] >= item.max) return false;
    }
    if (tank.cash < cost) { this.sfx.deny(); return false; }
    tank.cash -= cost;
    if (kind === 'weapon') tank.ammo[id] += item.pack;
    else tank.upgrades[id]++;
    this.sfx.buy();
    return true;
  }

  autoBuy(t) {
    const shopW = WEAPONS.filter((w) => w.cost > 0).sort((a, b) => b.cost - a.cost);
    for (let n = 0; n < 3; n++) {
      if (rng.chance(0.3)) {
        const u = rng.pick(UPGRADES);
        if (t.upgrades[u.id] < u.max && t.cash >= u.cost) { t.cash -= u.cost; t.upgrades[u.id]++; continue; }
      }
      const afford = shopW.filter((w) => w.cost <= t.cash);
      if (!afford.length) break;
      const w = afford[Math.floor(Math.pow(rng.next(), 2) * afford.length)];
      t.cash -= w.cost;
      t.ammo[w.id] += w.pack;
    }
  }

  // ------------------------------------------------------------ misc controls
  toggleMute() {
    this.sfx.unlock();
    this.sfx.setMuted(!this.sfx.muted);
    this.ui.syncMute();
  }

  togglePause() {
    if (this.phase === 'menu' || this.phase === 'gameEnd') return;
    this.paused = !this.paused;
    this.ui.showPause(this.paused);
  }

  // ------------------------------------------------------------ frame
  frame(dtReal) {
    if (!this.paused) {
      this.acc = (this.acc || 0) + Math.min(0.1, dtReal) * this.speed;
      let n = 0;
      while (this.acc >= DT && n < 800) { this.step(); this.acc -= DT; n++; }
    }
    this.render();
    this.ui.updateHud(this);
  }

  render() {
    const ctx = this.ctx;
    const k = this.k;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.shake > 0.5) ctx.translate(Math.round((Math.random() - 0.5) * this.shake * 2), Math.round((Math.random() - 0.5) * this.shake * 2));
    this.bg.drawBack(ctx);
    this.terrain.render();
    ctx.drawImage(this.terrain.canvas, 0, 0);

    const active = this.phase === 'aim' ? this.active : null;
    if (active && !this.cpu) this.drawGhost(ctx, active);
    for (const t of this.tanks) t.draw(ctx);
    if (active) this.drawAim(ctx, active);
    for (const b of this.beams) b.draw(ctx);
    for (const d of this.drops) d.draw(ctx);
    for (const p of this.projectiles) {
      p.draw(ctx);
      if (p.y < -6) this.drawOffscreen(ctx, p);
    }
    this.particles.draw(ctx);
    this.bg.drawSnow(ctx);
    // labels and text last so they stay readable
    for (const t of this.tanks) t.drawLabel(ctx, t === active || (this.phase === 'resolve' && t === this.active), this.time);
    this.particles.drawText(ctx);
    for (const t of this.tanks) t.drawSpeech(ctx);
    ctx.restore();
  }

  drawGhost(ctx, t) {
    if (!t.lastTrail || t.lastTrail.length < 4) return;
    ctx.fillStyle = t.color;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < t.lastTrail.length; i += 2) sq(ctx, t.lastTrail[i], t.lastTrail[i + 1], 3);
    ctx.globalAlpha = 1;
  }

  drawOffscreen(ctx, p) {
    const x = clamp(p.x, 8, W - 8);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = clamp(1 + p.y / 400, 0.4, 1);
    sq(ctx, x, 5, 3);
    sq(ctx, x, 9, 6);
    sq(ctx, x, 14, 9);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px Verdana, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(-p.y) + 'm', Math.round(x), 30);
  }

  drawAim(ctx, t) {
    const w = t.weapon;
    const pv = { x: t.x, y: (t.drawY ?? t.y) - 13 };
    // allowed elevation range: a dotted arc of squares
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let e = w.elevMin; e <= w.elevMax; e += 6) {
      const v = t.aimVec(e);
      sq(ctx, pv.x + v.x * 32, pv.y + v.y * 32, 2);
    }
    const v = t.aimVec();
    if (t.power > 0) {
      const frac = t.power / 100;
      ctx.fillStyle = `hsl(${120 - frac * 120},85%,55%)`;
      for (let d = 24; d <= 24 + t.power * 0.6; d += 5) sq(ctx, pv.x + v.x * d, pv.y + v.y * d, 3);
    }
    if (t.lastPower > 0 && !this.cpu) {
      const d = 24 + t.lastPower * 0.6;
      ctx.fillStyle = '#ffffff';
      sq(ctx, pv.x + v.x * d, pv.y + v.y * d, 5);
    }
  }
}
