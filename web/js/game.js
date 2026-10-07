'use strict';
// Game: match state machine (menu -> aim -> resolve -> roundEnd -> shop -> ... -> gameEnd),
// the camera, rules lifted from A3 (armour then HP, autoloader clips, salvos, satellite strikes,
// wind every 12 turns, end-of-round prize money) and rendering.

const CHATTINESS = 0.7; // scales every reaction probability in react(); lower = quieter CPUs
const CAM_EASE = 10; // A3 Constants.CameraEaseSpeed: camera moves 1/10 of the gap per frame
const SALVO_DELAY = 15; // A3 ProjectileFactory._firingDelay (frames between salvo rounds)
const WIND_SCALE = 0.06; // A3 wind is 0..0.5 px/frame^2; scaled down so it nudges rather than dominates

// Proportional-control camera: every frame it closes 1/CAM_EASE of the distance to its target.
// The target is whatever it's focused on (tank, shell, satellite), or a point the player dragged to.
class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.focus = null;
    this.manual = null;
  }

  follow(obj) { this.focus = obj; this.manual = null; }

  target() {
    const f = this.manual || this.focus;
    if (!f) return null;
    return {
      x: clamp(f.x - VIEW_W / 2, 0, WORLD_W - VIEW_W),
      y: clamp(f.y - VIEW_H * 0.55, -1000, WORLD_BOTTOM - VIEW_H),
    };
  }

  update() {
    const t = this.target();
    if (!t) return;
    this.x += (t.x - this.x) / CAM_EASE;
    this.y += (t.y - this.y) / CAM_EASE;
  }

  snap() {
    const t = this.target();
    if (t) { this.x = t.x; this.y = t.y; }
  }
}

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
      case 'ArrowUp': c.up = down; break;
      case 'ArrowDown': c.down = down; break;
      case 'ShiftLeft': case 'ShiftRight': c.fine = down; break;
      case 'Space':
        if (down && !e.repeat) c.charge = true;
        else if (!down) c.charge = false;
        break;
      case 'KeyS': case 'KeyE': case 'Tab': if (down && !e.repeat) this.queue.push({ cycle: 1 }); break;
      case 'KeyQ': if (down && !e.repeat) this.queue.push({ cycle: -1 }); break;
      case 'Enter': if (down && !e.repeat && this.g.phase === 'aim') this.queue.push({ endTurn: true }); else handled = false; break;
      case 'KeyM': if (down && !e.repeat) this.g.toggleMute(); break;
      case 'Escape': if (down && !e.repeat) this.g.togglePause(); break;
      default: handled = false;
    }
    if (handled && this.g.phase !== 'menu') e.preventDefault();
  }
}

class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.sfx = new Sfx();
    this.particles = new Particles();
    this.terrain = new Terrain();
    this.cam = new Camera();
    this.satellite = new Satellite();
    this.tanks = [];
    this.projectiles = [];
    this.drops = [];
    this.lasers = [];
    this.salvo = null;
    this.satSeq = null;
    this.satTarget = null;
    this.wind = { x: 0, y: 0 };
    this.windDir = 0;
    this.windMag = 0;
    this.windMarker = 0;
    this.shake = 0;
    this.phase = 'menu';
    this.round = 0;
    this.rounds = 5;
    this.events = [];
    this.time = 0;
    this.speed = 1;
    this.paused = false;
    this.active = null;
    this.cpu = null;
    this.charging = false;
    this.k = 1;
    this.input = new Input(this);
    this.initDrag();
    this.newEnvironment();
    this.cam.follow({ x: WORLD_W / 2, y: 0.6 * WORLD_BOTTOM });
    this.cam.snap();
  }

  // drag (either mouse button, or touch) pans the camera; it eases back on the next event
  initDrag() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      if (this.phase === 'menu') return;
      this.sfx.unlock();
      this.drag = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const sc = VIEW_W / c.clientWidth;
      this.cam.manual = {
        x: this.drag.cx - (e.clientX - this.drag.x) * sc + VIEW_W / 2,
        y: this.drag.cy - (e.clientY - this.drag.y) * sc + VIEW_H * 0.55,
      };
    });
    const end = () => { this.drag = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  // ------------------------------------------------------------ setup
  newEnvironment() {
    this.terrain.generate();
    this.bg = new Background();
  }

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
    this.awardMult = 1;
    this.satellite = new Satellite();
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
    this.lasers = [];
    this.salvo = null;
    this.satSeq = null;
    this.satTarget = null;
    this.particles.clear();
    this.placeTanks();
    this.setWind();
    this.windMarker = this.windDir;
    this.turnCount = 0;
    this.roundDamage = 0;
    // A3 cycles players in order; the starting player rotates each round
    this.order = this.tanks.map((_, i) => (i + this.round - 1) % this.tanks.length);
    this.turnPtr = -1;
    this.events.push(`Round ${this.round} begins.`);
    this.nextTurn();
    this.cam.snap();
  }

  placeTanks() {
    const n = this.tanks.length;
    const slot = (WORLD_W - 200) / n;
    const xs = this.tanks.map((_, i) => 100 + slot * (i + 0.5) + rng.range(-slot * 0.25, slot * 0.25));
    rng.shuffle(xs);
    this.tanks.forEach((t, i) => {
      this.terrain.flatten(xs[i], 14);
      t.resetRound(xs[i], this.terrain);
    });
  }

  // A3 Wind.SetWind: a random direction avoiding the steep vertical bands, magnitude 0..0.5
  setWind() {
    let d = rng.int(0, 179);
    if (d > 45) d += 90;
    if (d > 225) d += 90;
    this.windDir = rad(d);
    this.windMag = 0.5 * rng.next();
    this.wind = { x: Math.cos(this.windDir) * this.windMag * WIND_SCALE, y: Math.sin(this.windDir) * this.windMag * WIND_SCALE };
  }

  nextTurn() {
    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length <= 1) { this.endRound(); return; }
    do { this.turnPtr = (this.turnPtr + 1) % this.order.length; } while (!this.tanks[this.order[this.turnPtr]].alive);
    const t = this.tanks[this.order[this.turnPtr]];
    this.active = t;
    this.turnSerial++;
    this.turnCount++;
    if (this.turnCount > 1 && this.turnCount % 12 === 0) {
      this.setWind();
      this.events.push('The wind has changed.');
    }
    this.satellite.newTurn();
    t.fuel = TANK_FUEL;
    t.shotsLeft = t.weapon.clip; // autoloaders reload every turn
    t.firedThisTurn = false;
    this.startAim();
  }

  startAim() {
    const t = this.active;
    t.charge = 0;
    t.clampElev();
    this.input.ctl.reset();
    this.input.queue.length = 0;
    this.charging = false;
    this.sfx.chargeStop();
    this.phase = 'aim';
    this.cpu = t.isCpu ? new CpuController(this, t) : null;
    this.cam.follow(t);
    this.ui.turn(t);
  }

  // ------------------------------------------------------------ main loop
  step() {
    this.time += DT;
    this.bg.update(DT, this.wind);
    this.particles.update(DT);
    this.satellite.update();
    for (const t of this.tanks) {
      t.update(DT);
      if (t.alive && t.hp < t.maxHp * 0.3 && Math.random() < 0.04) this.particles.puff(t.x - t.facing * 6, t.y - TANK_H, [90, 90, 100]);
      if (!t.alive && Math.random() < 0.03) this.particles.puff(t.x, t.y - 14, [70, 70, 78]);
    }
    this.stepTanks();
    if (this.phase === 'aim') this.updateAim();
    else if (this.phase === 'resolve') this.updateResolve();
    this.lasers = this.lasers.filter((l) => l.update());
    this.windMarker += (this.windDir - this.windMarker) / 20;
    this.cam.update();
    this.shake *= 0.9;
  }

  stepTanks() {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const gy = this.terrain.hAt(t.x);
      if (t.y < gy - 0.5) {
        t.falling = true;
        t.vy += GRAV;
        t.y += t.vy;
        if (t.y >= gy) { t.y = gy; t.vy = 0; t.falling = false; this.particles.puff(t.x, t.y); }
      } else {
        t.y = gy;
        t.falling = false;
      }
    }
  }

  moveTank(t, dir) {
    t.facing = dir;
    if (t.fuel <= 0) return;
    const nx = t.x + dir * TANK_SPEED;
    if (nx < 20 || nx > WORLD_W - 20) return;
    if ((this.terrain.hAt(t.x) - this.terrain.hAt(nx)) / TANK_SPEED > 1.6) return;
    for (const o of this.tanks) {
      if (o !== t && o.alive && Math.abs(o.x - nx) < TANK_W + 4 && Math.abs(o.x - nx) < Math.abs(o.x - t.x)) return;
    }
    t.x = nx;
    t.fuel--;
  }

  updateAim() {
    const t = this.active;
    let c;
    if (this.cpu) {
      this.cpu.update(DT);
      c = this.cpu.ctl;
    } else {
      c = this.input.ctl;
      for (const a of this.input.queue.splice(0)) {
        if (a.cycle && !t.firedThisTurn) {
          t.cycleWeapon(a.cycle);
          t.shotsLeft = t.weapon.clip;
          this.sfx.click();
        } else if (a.endTurn) {
          this.sfx.chargeStop();
          this.charging = false;
          this.finishTurnEarly();
          return;
        }
      }
    }
    if (c.left) this.moveTank(t, -1);
    if (c.right) this.moveTank(t, 1);
    const rate = c.fine ? 0.2 : 1; // A3: one degree per frame
    if (c.up) t.elev += rate;
    if (c.down) t.elev -= rate;
    t.clampElev();
    const w = t.weapon;
    if (c.charge) {
      if (!this.charging) { this.charging = true; this.sfx.chargeStart(); }
      t.charge = Math.min(w.maxCharge, t.charge + w.maxCharge * 0.005); // A3 Weapon.Update
      this.sfx.chargeUpdate((100 * t.charge) / w.maxCharge);
    } else if (this.charging) {
      this.charging = false;
      this.sfx.chargeStop();
      if (t.charge >= w.maxCharge * 0.03) this.fire(t);
      else t.charge = 0;
    }
  }

  finishTurnEarly() {
    this.events.push(`${this.active.name} ended their turn.`);
    this.nextTurn();
  }

  fire(t) {
    const w = t.weapon;
    t.shotsLeft--;
    t.firedThisTurn = true;
    const dir = t.aimVec();
    this.salvo = { t, w, vx: dir.x * t.charge, vy: dir.y * t.charge, left: w.salvo, timer: 0, first: true };
    t.lastCharge = t.charge / w.maxCharge;
    t.charge = 0;
    t.recoil = 1;
    this.sfx.shot(w);
    this.shake = Math.max(this.shake, 3 + w.dmg / 200);
    this.events.push(`${t.name} fired the ${w.name.replace(/\.$/, "")}.`);
    this.report = { shooter: t, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
    this.satTarget = null;
    const line = this.fireLine(w);
    if (t.isCpu && line && Math.random() < 0.25) this.banter(t, line);
    this.phase = 'resolve';
    this.resolveSteps = 0;
    this.quiet = 0;
    this.ui.turn(t);
  }

  fireLine(w) {
    if (w.sat) return 'fire_satellite';
    if (w.kind === 'laser') return 'fire_laser';
    if (w.kind === 'acid') return 'fire_acid';
    if (w.salvo > 1) return 'fire_salvo';
    if (w.dmg >= 500) return 'fire_heavy';
    return null;
  }

  spawnSalvoRound() {
    const s = this.salvo;
    const t = s.t;
    const m = t.muzzle();
    // dispersion: random jitter on each round's velocity (A3 RandomPoint2D, made symmetric)
    const vx = s.vx + (rng.next() - 0.5) * s.w.disp;
    const vy = s.vy + (rng.next() - 0.5) * s.w.disp;
    const p = new Projectile(this, s.w, t, m.x, m.y, vx, vy, s.first);
    if (s.first) {
      p.rec = [];
      this.cam.follow(p);
    }
    this.particles.muzzle(m.x, m.y, t.aimVec());
    if (!s.first) this.sfx.shot(s.w);
    s.first = false;
    s.left--;
    s.timer = SALVO_DELAY;
    this.projectiles.push(p);
  }

  updateResolve() {
    this.resolveSteps++;
    const s = this.salvo;
    if (s && s.left > 0 && --s.timer <= 0) this.spawnSalvoRound();
    const next = [];
    for (const p of this.projectiles) {
      const alive = p.update();
      if (p.rec && p.age % 3 === 0) p.rec.push(p.x, p.y);
      if (!alive && p.rec) p.owner.lastTrail = p.rec;
      if (alive) next.push(p);
    }
    this.projectiles = next;
    // keep the camera on a live shell while the salvo is in the air
    if (this.cam.focus instanceof Projectile && !next.includes(this.cam.focus) && next.length) this.cam.follow(next[next.length - 1]);
    this.drops = this.drops.filter((d) => d.update());
    const salvoPending = s && s.left > 0;
    if (!next.length && !salvoPending && this.satTarget && !this.satSeq) this.startSatellite();
    if (this.satSeq) this.updateSatellite();
    const busy = next.length || salvoPending || this.drops.length || this.satSeq || this.lasers.length || this.tanks.some((t) => t.alive && t.falling);
    this.quiet = busy ? 0 : this.quiet + 1;
    if (this.quiet > 40 || this.resolveSteps > 60 * 40) {
      this.projectiles.length = this.drops.length = 0;
      this.salvo = this.satSeq = this.satTarget = null;
      this.finishShot();
    }
  }

  finishShot() {
    const t = this.active;
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
    this.react(this.report);
    this.report = null;
    const alive = this.tanks.filter((x) => x.alive).length;
    if (alive <= 1) this.endRound();
    else if (t.alive && t.shotsLeft > 0) this.startAim(); // autoloader: same tank fires again
    else this.nextTurn();
  }

  // ------------------------------------------------------------ satellite
  startSatellite() {
    this.satSeq = { t: 0, target: this.satTarget, owner: this.satTarget.owner };
    this.satTarget = null;
    this.satellite.lookAt(this.satSeq.target);
    this.cam.follow(this.satellite);
    this.sfx.satPrep();
    this.events.push(`MAIA locks onto ${this.satSeq.owner.name}'s mark.`);
  }

  updateSatellite() {
    const s = this.satSeq;
    const sat = this.satellite;
    s.t++;
    sat.charge = s.t < 75 ? clamp((s.t - 25) / 50, 0, 1) : 0;
    if (s.t === 75) {
      const tg = s.target;
      const lens = sat.lens();
      this.lasers.push(new Laser(lens.x, lens.y, tg.x, tg.y, '#fffff0', 22, 90));
      this.sfx.satFire();
      this.explode(tg.x, tg.y, { dmg: sat.damage, dmgR: sat.dmgR, explR: sat.explR }, s.owner, 'laser');
      this.cam.follow({ x: tg.x, y: tg.y });
    }
    if (s.t > 75 + 70) this.satSeq = null;
  }

  // ------------------------------------------------------------ combat rules
  impact(p) {
    const w = p.w;
    if (w.kind === 'laser') {
      // A3 LaserTargetProjectile: the shell marks a point, the gun's laser hits it
      const m = p.owner.alive ? p.owner.muzzle() : { x: p.owner.x, y: p.owner.y - TANK_H };
      const c = RARITY[w.rarity].color;
      this.lasers.push(new Laser(m.x, m.y, p.x, p.y, c === '#ffffff' ? '#e0e0ff' : c, 12, 60));
      this.sfx.laser();
      this.explode(p.x, p.y, w, p.owner, 'laser');
    } else {
      this.explode(p.x, p.y, w, p.owner, w.kind === 'acid' ? 'acid' : 'shell');
      if (w.kind === 'acid') {
        for (let i = 0; i < 30; i++) {
          const a = -Math.PI * (0.1 + 0.8 * Math.random());
          const sp = 2 + Math.random() * 6;
          this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 4, Math.cos(a) * sp, Math.sin(a) * sp, w.acid));
        }
        this.sfx.acid();
      }
    }
    if (w.sat && p.main) this.satTarget = { x: p.x, y: p.y, owner: p.owner };
  }

  explode(x, y, def, owner, palette = 'shell') {
    if (this.report) this.report.blasts.push({ x, y });
    this.terrain.crater(x, def.explR || 10);
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const c = t.center();
      const d = dist(c.x, c.y, x, y);
      if (d < def.dmgR) this.damage(t, def.dmg * (1 - d / def.dmgR), owner);
    }
    this.particles.explosion(x, y, def.dmgR, palette);
    this.sfx.explosion(Math.min(60, (def.explR || 10) + def.dmgR * 0.1));
    this.shake = Math.max(this.shake, Math.min(14, 2 + def.dmgR * 0.05));
  }

  // A3 Character.Damage: armour soaks hits until it is gone, then health takes them
  damage(t, amt, owner, quiet = false) {
    if (!t.alive || amt <= 0) return;
    if (t.armour > 0) t.armour = Math.max(0, t.armour - amt);
    else t.hp -= amt;
    t.flash = 1;
    this.roundDamage += amt;
    if (this.report) {
      const m = owner ? this.report.dmg : this.report.fall;
      m.set(t, (m.get(t) || 0) + amt);
    }
    if (owner && owner !== t) {
      owner.stats.dealt += amt;
      owner.roundDealt += amt;
    }
    if (quiet) {
      t.dmgAcc += amt;
      if (t.dmgAcc >= 5) {
        this.particles.text(t.x, t.y - 40, String(Math.round(t.dmgAcc)), '#c8f0a0');
        t.dmgAcc = 0;
      }
    } else if (amt > 3) {
      this.particles.text(t.x + (Math.random() - 0.5) * 20, t.y - 40, String(Math.round(amt)), '#ffffff', amt > 100);
      this.sfx.hit();
      if (owner && owner !== t) this.events.push(`${owner.name} hit ${t.name} for ${Math.round(amt)}.`);
    }
    if (t.hp <= 0) this.kill(t, owner);
  }

  kill(t, owner) {
    t.hp = 0;
    t.alive = false;
    t.speech = null;
    if (this.report) this.report.kills.push({ victim: t, killer: owner && owner !== t ? owner : null });
    this.particles.explosion(t.x, t.y - 8, 160, 'shell');
    this.sfx.explosion(55);
    this.shake = Math.max(this.shake, 12);
    if (owner && owner !== t) {
      owner.stats.kills++;
      this.events.push(`${owner.name} destroyed ${t.name}!`);
    } else this.events.push(`${t.name} destroyed themselves.`);
  }

  say(tank, text, delay = 0) {
    tank.say(text, 0, delay);
    this.events.push(`${tank.name}: "${text}"`);
    this.ui.chat(tank, text);
  }

  banter(tank, situation, foe, delay = 0) {
    const line = pickTaunt(tank, situation, foe && foe.name);
    if (line) this.say(tank, line, delay);
  }

  // Decide who (if anyone) comments on the shot that just resolved. Roughly 0-2 CPUs speak per
  // shot, with a per-tank cooldown, so it reads as banter rather than a chat log.
  react(rep) {
    if (!rep) return;
    const s = rep.shooter;
    const cands = [];
    let dealt = 0;
    for (const [t, a] of rep.dmg) if (t !== s) dealt += a;
    const self = rep.dmg.get(s) || 0;
    const enemies = this.tanks.filter((t) => t !== s);
    const nearest = (pt) => Math.min(...enemies.map((e) => { const c = e.center(); return dist(pt.x, pt.y, c.x, c.y); }));
    const killedBy = rep.kills.filter((k) => k.killer === s);

    if (s.isCpu && s.alive) {
      if (killedBy.length) cands.push({ tank: s, sit: 'kill', foe: killedBy[0].victim, p: 0.9 });
      else if (dealt >= 80) cands.push({ tank: s, sit: 'hit_big', foe: this.firstVictim(rep, s), p: 0.7 });
      else if (dealt >= 5) cands.push({ tank: s, sit: 'hit', foe: this.firstVictim(rep, s), p: 0.45 });
      else if (self >= 5) cands.push({ tank: s, sit: 'self_hit', p: 0.8 });
      else if (rep.blasts.length) {
        const closest = Math.min(...rep.blasts.map(nearest));
        if (closest <= 140) cands.push({ tank: s, sit: 'miss_close', foe: this.nearestEnemy(rep, s), p: 0.6 });
        else cands.push({ tank: s, sit: 'miss_far', p: 0.28 });
      }
    }
    for (const c of this.tanks) {
      if (c === s || !c.isCpu || !c.alive) continue;
      const took = rep.dmg.get(c) || 0;
      if (took >= 80) cands.push({ tank: c, sit: 'got_hit_big', foe: s, p: 0.65 });
      else if (took >= 5) cands.push({ tank: c, sit: c.hp < c.maxHp * 0.3 ? 'low_hp' : 'got_hit', foe: s, p: 0.6 });
      else if (rep.blasts.some((b) => dist(b.x, b.y, c.x, c.y - 8) <= 160)) cands.push({ tank: c, sit: 'enemy_missed_me', foe: s, p: 0.75 });
    }
    for (const k of rep.kills) {
      if (k.victim.isCpu) cands.push({ tank: k.victim, sit: 'death', foe: k.killer || undefined, p: 1, force: true });
      for (const c of this.tanks) {
        if (c.isCpu && c.alive && c !== k.victim && c !== k.killer) cands.push({ tank: c, sit: 'rival_down', foe: k.victim, p: 0.3 });
      }
    }
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
    const winner = this.tanks.find((t) => t.alive) || null;
    if (winner) {
      winner.wins++;
      this.sfx.win();
      this.events.push(`${winner.name} wins round ${this.round}.`);
    } else this.events.push(`Round ${this.round} ends in mutual destruction.`);
    // A3 CombatGameState: everyone gets 500 + half the round's total damage, scaled up each round
    const award = Math.round(500 + (this.roundDamage / 2) * this.awardMult);
    this.awardMult += 0.08;
    for (const t of this.tanks) t.money += award;
    const last = this.round >= this.rounds;
    this.ui.showRoundEnd({ round: this.round, winner, tanks: this.tanks, award }, last);
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
      const st = this.tanks.slice().sort((a, b) => b.wins - a.wins || b.stats.dealt - a.stats.dealt);
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

  // A3 UI_StatUpgradeButton cost curve
  upgradeCost(level) { return Math.floor(Math.pow(1.9, level * 0.9) * 40) + 300; }
  sellValue(w) { return Math.floor(w.cost / 2); }

  buy(tank, kind, id) {
    if (kind === 'weapon') {
      const w = WEAPON_BY_ID[id];
      if (tank.weapons.includes(id) || tank.weapons.length >= MAX_WEAPONS || tank.money < w.cost) { this.sfx.deny(); return false; }
      tank.money -= w.cost;
      tank.weapons.push(id);
    } else {
      const cost = this.upgradeCost(tank.upgrades[id]);
      if (tank.money < cost) { this.sfx.deny(); return false; }
      tank.money -= cost;
      tank.upgrades[id]++;
    }
    this.sfx.buy();
    return true;
  }

  sell(tank, id) {
    if (tank.weapons.length <= 1) { this.sfx.deny(); return false; }
    tank.weapons = tank.weapons.filter((x) => x !== id);
    tank.weaponIdx = 0;
    tank.money += this.sellValue(WEAPON_BY_ID[id]);
    this.sfx.buy();
    return true;
  }

  autoBuy(t) {
    for (let n = 0; n < 4; n++) {
      const afford = WEAPONS.filter((w) => w.cost <= t.money && !t.weapons.includes(w.id)).sort((a, b) => b.cost - a.cost);
      if (afford.length && t.weapons.length < MAX_WEAPONS && rng.chance(0.75)) {
        t.money -= afford[0].cost;
        t.weapons.push(afford[0].id);
        continue;
      }
      const stat = t.upgrades.hp <= t.upgrades.armour ? 'hp' : 'armour';
      const cost = this.upgradeCost(t.upgrades[stat]);
      if (t.money < cost) break;
      t.money -= cost;
      t.upgrades[stat]++;
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
    const s = k * VIEW_SCALE;
    const cam = this.cam;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.bg.drawSky(ctx);

    // world
    const sx = this.shake > 0.5 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    const sy = this.shake > 0.5 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    ctx.setTransform(s, 0, 0, s, -(cam.x + sx) * s, -(cam.y + sy) * s);
    this.satellite.draw(ctx);
    this.bg.drawRidges(ctx, cam);
    this.terrain.draw(ctx, cam.x, cam.x + VIEW_W);
    const aiming = this.phase === 'aim' ? this.active : null;
    if (aiming && !this.cpu) this.drawGhost(ctx, aiming);
    for (const t of this.tanks) t.draw(ctx, t === aiming);
    for (const d of this.drops) d.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const l of this.lasers) l.draw(ctx);
    this.particles.draw(ctx);

    // snow (screen pixels)
    ctx.setTransform(k, 0, 0, k, 0, 0);
    this.bg.drawSnow(ctx);

    // HUD in the original's 1600x900 screen units
    ctx.setTransform(s, 0, 0, s, 0, 0);
    if (this.phase !== 'menu') this.drawHud(ctx);
  }

  drawGhost(ctx, t) {
    if (!t.lastTrail || t.lastTrail.length < 4) return;
    ctx.fillStyle = t.color;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < t.lastTrail.length; i += 2) sq(ctx, t.lastTrail[i], t.lastTrail[i + 1], 5);
    ctx.globalAlpha = 1;
  }

  drawHud(ctx) {
    const cam = this.cam;
    const sat = this.satellite;
    // satellite caption (A3 Satellite.Draw)
    if (sat.y - cam.y > -80) {
      ctx.font = '18px "Maven Pro", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sat.name}-Class Low Orbit Ion Cannon`, Math.round(sat.x - cam.x), Math.round(sat.y - cam.y - 110));
      ctx.fillText(`Level: ${sat.level}`, Math.round(sat.x - cam.x), Math.round(sat.y - cam.y - 90));
    }
    const live = this.phase === 'aim' ? this.active : null;
    for (const t of this.tanks) t.drawLabel(ctx, t.x - cam.x, t.y - cam.y, t === live);
    this.particles.drawText(ctx, cam);
    for (const t of this.tanks) t.drawSpeech(ctx, t.x - cam.x, t.y - cam.y);
    // shells above the view
    ctx.fillStyle = '#ffffff';
    for (const p of this.projectiles) {
      if (p.y < cam.y) {
        const x = clamp(p.x - cam.x, 10, VIEW_W - 10);
        sq(ctx, x, 8, 6);
        sq(ctx, x, 16, 12);
      }
    }
    this.drawMinimap(ctx);
    this.drawWindMarker(ctx);
    if (this.active && this.phase !== 'roundEnd') this.drawBars(ctx, this.active);
  }

  // A3 UI_Minimap: a line at the top right with a dot per tank
  drawMinimap(ctx) {
    const x0 = 1250, y0 = 80, w = 300, h = 20;
    const mx = (x) => x0 + (w * clamp(x, 0, WORLD_W)) / WORLD_W;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x0, y0 + h / 2 - 1, w, 2);
    ctx.fillRect(x0 - 2, y0, 4, h);
    ctx.fillRect(x0 + w - 2, y0, 4, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(mx(this.cam.x), y0 + 3, (w * VIEW_W) / WORLD_W, h - 6);
    for (const t of this.tanks) {
      if (!t.alive) continue;
      ctx.fillStyle = t.color;
      sq(ctx, mx(t.x), y0 + h / 2, 8);
    }
    const box = (x, s, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x - s / 2, y0 + h / 2 - s / 2, s, 2);
      ctx.fillRect(x - s / 2, y0 + h / 2 + s / 2 - 2, s, 2);
      ctx.fillRect(x - s / 2, y0 + h / 2 - s / 2, 2, s);
      ctx.fillRect(x + s / 2 - 2, y0 + h / 2 - s / 2, 2, s);
    };
    if (this.active) box(mx(this.active.x), 16, 'purple');
    const shell = this.projectiles[0];
    if (shell) box(mx(shell.x), 10, 'orange');
  }

  // A3 UI_WindMarker, reinterpreted as a windsock: a mast with a striped sock of squares that
  // points downwind, gets longer with strength and droops when the wind is light
  drawWindMarker(ctx) {
    const mx = 790, top = 38;
    ctx.fillStyle = '#4a4a5c';
    ctx.fillRect(mx - 2, top, 4, 54);
    ctx.fillRect(mx - 8, top + 52, 16, 4);
    const strength = this.windMag / 0.5;
    const n = 2 + Math.round(strength * 4);
    const dx = Math.cos(this.windMarker);
    const dy = Math.sin(this.windMarker);
    const sway = Math.sin(this.time * 6) * (1 + strength * 2);
    for (let i = 0; i < n; i++) {
      const d = 12 + i * 13;
      const droop = (1 - strength) * i * i * 1.6;
      ctx.fillStyle = i % 2 ? '#f4f4f8' : '#d8402c';
      sq(ctx, mx + dx * d, top + 6 + dy * d + droop + (i ? sway * (i / n) : 0), 16 - i * 1.4);
    }
  }

  // A3 UI_Combat: charge bar (with last-charge tick) and fuel bar, bottom right
  drawBars(ctx, t) {
    const x0 = 1120, w = 400;
    ctx.fillStyle = '#000';
    ctx.fillRect(x0, 801, w, 10);
    ctx.fillRect(x0 - 2, 790, 4, 32);
    ctx.fillRect(x0 + w - 2, 790, 4, 32);
    ctx.fillStyle = 'orange';
    ctx.fillRect(x0 + 2, 796, Math.round((w - 4) * (t.charge / t.weapon.maxCharge)), 20);
    if (t.lastCharge > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.round(x0 + w * t.lastCharge) - 1, 790, 2, 32);
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(x0 - 2, 828, 4, 20);
    ctx.fillRect(x0 + w - 2, 828, 4, 20);
    ctx.fillStyle = 'steelblue';
    ctx.fillRect(x0 + 2, 834, Math.round((w - 4) * (t.fuel / TANK_FUEL)), 8);
  }
}
