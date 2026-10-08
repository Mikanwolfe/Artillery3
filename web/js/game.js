'use strict';
// Game: match state machine (menu -> aim -> resolve -> roundEnd -> shop -> ... -> gameEnd),
// the camera, rules lifted from A3 (armour then HP, autoloader clips, salvos, satellite strikes,
// wind every 12 turns, end-of-round prize money) and rendering.

const CHATTINESS = 0.7; // scales every reaction probability in react(); lower = quieter CPUs
const CAM_EASE = 10; // A3 Constants.CameraEaseSpeed: camera moves 1/10 of the gap per frame
const SALVO_DELAY = 15;
const TREE_RAM_DMG = 6; // + 3 per tree size: driving through a tree knocks it down but hurts // A3 ProjectileFactory._firingDelay (frames between salvo rounds)
// Aim guide (human players): a dotted line along the barrel that fades out; while Space is held it
// becomes the predicted arc for the current charge, still fading after a set distance.
const AIM_LINE_LEN = 260;
const AIM_ARC_LEN = 650;
const AIM_GUIDE_WIND = false; // true = the guide also bends with the wind (much easier)
const WIND_SCALE = 0.06;
const WIND_FULL = 0.5 * WIND_SCALE; // game.wind's magnitude at A3's strongest wind
const UPGRADE_PER_POINT = 6; // rebalanced Health++ / Armour++: $ per point of health or armour
// Repair kits: bought in the shop, used with R instead of firing that turn
const REPAIR_COST = 450;
const REPAIR_MAX = 3;
const REPAIR_FRAC = 0.4; // of max health and of max armour
// Prize money counts only damage that actually came off a target (no overkill, no damage past
// armour), and acid drip at a reduced rate: acid's many small hits used to flood the payout.
const ACID_PAY_RATE = 0.5;
const SAVE_KEY = 'a3.save';
const CRATE_CHANCE = 0.3; // chance of a supply drop at the start of each turn (after the first few)
const CRATE_MAX = 2;
// Smoke traces: every shell leaves a line of grey squares that drift with the wind and fade
const TRACE_LIFE = 360; // frames (~6 s)
const TRACE_MAX = 5000;
const TRACE_STEP = 7; // world units between puffs along a shell's path (jittered), so fast shells don't leave dashes
// Arcade bonuses that reward high, plunging shots (shells, guns and acid; not lasers):
//  - kinetic: extra damage from impact speed, packed into a tighter radius than the blast
//  - altitude: the whole blast is scaled up by how far the shell fell from the top of its arc
const KINETIC_MIN_SPEED = 25; // px/frame at impact before kinetic damage starts
const KINETIC_PER_SPEED = 0.022; // + this fraction of the weapon's damage per px/frame above that
const KINETIC_RADIUS = 0.4; // of the weapon's damage radius
const ALTITUDE_RATE = 0.0006; // + this fraction of damage per world unit fallen from the apex
const ALTITUDE_MAX = 0.5; // at most +50%, and only for a shot fired straight up (see altitudeBonus)
// Falls: a vehicle whose ground is blown away (or slides away) takes damage past a short drop
const FALL_SAFE = 30;
const FALL_DMG = 0.8; // per world unit beyond FALL_SAFE
// Avalanches: after a blast, loose snow on slopes steeper than SLIDE_TALUS around the crater slides
// downhill for a short while (SLIDE_FRAMES), so steep faces slump without whole mountains melting
const SLIDE_TALUS = 0.9;
const SLIDE_RATE = 0.25;
const SLIDE_FRAMES = 75;
// Bounties: a kill pays the killer KILL_BOUNTY at once, plus the bounty on the match leader
const KILL_BOUNTY = 250;
const SAT_HEAL = 0.25; // share of its max health MAIA repairs every turn
// damage popup tiers by accuracy (share of the blast radius from dead centre)
const HIT_TIERS = [
  { tag: 'GRAZE', color: '#c8c4d4' },
  { tag: 'GLANCING', color: '#ffd8b0' },
  { tag: 'SOLID', color: '#ff9a4a' },
  { tag: 'DIRECT HIT', color: '#fff27a' },
];
const LEADER_BOUNTY = 400; // per round-win of lead over the runner-up
// A3 wind is 0..0.5 px/frame^2; scaled down so it nudges rather than dominates

// Proportional-control camera: every frame it closes 1/CAM_EASE of the distance to its target.
// The target is whatever it's focused on (tank, shell, satellite), or a point the player dragged to.
class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.focus = null;
    this.manual = null;
    this.bias = 0; // shift what it follows right of centre by this much (the Codex range, behind its panel)
  }

  follow(obj) { this.focus = obj; this.manual = null; }

  target() {
    const f = this.manual || this.focus;
    if (!f) return null;
    return {
      x: clamp(f.x - VIEW_W / 2 - (this.manual ? 0 : this.bias), 0, WORLD_W - VIEW_W),
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
      case 'KeyR': if (down && !e.repeat) this.queue.push({ repair: true }); break;
      case 'KeyW': case 'KeyJ': if (down && !e.repeat) this.queue.push({ jump: true }); break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': {
        const ab = ABILITIES.find((a) => a.key === e.code.slice(5));
        if (down && !e.repeat && ab) this.queue.push({ ability: ab.id });
        break;
      }
      case 'Enter': if (down && !e.repeat && this.g.phase === 'aim') this.queue.push({ endTurn: true }); else handled = false; break;
      case 'KeyM': if (down && !e.repeat) this.g.toggleMute(); break;
      case 'KeyN': if (down && !e.repeat) this.g.toggleMusic(); break;
      case 'Escape': if (down && !e.repeat) { if (this.g.ui.helpOpen()) this.g.ui.toggleHelp(false); else if (this.g.range) this.g.ui.closeCodex(); else this.g.togglePause(); } break;
      case 'KeyH': case 'Slash': if (down && !e.repeat) this.g.ui.toggleHelp(); break;
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
    this.traces = [];
    this.crates = [];
    this.slides = [];
    this.fronts = [];
    this.mobs = [];
    this.fogY = null;
    this.biome = BIOMES.snow;
    this.mapChoice = 'random';
    this.events_on = true; // later-round complications (hazards.js)
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
    this.sfx.music('shop'); // A3 MainMenuGameState: menuDrones (starts on the first click)
    this.initDrag();
    this.newEnvironment();
    this.cam.follow({ x: WORLD_W / 2, y: 0.6 * WORLD_BOTTOM });
    this.cam.snap();
  }

  // drag (either mouse button, or touch) pans the camera; it eases back on the next event.
  // A click / tap without dragging puts down a target marker (or clears it, near your own vehicle).
  initDrag() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      if (this.phase === 'menu') return;
      this.sfx.unlock();
      this.drag = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y, moved: false };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointerup', (e) => {
      if (this.drag && !this.drag.moved) this.placeMark(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      if (!this.drag.moved && Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) < 6) return;
      this.drag.moved = true;
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

  placeMark(e) {
    const t = this.active;
    if (this.phase !== 'aim' || !t || t.isCpu) return;
    const r = this.canvas.getBoundingClientRect();
    const sc = VIEW_W / r.width;
    const x = clamp(this.cam.x + (e.clientX - r.left) * sc, 0, WORLD_W - 1);
    let y = this.cam.y + (e.clientY - r.top) * sc;
    if (dist(x, y, t.x, t.y - 10) < 40) { t.mark = null; this.sfx.click(); return; }
    y = Math.min(y, this.terrain.hAt(x)); // a click below the surface marks the ground there
    t.mark = { x, y };
    this.sfx.click();
  }

  // Power needed to land on the marker at the current elevation, using the same physics as the aim
  // guide (gravity, plus wind only if AIM_GUIDE_WIND). Binary search on muzzle speed for where the
  // falling shell crosses the marker's height. frac > 1 means it can't reach at this angle.
  markPower(t) {
    const m = t.muzzle();
    const u = t.aimVec();
    const tg = t.mark;
    const wind = AIM_GUIDE_WIND || t.upgrades.computer ? this.wind : { x: 0, y: 0 };
    const dir = Math.sign(tg.x - m.x) || 1;
    if (dir !== t.facing) return { frac: null, behind: true };
    const reach = (v) => { // signed overshoot past the marker for speed v (null: never comes down to it)
      let x = m.x, y = m.y, vx = u.x * v, vy = u.y * v;
      const drift = t.weapon.drift;
      const G = guideFor(t.weapon, t); // rockets: the motor's lift while it burns shapes the arc
      for (let i = 0; i < 1500; i++) {
        const a = windAccel({ vx, drift }, wind);
        const lift = G && i >= G.arm && i <= G.arm + G.burn ? G.lift : 0;
        vy += GRAV * (1 - lift) + a.y;
        vx += a.x;
        const px = x, py = y;
        x += vx;
        y += vy;
        if (vy > 0 && y >= tg.y && py < tg.y + 1e-6) {
          const f = (tg.y - py) / (y - py || 1);
          return (px + (x - px) * f - tg.x) * dir;
        }
        if (vy > 0 && y > tg.y) return null; // coming down without ever reaching its height: short
        if ((x - tg.x) * dir > 4000) return 4000; // long past it while still above: overshoot
      }
      return null;
    };
    const cap = t.chargeCap();
    let lo = 0.5, hi = cap * 3;
    const top = reach(hi);
    if (top === null || top < 0) return { frac: null, far: true };
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const r = reach(mid);
      if (r === null || r < 0) lo = mid; else hi = mid;
    }
    const v = hi;
    // does terrain or a tree get in the way?
    const hit = simulateShot(this.terrain, wind, this.targets(), t, m.x, m.y, u.x * v, u.y * v, t.weapon.drift, t.weapon, []); // the arc alone (no seeker), for terrain in the way
    return { v, frac: v / cap, blocked: dist(hit.x, hit.y, tg.x, tg.y) > 45 };
  }

  // ------------------------------------------------------------ setup
  // a fresh map: the chosen biome (or a random one) and new terrain
  newEnvironment() {
    const id = this.mapChoice && this.mapChoice !== 'random' ? this.mapChoice : rng.pick(BIOME_IDS);
    this.biome = BIOMES[id] || BIOMES.snow;
    this.terrain.generate(this.biome);
    this.bg = new Background(this.biome);
  }

  resize(cssWidth) {
    this.k = clamp(Math.ceil((cssWidth * (window.devicePixelRatio || 1)) / W), 1, 3);
    this.canvas.width = W * this.k;
    this.canvas.height = H * this.k;
    this.ctx.imageSmoothingEnabled = false;
  }

  // opts: { balance: 'rebalanced' | 'classic', events: bool }
  startMatch(configs, rounds, opts = {}) {
    this.setOptions(opts);
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
    this.traces = [];
    this.crates = [];
    this.slides = [];
    this.salvo = null;
    this.satSeq = null;
    this.satTarget = null;
    this.particles.clear();
    this.updateBounties();
    this.placeTanks();
    this.setWind();
    this.windMarker = this.windDir;
    this.setupHazards();
    this.turnCount = 0;
    this.roundDamage = 0;
    // A3 cycles players in order; the starting player rotates each round
    this.saveMatch('round');
    this.order = this.tanks.map((_, i) => (i + this.round - 1) % this.tanks.length);
    this.turnPtr = -1;
    const tier = satelliteTier(this.round, this.rounds);
    if (tier > this.satellite.tier) {
      this.events.push(`MAIA has been upgraded to Level ${tier}.`);
      this.ui.notice(`MAIA has been upgraded to Level ${tier}.`);
    }
    this.satellite.setTier(tier);
    this.satTurn(true); // MAIA starts each round repaired, as tough as the average vehicle
    this.events.push(`Round ${this.round} begins.`);
    this.ui.dispatch(`Dispatch · round ${this.round}`, storyDispatch(this));
    this.sfx.roundStart();
    this.nextTurn();
    this.cam.snap();
  }

  setOptions(opts) {
    this.balance = opts.balance === 'classic' ? 'classic' : 'rebalanced';
    applyBalance(this.balance);
    this.events_on = opts.events !== false;
    this.mapChoice = BIOMES[opts.map] ? opts.map : 'random';
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
    this.placeForts();
    this.placeInfra(xs);
    this.terrain.plantTrees(xs);
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
    if (this.hazardStep()) return; // drones' bombing run / rising fog, once per cycle
    do { this.turnPtr = (this.turnPtr + 1) % this.order.length; } while (!this.tanks[this.order[this.turnPtr]].alive);
    const t = this.tanks[this.order[this.turnPtr]];
    this.active = t;
    this.sfx.newTurn();
    this.turnSerial++;
    this.turnCount++;
    const windChanged = this.turnCount > 1 && this.turnCount % 12 === 0;
    if (windChanged) {
      this.setWind();
      this.events.push('The wind has changed.');
    }
    this.updateFrontsTurn(windChanged);
    this.satellite.newTurn();
    this.satTurn();
    if (this.turnCount > 2 && this.crates.filter((c) => c.alive).length < CRATE_MAX && rng.chance(CRATE_CHANCE)) this.spawnCrate();
    t.fuel = t.maxFuel;
    t.shield = false; // a Deflector lasts until its owner's next turn
    t.barrier = null; // so does a Bulwark Barrier
    if (t.upgrades.workshop && t.armour < t.maxArmour) { // field workshop: patch some armour each turn
      const ar = Math.min(t.maxArmour - t.armour, Math.round(t.maxArmour * 0.05 * t.upgrades.workshop));
      t.armour += ar;
      this.particles.text(t.x, t.y - 40, `+${ar}`, '#8fe0a0');
    }
    this.fogDamage(t);
    this.infraTurn(t);
    if (!t.alive) { this.nextTurn(); return; }
    for (const id in t.cooldown) if (t.cooldown[id] > 0) t.cooldown[id]--;
    if (this.range) { t.reload = {}; for (const id in t.cooldown) t.cooldown[id] = 0; } // the Codex range: no waiting
    t.tickReloads();
    t.drill = hasTrait(t, 'drill');
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
    this.cam.follow(this.range ? this.rangeFocus() : t);
    this.ui.turn(t);
  }

  // ------------------------------------------------------------ main loop
  step() {
    this.time += DT;
    this.bg.update(DT, this.wind, this.cam);
    this.particles.update(DT, this.wind);
    this.satellite.update();
    for (const t of this.tanks) {
      t.update(DT);
      if (t.alive && t.hp < t.maxHp * 0.3 && Math.random() < 0.04) this.particles.puff(t.x - t.facing * 6, t.y - TANK_H, [90, 90, 100]);
      if (!t.alive && Math.random() < 0.03) this.particles.puff(t.x, t.y - 14, [70, 70, 78]);
      if (t.alive && t.recoil > 0.15 && Math.random() < 0.35) { // smoke curling from a barrel that just fired
        const m = t.muzzle();
        this.particles.add({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 0.6, g: -0.01, drag: 0.97, life: 0.9, size: 3 + Math.random() * 4, color: [170, 168, 180] });
      }
    }
    this.stepTanks();
    this.updateHazards();
    if (this.phase === 'aim') this.updateAim();
    else if (this.phase === 'resolve') this.updateResolve();
    else if (this.phase === 'hazard') this.updateHazard();
    this.lasers = this.lasers.filter((l) => l.update());
    this.updateTraces();
    for (const c of this.crates) if (c.alive) c.update(this);
    this.crates = this.crates.filter((c) => c.alive);
    this.windMarker += (this.windDir - this.windMarker) / 20;
    this.cam.update();
    this.shake *= 0.9;
  }

  stepTanks() {
    this.stepSlides();
    for (const t of this.tanks) {
      t.tilt += (groundSlope(this.terrain, t.x) - t.tilt) * 0.2;
      if (!t.alive) { t.y = this.groundAt(t.x, t.y); continue; } // wrecks settle into new craters
      if (t.jumping) { // a hop (W): its own arc, landing only on the way down
        const nx = t.x + t.jvx;
        if (nx < 20 || nx > WORLD_W - 20) t.jvx = 0;
        else if (this.groundAt(nx, t.y) >= t.y - 4) t.x = nx; // clear of it: carry on along
        else if (t.vy >= 0) t.jvx = 0; // coming down into a wall: drop straight
        t.vy += GRAV;
        t.y += t.vy;
        const gy = this.groundAt(t.x, t.y - t.vy);
        if (t.y >= gy) {
          t.y = gy;
          if (t.vy >= 0) {
            t.vy = 0; t.jvx = 0; t.jumping = false; t.falling = false;
            this.particles.puff(t.x, t.y);
            this.landed(t, t.y - t.fallFrom);
          }
        }
        continue;
      }
      const gy = this.groundAt(t.x, t.y);
      if (t.y < gy - 0.5) {
        if (!t.falling) t.fallFrom = t.y;
        t.falling = true;
        t.vy += GRAV;
        t.y += t.vy;
        if (t.y >= gy) {
          t.y = gy;
          t.vy = 0;
          t.falling = false;
          this.particles.puff(t.x, t.y);
          this.landed(t, t.y - t.fallFrom);
        }
      } else {
        t.y = gy;
        t.falling = false;
      }
      // drive over a landed crate to claim it
      for (const c of this.crates) {
        if (c.alive && c.landed && Math.abs(c.x - t.x) < TANK_W / 2 + 10 && Math.abs(c.y - t.y) < 30) this.claimCrate(c, t);
      }
    }
  }

  // fall damage, credited to whoever's shot knocked the ground away
  landed(t, drop) {
    if (drop <= FALL_SAFE || hasTrait(t, 'geschutz')) return;
    const sh = this.report && this.report.shooter;
    const owner = sh && sh !== t ? sh : null;
    if (this.report) this.report.fallen = (this.report.fallen || new Set()).add(t);
    this.events.push(`${t.name} fell ${Math.round(drop)}m.`);
    this.damage(t, (drop - FALL_SAFE) * FALL_DMG, owner);
  }

  // Avalanches: snow near a blast that sits steeper than SLIDE_TALUS slides downhill a little
  // each frame (thermal erosion), until it settles. Vehicles ride the surface and can fall.
  startSlide(x, explR) {
    const half = explR * 4 + 60;
    this.slides.push({ x0: Math.max(0, Math.floor(x - half)), x1: Math.min(WORLD_W - 1, Math.ceil(x + half)), life: SLIDE_FRAMES });
  }

  stepSlides() {
    const h = this.terrain.height;
    this.slides = this.slides.filter((s) => {
      let moved = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = s.x0; i < s.x1; i++) {
          const d = h[i + 1] - h[i]; // > 0: column i stands higher than i+1
          const ex = Math.abs(d) - SLIDE_TALUS;
          if (ex <= 0) continue;
          const m = ex * SLIDE_RATE;
          if (d > 0) { h[i] += m; h[i + 1] -= m; } else { h[i] -= m; h[i + 1] += m; }
          moved += m;
          if (m > 1.5 && Math.random() < 0.04) {
            const top = Math.min(h[i], h[i + 1]);
            this.particles.add({ x: i, y: top, vx: Math.sign(d) * (1 + Math.random() * 2), vy: -Math.random(), g: 0.12, drag: 0.96, life: 0.7, size: 3 + Math.random() * 4, color: [236, 240, 248] });
          }
        }
      }
      if (moved > 40 && !s.loud) { s.loud = true; this.sfx.explosion(6); this.events.push('Snow slides down the slope.'); }
      return moved > 0.5 && --s.life > 0;
    });
  }

  // lay smoke along a shell's path from where it last puffed to (x, y): evenly by distance, each puff
  // nudged off the line and given its own size, life and drift, so the trail reads as one ragged
  // ribbon rather than a dotted line (cosmetic: Math.random, not the gameplay rng)
  trace(p, x, y) {
    if (!p.puff) { p.puff = { x, y, next: TRACE_STEP * Math.random() }; return; }
    const dx = x - p.puff.x, dy = y - p.puff.y;
    const len = Math.hypot(dx, dy);
    let d = p.puff.next;
    for (; d < len; d += TRACE_STEP * (0.6 + Math.random() * 0.8)) {
      if (this.traces.length >= TRACE_MAX) this.traces.shift();
      const f = d / len;
      this.traces.push({
        x: p.puff.x + dx * f + (Math.random() - 0.5) * 5, y: p.puff.y + dy * f + (Math.random() - 0.5) * 5,
        age: 0, life: TRACE_LIFE * (0.6 + Math.random() * 0.6), s: 0.6 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.02 - Math.random() * 0.08,
      });
    }
    p.puff = { x, y, next: d - len };
  }

  updateTraces() {
    for (const t of this.traces) {
      t.age++;
      t.x += this.wind.x * 30 + t.vx; // smoke drifts with the wind (up to ~0.9 units a frame)
      t.y += t.vy;
    }
    // puffs have their own lifetimes now, so filter rather than trim from the front
    if (this.traces.length && (this.time * 60 | 0) % 15 === 0) this.traces = this.traces.filter((t) => t.age < t.life);
  }

  drawTraces(ctx) {
    for (const t of this.traces) {
      const k = t.age / t.life;
      if (k >= 1) continue;
      ctx.fillStyle = `rgba(96,90,108,${0.42 * (1 - k) * (1 - k * 0.3)})`;
      sq(ctx, t.x, t.y, (3 + k * 10) * t.s);
    }
  }

  ramTree(t, tr) {
    tr.alive = false;
    const top = this.terrain.hAt(tr.x) - this.terrain.treeHeight(tr) / 2;
    const leaf = this.terrain.treeKind === 'cactus' ? [78, 128, 70] : this.terrain.treeKind === 'broadleaf' ? [196, 104, 40] : this.terrain.treeKind === 'lily' ? [244, 128, 176] : [38, 62, 64];
    for (let i = 0; i < 12; i++) {
      this.particles.add({ x: tr.x, y: top + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 4 + t.facing * 2, vy: -Math.random() * 3, g: 0.2, drag: 0.97, life: 0.9, size: 3 + Math.random() * 5, color: i % 3 ? leaf : [84, 58, 40] });
    }
    this.sfx.thud();
    this.shake = Math.max(this.shake, 3);
    this.events.push(`${t.name} drove through a tree.`);
    if (!hasTrait(t, 'geschutz')) this.damage(t, TREE_RAM_DMG + 3 * tr.h, null);
  }

  spawnCrate() {
    const total = CRATE_KINDS.reduce((a, k) => a + k.w, 0);
    let r = rng.next() * total;
    const kind = CRATE_KINDS.find((k) => (r -= k.w) < 0).id;
    this.crates.push(new Crate(rng.range(150, WORLD_W - 150), kind));
    this.events.push('A supply crate is dropping in.');
    this.ui.notice('Supply drop incoming!');
  }

  claimCrate(c, t) {
    if (!c.alive || !t) return;
    c.alive = false;
    let desc;
    if (c.kind === 'repair') {
      const hp = Math.min(t.maxHp - t.hp, Math.round(t.maxHp * 0.3));
      const ar = Math.min(t.maxArmour - t.armour, Math.round(t.maxArmour * 0.2));
      t.hp += hp;
      t.armour += ar;
      desc = `field repair (+${hp + ar})`;
    } else if (c.kind === 'cash') {
      const amt = rng.int(3, 8) * 100;
      t.money += amt;
      desc = `¢${amt}`;
    } else if (c.kind === 'armour') {
      const ar = Math.round(t.maxArmour * 0.35);
      t.armour = Math.min(Math.round(t.maxArmour * 1.5), t.armour + ar);
      desc = `armour plating (+${ar})`;
    } else {
      t.uplink = true;
      desc = 'a MAIA uplink (next shot calls the satellite)';
    }
    this.particles.text(c.x, c.y - 40, desc.split(' (')[0], '#ffd84a', true);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      this.particles.add({ x: c.x, y: c.y - 9, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1, g: 0.08, drag: 0.95, life: 0.7, size: 4, color: [255, 216, 74] });
    }
    this.sfx.buy();
    this.events.push(`${t.name} claimed a supply crate: ${desc}.`);
    this.ui.notice(`${t.name} claimed a supply crate: ${desc}.`);
    if (t.isCpu && Math.random() < 0.5) this.banter(t, 'crate');
  }

  moveTank(t, dir) {
    t.facing = dir;
    if (t.fuel <= 0) return;
    const nx = t.x + dir * TANK_SPEED;
    if (nx < 20 || nx > WORLD_W - 20) return;
    if (t.falling) return; // no driving in mid-air
    if ((this.groundAt(t.x, t.y) - this.groundAt(nx, t.y)) / TANK_SPEED > t.climb) return; // too steep (fort walls included)
    for (const o of this.tanks) {
      if (o !== t && o.alive && Math.abs(o.y - t.y) < TANK_H && Math.abs(o.x - nx) < TANK_W + 4 && Math.abs(o.x - nx) < Math.abs(o.x - t.x)) return;
    }
    // driving into a tree knocks it down, at a cost
    for (const tr of this.terrain.trees) {
      if (tr.alive && Math.abs(tr.x - nx) < TANK_W / 2 + 3 && Math.abs(tr.x - nx) < Math.abs(tr.x - t.x)) this.ramTree(t, tr);
    }
    t.x = nx;
    t.fuel--;
    t.walking = 4;
  }

  // W: hop in the facing direction for JUMP_FUEL of a full tank
  jump(t) {
    const cost = Math.ceil(t.maxFuel * JUMP_FUEL);
    if (this.phase !== 'aim' || t !== this.active || t.falling || t.fuel < cost) { this.sfx.deny(); return false; }
    t.fuel -= cost;
    t.vy = JUMP_VY;
    t.jvx = t.facing * JUMP_VX;
    t.fallFrom = t.y;
    t.jumping = true;
    t.falling = true; // (no driving mid-air, and the turn waits for her to land)
    this.particles.puff(t.x, t.y);
    this.sfx.click();
    return true;
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
          if (t.cycleWeapon(a.cycle)) this.sfx.click(); else this.sfx.deny();
        } else if (a.select !== undefined) {
          if (!t.firedThisTurn && t.selectWeapon(a.select)) this.sfx.click(); else this.sfx.deny();
        } else if (a.jump) {
          this.jump(t);
        } else if (a.repair) {
          this.useRepair(t);
          return;
        } else if (a.ability) {
          this.useAbility(t, a.ability);
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
    if (c.charge && !this.charging && !t.firedThisTurn && !t.weaponReady()) {
      c.charge = false; // can't happen through the UI; guards the CPU and stale input
      this.sfx.deny();
    }
    if (c.charge) {
      if (!this.charging) { this.charging = true; this.sfx.chargeStart(); }
      t.charge = Math.min(t.chargeCap(), t.charge + w.maxCharge * 0.005); // A3 Weapon.Update
      this.sfx.chargeUpdate((100 * t.charge) / t.chargeCap());
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
    if (this.range) { this.range.shots++; this.range.last = 0; }
    if (!t.firedThisTurn && reloadOf(w)) t.reload[w.id] = reloadOf(w) + 1; // sits out reloadOf(w) of its owner's turns
    t.shotsLeft--;
    t.firedThisTurn = true;
    const dir = t.aimVec();
    // armed abilities go on this shot, then recharge
    const dbl = t.armed.double;
    if (dbl) t.cooldown.double = ABILITY_BY_ID.double.cd;
    if (t.armed.over) t.cooldown.over = ABILITY_BY_ID.over.cd;
    t.lastCharge = t.charge / t.chargeCap();
    t.armed = { double: false, over: false };
    this.salvo = { t, w, vx: dir.x * t.charge, vy: dir.y * t.charge, left: w.salvo * (dbl ? 2 : 1), timer: 0, first: true, uplink: !!t.uplink };
    t.uplink = false;
    t.charge = 0;
    t.recoil = 1;
    t.setPose('fire');
    this.sfx.shot(w);
    this.shake = Math.max(this.shake, 3 + w.dmg / 200);
    this.events.push(`${t.name} fired the ${w.name.replace(/\.$/, "")}.`);
    this.report = { shooter: t, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
    if (dbl) this.events.push(`${t.name} fires a Double Shot.`);
    this.satTarget = null;
    const line = dbl ? 'double' : this.fireLine(w);
    if (t.isCpu && line && Math.random() < (dbl ? 0.5 : 0.25)) this.banter(t, line);
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
    p.launch = Math.atan2(-vy, Math.abs(vx)); // launch angle above the horizon: steeper shots earn more altitude bonus
    p.uplink = s.uplink && s.first;
    if (s.first) {
      p.rec = [];
      this.cam.follow(p);
    }
    this.particles.muzzle(m.x, m.y, t.aimVec(), s.w);
    t.recoil = 1; // every round kicks the barrel back
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
    const busy = next.length || salvoPending || this.drops.length || this.satSeq || this.lasers.length || this.slides.length || this.tanks.some((t) => t.alive && t.falling);
    this.quiet = busy ? 0 : this.quiet + 1;
    if (this.quiet > 40 || this.resolveSteps > 60 * 40) {
      this.projectiles.length = this.drops.length = 0;
      this.salvo = this.satSeq = this.satTarget = null;
      this.finishShot();
    }
  }

  finishShot() {
    const t = this.active;
    if (this.hazardResolve) { // the drones' bombs have landed: on with the turn order
      this.hazardResolve = false;
      if (this.tanks.filter((x) => x.alive).length <= 1) this.endRound();
      else this.nextTurn();
      return;
    }
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
    // G.W. Tiger's drill: the first shot of her turn hit a rival, so she gets the round back
    const drilled = t && t.drill && this.report && (this.report.bestQ || 0) >= DRILL_QUALITY;
    if (t) t.drill = false;
    if (drilled && t.alive) { t.shotsLeft++; this.particles.text(t.x, t.y - 90, 'Drill: round back', '#f2c45a'); }
    this.react(this.report);
    this.report = null;
    const alive = this.tanks.filter((x) => x.alive).length;
    if (alive <= 1) this.endRound();
    else if (t.alive && t.shotsLeft > 0) this.startAim(); // autoloader: same tank fires again
    else this.nextTurn();
  }

  // ------------------------------------------------------------ satellite
  startSatellite() {
    if (!this.satellite.alive) { // shot down: the uplink finds nobody home
      this.particles.text(this.satTarget.x, this.satTarget.y - 50, 'MAIA offline', '#9a90b0');
      this.satTarget = null;
      return;
    }
    this.satSeq = { t: 0, target: this.satTarget, owner: this.satTarget.owner };
    this.retarget(this.satSeq);
    this.satTarget = null;
    this.satellite.lookAt(this.satSeq.target);
    this.cam.follow(this.satellite);
    this.sfx.satPrep();
    this.events.push(`MAIA locks onto ${this.satSeq.owner.name}'s mark.`);
  }

  // Innocentia's MAIA re-targeting: a near miss gets nudged onto the closest rival
  retarget(s) {
    if (!hasTrait(s.owner, 'retarget')) return;
    let best = null, bd = RETARGET_RANGE;
    for (const e of this.targets()) {
      if (!e.alive || e === s.owner) continue;
      const c = e.center();
      const d = dist(c.x, c.y, s.target.x, s.target.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (!best || bd < 10) return;
    const k = Math.min(1, RETARGET_SHIFT / bd);
    s.target = { ...s.target, x: s.target.x + (best.x - s.target.x) * k, y: s.target.y + (best.y - s.target.y) * k };
    this.events.push('MAIA re-targets.');
    this.particles.text(s.target.x, s.target.y - 60, 'MAIA re-targets', '#ff78c8');
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
      const r = sat.dmgR * (hasTrait(s.owner, 'uplink') ? 1.3 : 1); // Innocentia's priority uplink
      this.explode(tg.x, tg.y, { maia: true, dmg: sat.damage, dmgR: r, explR: sat.explR, from: { x: lens.x - tg.x, y: lens.y - tg.y } }, s.owner, 'laser');
      this.cam.follow({ x: tg.x, y: tg.y });
    }
    if (s.t > 75 + 70) this.satSeq = null;
  }

  // ------------------------------------------------------------ combat rules
  impact(p, r) {
    const w = p.w;
    if (r && r.hit === 'tree' && this.report) this.report.treeHit = true;
    if (w.kind === 'laser') {
      // A3 LaserTargetProjectile: the shell marks a point, the gun's laser hits it
      const m = p.owner.alive ? p.owner.muzzle() : { x: p.owner.x, y: p.owner.y - TANK_H };
      const c = RARITY[w.rarity].color;
      this.lasers.push(new Laser(m.x, m.y, p.x, p.y, c === '#ffffff' ? '#e0e0ff' : c, 12, 60));
      this.sfx.laser();
      this.explode(p.x, p.y, { ...w, front: this.frontMult(p), trait: this.traitDmg(p), dmg: w.dmg * this.frontMult(p) * this.traitDmg(p), from: { x: m.x - p.x, y: m.y - p.y } }, p.owner, 'laser');
      if (w.acid) { // an acid laser (the Ichor): the beam leaves a boiling pool
        for (let i = 0; i < 18; i++) {
          const a = -Math.PI * (0.15 + 0.7 * Math.random());
          const sp = 1.5 + Math.random() * 4;
          this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 4, Math.cos(a) * sp, Math.sin(a) * sp, w.acid));
        }
      }
    } else {
      this.explode(p.x, p.y, { ...this.shotBonus(p), from: { x: -p.vx, y: -p.vy } }, p.owner, w.kind === 'acid' ? 'acid' : 'shell');
      if (w.kind === 'acid') {
        for (let i = 0; i < 30; i++) {
          const a = -Math.PI * (0.1 + 0.8 * Math.random());
          const sp = 2 + Math.random() * 6;
          this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 4, Math.cos(a) * sp, Math.sin(a) * sp, w.acid));
        }
        this.sfx.acid();
      }
      if (w.kind === 'flak' || w.airburst) this.shrapnel(p);
      if (w.incendiary && w.frag) { // a burning fragment: a small patch of fire that sticks and scorches
        for (let i = 0; i < 2; i++) this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 2, (Math.random() - 0.5) * 3, -1 - Math.random() * 2, w.incendiary, true));
      }
    }
    if (p.storm) this.lightning(p, w);
    if ((w.sat || p.uplink) && p.main) this.satTarget = { x: p.x, y: p.y, owner: p.owner };
  }

  // kinetic and altitude bonuses for a shell's impact (see KINETIC_* / ALTITUDE_*)
  // ------------------------------------------------------------ MAIA as a target
  // damage scaled by where it was caught (Satellite.region); down at 0 until it heals
  damageSat(sat, amt, owner, hit) {
    if (!sat.alive || (owner && owner.isMob)) return;
    const reg = hit ? sat.region(hit.px, hit.py) : { mult: 1, tag: 'HIT' };
    amt *= reg.mult;
    sat.hp = Math.max(0, sat.hp - amt);
    sat.flash = 1;
    const c = sat.center();
    if (hit) { hit.region = reg.tag; this.hitPopup(c.x, c.y - 70, amt, hit); }
    if (owner) { owner.stats.dealt += amt * 0.25; }
    this.sfx.hit();
    if (!sat.alive) {
      this.particles.explosion(c.x, c.y, 160, 'laser');
      this.shake = Math.max(this.shake, 8);
      this.ui.notice(`${owner ? owner.name : 'Someone'} knocked MAIA offline. It will come back as it repairs.`);
      this.events.push('MAIA is offline.');
    } else this.events.push(`${owner ? owner.name : 'Something'} hit MAIA (${reg.tag.toLowerCase()}): ${Math.round(sat.health * 100)}%.`);
  }

  // every turn: MAIA's max health follows the average toughness of the vehicles still standing,
  // and it repairs SAT_HEAL of that
  satTurn(fresh = false) {
    const sat = this.satellite;
    const alive = this.tanks.filter((t) => t.alive);
    if (!alive.length) return;
    const max = alive.reduce((a, t) => a + t.maxHp + t.maxArmour, 0) / alive.length;
    const was = sat.alive;
    sat.hp = fresh ? max : clamp(sat.hp * (max / sat.maxHp) + max * SAT_HEAL, 0, max);
    sat.maxHp = max;
    if (!was && sat.alive) this.ui.notice('MAIA is back online.');
  }

  // A damage popup that reads the hit: the number grows and heats up the closer to dead centre it
  // landed (and with the size of the hit), with a quality tag and a chip per modifier underneath
  hitPopup(x, y, amt, h) {
    const tier = h.q > 0.85 ? 3 : h.q > 0.6 ? 2 : h.q > 0.3 ? 1 : 0;
    const color = HIT_TIERS[tier].color;
    const size = Math.round(18 + 22 * h.q + Math.min(18, Math.sqrt(amt) * 0.9));
    const chips = [];
    if (h.alt >= 0.05) chips.push([`ALT +${Math.round(h.alt * 100)}%`, '#f2c45a']);
    if (h.kin >= 1) chips.push([`KIN +${Math.round(h.kin)}`, '#ff9a5a']);
    if (h.front > 1.01) chips.push([`FORCE ×${h.front.toFixed(2)}`, '#ffd84a']);
    if (h.front < 0.99) chips.push([`RAIN ×${h.front.toFixed(2)}`, '#8ab4ff']);
    if (h.trait > 1) chips.push(['DISCIPLINE +25%', '#f2c45a']);
    if (h.sat) chips.push(['MAIA', '#ff78c8']);
    if (h.region) chips.push([`MAIA ${h.region}`, '#ff78c8']);
    if (h.sloped) chips.push(['SLOPED −20%', '#9ab0c8']);
    if (h.blocked) chips.push(['BARRIER −80%', '#78e6d2']);
    if (h.shield) chips.push(['DEFLECTOR ½', '#96d2ff']);
    if (h.capped) chips.push(['REDUNDANCY CAP', '#c3b0ff']);
    if (h.flak) chips.push(['FLAK ×2', '#78d8c4']);
    this.particles.add({ type: 'hit', x, y, vx: (Math.random() - 0.5) * 0.3, vy: -0.6, g: 0, drag: 0.98, life: 1.5 + 0.5 * h.q + chips.length * 0.12,
      str: String(Math.round(amt)), color, size, tag: HIT_TIERS[tier].tag, chips });
    if (tier === 3) this.shake = Math.max(this.shake, 5);
  }

  // a rocket that transforms in flight but hits before it does: half damage (the payload is the point)
  bodyFactor(p) { const w = p.w; return (w.carpet || w.split || w.lance) && !p.charging && !p.dropped ? 0.5 : 1; }

  // Object 15X's single-shot discipline: +25% from guns without an autoloader
  traitDmg(p) { return p.w && p.w.clip === 1 && !p.w.frag && hasTrait(p.owner, 'discipline') ? 1.25 : 1; }

  shotBonus(p) {
    const w = p.w;
    const alt = altitudeBonus(p.y - p.peak, p.launch || 0);
    const speed = Math.hypot(p.vx, p.vy);
    const body = this.bodyFactor(p);
    const kin = Math.max(0, speed - KINETIC_MIN_SPEED) * KINETIC_PER_SPEED * w.dmg * body * (p.charging ? w.lance.kin : 1);
    const front = this.frontMult(p), trait = this.traitDmg(p);
    return { ...w, alt, front, trait, dmg: w.dmg * body * (1 + alt) * front * trait, kin: kin >= 1 ? { dmg: kin, r: Math.max(18, w.dmgR * KINETIC_RADIUS) } : null };
  }

  // flak burst: fragments rain down from the airburst
  shrapnel(p) {
    const frag = { id: 'frag', name: 'Shrapnel', kind: 'shell', dmg: p.w.dmg * 0.2, dmgR: 24, explR: 2, salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: 1, maxCharge: 10, frag: true, incendiary: p.w.incendiary || 0 };
    const n = p.w.incendiary ? 3 : 6 + Math.min(6, Math.round(p.w.dmgR / 40)); // incendiary: fewer, burning
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * 1.6; // a downward cone
      const sp = 3 + Math.random() * 5;
      const f = new Projectile(this, frag, p.owner, p.x, p.y, Math.cos(a) * sp + p.vx * 0.2, Math.sin(a) * sp, false);
      f.age = 10;
      this.projectiles.push(f);
    }
  }

  explode(x, y, def, owner, palette = 'shell') {
    if (this.report) this.report.blasts.push({ x, y });
    if (y > this.terrain.hAt(x) - (def.explR || 10) * 4 - 20) this.terrain.crater(x, def.explR || 10); // airbursts don't dig
    if (this.terrain.forts.length) this.blastForts(x, y, def);
    this.blastInfra(x, y, def);
    if (y > this.terrain.hAt(x) - 30) this.terrain.scorch(x, Math.max(14, def.dmgR * 0.3), 0.2); // a faint scorch, ground hits only
    // a blast that catches a supply crate claims it for whoever fired
    for (const c of this.crates) {
      if (c.alive && owner && !owner.isMob && dist(c.x, c.y - 9, x, y) < Math.max(40, def.dmgR * 0.6)) this.claimCrate(c, owner);
    }
    for (const t of this.terrain.fellTrees(x, y, Math.max(30, def.dmgR * 0.5))) {
      const top = this.terrain.hAt(t.x) - this.terrain.treeHeight(t) / 2;
      for (let i = 0; i < 10; i++) {
        this.particles.add({ x: t.x, y: top + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, g: 0.2, drag: 0.97, life: 0.8 + Math.random() * 0.6, size: 4 + Math.random() * 5, color: i % 3 ? [38, 62, 64] : [236, 240, 246] });
      }
    }
    for (const t of this.targets()) {
      if (!t.alive) continue;
      const c = t.center();
      const d = dist(c.x, c.y, x, y);
      let amt = d < def.dmgR ? def.dmg * (1 - d / def.dmgR) : 0;
      // what went into the hit, for the damage popup: accuracy (1 = dead centre) and each modifier
      const hit = { px: x, py: y, q: def.dmgR ? clamp(1 - d / def.dmgR, 0, 1) : 0, alt: def.alt || 0, front: def.front || 1, trait: def.trait || 1, kin: 0, sat: !!def.maia };
      if (def.kin && d < def.kin.r) { hit.kin = def.kin.dmg * (1 - d / def.kin.r); amt += hit.kin; }
      if (amt > 0 && t.armour > 0 && hasTrait(t, 'sloped')) { // Object 15X: blasts from the side she faces
        const fx = Math.abs(x - c.x) < 12 && def.from ? def.from.x : x - c.x;
        if (fx * t.facing > 0) { amt *= 0.8; hit.sloped = true; }
      }
      if (amt > 0 && t.barrier) {
        // Bulwark Barrier: does this blast come from the side it covers? (a direct hit counts from
        // the direction the shell arrived)
        let dx = x - c.x, dy = y - c.y;
        if (Math.hypot(dx, dy) < 12 && def.from) { dx = def.from.x; dy = def.from.y; }
        const len = Math.hypot(dx, dy) || 1;
        if ((dx * t.barrier.x + dy * t.barrier.y) / len > BARRIER_COS) {
          amt *= 1 - BARRIER_BLOCK;
          t.barrierHit = 1;
          hit.blocked = true;
        }
      }
      if (amt > 0) this.damage(t, amt, owner, false, def, hit);
    }
    this.startSlide(x, def.explR || 10);
    this.particles.explosion(x, y, def.dmgR, palette);
    this.sfx.explosion(Math.min(60, (def.explR || 10) + def.dmgR * 0.1));
    this.shake = Math.max(this.shake, Math.min(14, 2 + def.dmgR * 0.05));
  }

  // A3 Character.Damage: armour soaks hits until it is gone, then health takes them
  damage(t, amt, owner, quiet = false, def = null, hit = null) {
    if (!t.alive || amt <= 0) return;
    if (owner && owner.isMob) owner = null; // mob attacks count as the environment
    if (t.isMob) { this.damageMob(t, amt, owner, def, hit); return; }
    if (t.isSat) { this.damageSat(t, amt, owner, hit); return; }
    if (t.dummy) { this.rangeHit(t, amt, hit); return; } // the Codex's training dummy
    if (t.shield) { amt *= SHIELD_FACTOR; if (hit) hit.shield = true; }
    if (owner && owner !== t) t.lastAttacker = owner; // CPUs retaliate against this tank
    if (hit && owner && owner !== t && this.report) this.report.bestQ = Math.max(this.report.bestQ || 0, hit.q); // best hit on a rival this shot
    // armour is a second bar on top of health that absorbs a whole hit, however big (by design):
    // only once it's gone does health take damage
    let taken;
    if (t.armour > 0) {
      taken = Math.min(amt, t.armour);
      t.armour -= taken;
    } else {
      if (hasTrait(t, 'redundancy') && amt > t.maxHp * 0.4) { amt = t.maxHp * 0.4; if (hit) hit.capped = true; } // November: triple redundancy
      taken = Math.min(amt, t.hp);
      t.hp -= amt;
    }
    t.flash = 1;
    if (!quiet && amt > 3) t.setPose('hit');
    this.roundDamage += taken * (quiet ? ACID_PAY_RATE : 1);
    if (this.report) {
      const m = owner ? this.report.dmg : this.report.fall;
      m.set(t, (m.get(t) || 0) + amt);
    }
    if (owner && owner !== t) {
      owner.stats.dealt += taken;
      owner.roundDealt += taken;
    }
    if (quiet) {
      t.dmgAcc += amt;
      if (t.dmgAcc >= 5) {
        this.particles.text(t.x, t.y - 40, String(Math.round(t.dmgAcc)), '#c8f0a0');
        t.dmgAcc = 0;
      }
    } else if (amt > 3) {
      if (hit) this.hitPopup(t.x + (Math.random() - 0.5) * 16, t.y - 46, amt, hit);
      else this.particles.text(t.x + (Math.random() - 0.5) * 20, t.y - 40, String(Math.round(amt)), '#ffffff', amt > 100);
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
    this.sfx.die();
    this.shake = Math.max(this.shake, 12);
    if (owner && owner !== t) {
      owner.stats.kills++;
      this.events.push(`${owner.name} destroyed ${t.name}!`);
      const pay = KILL_BOUNTY + (t.bounty || 0);
      owner.money += pay;
      this.particles.text(t.x, t.y - 90, `+¢${pay}`, '#ffd84a', true);
      if (t.bounty) {
        this.events.push(`${owner.name} collects the ¢${t.bounty} bounty on ${t.name}.`);
        this.ui.notice(`${owner.name} collects the ¢${t.bounty} bounty on ${t.name}!`);
      }
    } else this.events.push(owner === t ? `${t.name} destroyed themselves.` : `${t.name} was destroyed.`);
  }

  say(tank, text, delay = 0) {
    tank.say(text, 0, delay);
    this.events.push(`${tank.name}: "${text}"`);
    this.ui.chat(tank, text);
  }

  banter(tank, situation, foe, delay = 0) {
    if (tank.dummy || this.range) return false; // the Codex range is quiet
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
      else if (rep.treeHit) cands.push({ tank: s, sit: 'hit_tree', p: 0.6 });
      else if (rep.blasts.length) {
        const closest = Math.min(...rep.blasts.map(nearest));
        if (closest <= 140) cands.push({ tank: s, sit: 'miss_close', foe: this.nearestEnemy(rep, s), p: 0.6 });
        else cands.push({ tank: s, sit: 'miss_far', p: 0.28 });
      }
    }
    for (const c of rep.fallen || []) {
      if (c.isCpu && c.alive) cands.push({ tank: c, sit: 'fall', p: 0.7 });
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
      winner.setPose('win');
      this.sfx.win();
      this.events.push(`${winner.name} wins round ${this.round}.`);
    } else this.events.push(`Round ${this.round} ends in mutual destruction.`);
    // A3 CombatGameState paid everyone 500 + half the round's damage (scaled up each round). That
    // counted raw damage, so overkill and acid floods inflated it; we count only damage that came
    // off a target (acid drip at ACID_PAY_RATE), and so count it in full to keep the same pace.
    const award = Math.round(500 + this.roundDamage * this.awardMult);
    this.lastAward = award;
    this.awardMult += 0.08;
    for (const t of this.tanks) t.money += award;
    const last = this.isLastRound();
    if (last) this.clearSave();
    else this.saveMatch('shop');
    this.ui.showRoundEnd({ round: this.round, winner, tanks: this.tanks, award }, last);
    const cpus = this.tanks.filter((t) => t.isCpu);
    if (winner) {
      if (winner.isCpu) this.ui.addQuip(winner, pickTaunt(winner, 'round_win'));
      for (const t of rng.shuffle(cpus.filter((c) => c !== winner)).slice(0, 2)) this.ui.addQuip(t, pickTaunt(t, 'round_lose', winner.name));
    } else if (cpus.length) {
      this.ui.addQuip(cpus[0], pickTaunt(cpus[0], 'round_draw'));
    }
  }

  // rounds = 0 is infinite mode: the match runs until someone ends it (round-end or pause screen)
  isLastRound() { return this.rounds > 0 && this.round >= this.rounds; }

  endMatch() {
    this.clearSave();
    this.sfx.chargeStop();
    this.charging = false;
    this.paused = false;
    this.ui.showPause(false);
    const st = this.tanks.slice().sort((a, b) => b.wins - a.wins || b.stats.dealt - a.stats.dealt);
    this.phase = 'gameEnd';
    this.ui.showHud(false);
    this.ui.showGameEnd(st);
    if (st[0].isCpu && st[0].wins > (st[1] ? st[1].wins : -1)) this.ui.addEndQuip(st[0], pickTaunt(st[0], 'match_win'));
  }

  afterRoundEnd() {
    if (this.isLastRound()) { this.endMatch(); return; }
    this.phase = 'shop';
    for (const t of this.tanks.filter((x) => x.isCpu)) this.autoBuy(t);
    this.shopQueue = this.tanks.filter((t) => !t.isCpu);
    if (this.shopQueue.length) this.sfx.shopOpen();
    this.nextShop();
  }

  nextShop() {
    const t = this.shopQueue.shift();
    if (!t) { this.ui.hideShop(); this.startRound(); return; }
    this.ui.showShop(t, () => this.nextShop());
  }

  // Health++ / Armour++ price. Each level adds 30% (compounding) to the stat.
  // Classic: A3 UI_StatUpgradeButton's exponential curve, which makes the first levels a bargain.
  // Rebalanced: a flat UPGRADE_PER_POINT for every point gained, so defence grows in step with
  // spending, as offence does with the rebalanced weapon prices.
  upgradeCost(tank, stat) {
    const level = tank.upgrades[stat];
    if (BALANCE === 'classic') return Math.floor(Math.pow(1.9, level * 0.9) * 40) + 300;
    const cur = stat === 'hp' ? tank.maxHp : tank.maxArmour;
    return Math.max(100, Math.round((cur * 0.3 * UPGRADE_PER_POINT) / 10) * 10);
  }
  sellValue(w) { return w.cost; } // a full refund: trying a new gun should cost nothing

  buy(tank, kind, id) {
    if (kind === 'weapon') {
      const w = WEAPON_BY_ID[id];
      if (tank.weapons.includes(id) || tank.weapons.length >= MAX_WEAPONS || tank.money < w.cost) { this.sfx.deny(); return false; }
      tank.money -= w.cost;
      tank.weapons.push(id);
      this.sfx.buyWeapon();
      return true;
    } else if (kind === 'ability') {
      const ab = ABILITIES.find((a) => a.id === id);
      const cost = ab && this.abilityCost(tank, ab);
      if (!ab || tank.abilities[id] > 0 || tank.money < cost || !this.abilityUnlocked(tank, ab)) { this.sfx.deny(); return false; }
      tank.money -= cost;
      tank.abilities[id] = 1;
    } else if (kind === 'vupg') {
      const u = VEHICLE_UPGRADES.find((x) => x.id === id);
      const lvl = tank.upgrades[id] | 0;
      if (!u || lvl >= u.costs.length || tank.money < u.costs[lvl]) { this.sfx.deny(); return false; }
      tank.money -= u.costs[lvl];
      tank.upgrades[id] = lvl + 1;
    } else if (kind === 'kit') {
      if (tank.kits >= REPAIR_MAX || tank.money < REPAIR_COST) { this.sfx.deny(); return false; }
      tank.money -= REPAIR_COST;
      tank.kits++;
    } else {
      const cost = this.upgradeCost(tank, id);
      if (tank.money < cost) { this.sfx.deny(); return false; }
      tank.money -= cost;
      tank.upgrades[id]++;
    }
    this.sfx.buy();
    return true;
  }

  // the starter is the gun that never reloads, so (rebalanced) it can't be sold
  canSell(tank, id) { return tank.weapons.length > 1 && !(BALANCE === 'rebalanced' && WEAPON_BY_ID[id].starter); }

  sell(tank, id) {
    if (!this.canSell(tank, id)) { this.sfx.deny(); return false; }
    tank.weapons = tank.weapons.filter((x) => x !== id);
    tank.weaponIdx = 0;
    tank.money += this.sellValue(WEAPON_BY_ID[id]);
    this.sfx.sell();
    return true;
  }

  // CPU shopping between rounds: keep a couple of repair kits; buy a gun only if it is a clear upgrade
  // on its best one (selling the weakest when all four slots are full), and save up rather than
  // settle when something much stronger is within one more round's pay (Easy doesn't plan ahead and
  // sometimes buys at random); then abilities, then Health++ / Armour++ with what's left.
  autoBuy(t) {
    const kitsWanted = t.type === 'hard' ? 3 : 2;
    while (t.kits < kitsWanted && t.money >= REPAIR_COST * 2) { t.money -= REPAIR_COST; t.kits++; }
    const horizon = (this.lastAward || 500) * (t.type === 'hard' ? 2 : 1); // how far ahead it saves
    let reserve = 0;
    for (let n = 0; n < 4; n++) {
      const owned = t.weapons.map((id) => WEAPON_BY_ID[id]);
      const bestOwned = Math.max(...owned.map(weaponValue));
      const sellable = owned.filter((w) => this.canSell(t, w.id));
      const weakest = (sellable.length ? sellable : owned).slice().sort((a, b) => weaponValue(a) - weaponValue(b))[0];
      const full = t.weapons.length >= MAX_WEAPONS;
      const budget = t.money + (full ? this.sellValue(weakest) : 0);
      const shop = WEAPONS.filter((w) => !t.weapons.includes(w.id)).sort((a, b) => weaponValue(b) - weaponValue(a));
      let pick = shop.find((w) => w.cost <= budget);
      if (!pick) break;
      if (t.type === 'easy' && rng.chance(0.4)) pick = rng.pick(shop.filter((w) => w.cost <= budget));
      else {
        const later = shop.find((w) => w.cost <= budget + horizon);
        // save only when what it can afford now is a small step up; a big jump is bought straight away
        if (later && later !== pick && weaponValue(later) > weaponValue(pick) * 1.4 && weaponValue(pick) < bestOwned * 1.6 && t.type !== 'easy') {
          reserve = Math.min(t.money, later.cost - (full ? this.sellValue(weakest) : 0)); // save up for it
          break;
        }
      }
      // classic: a gun must beat the best one owned; rebalanced: reloads make a rack of guns worth
      // having, so it only has to beat the one it replaces (or the starter, for an empty slot)
      const bar = BALANCE === 'rebalanced' ? weaponValue(full ? weakest : t.vehicle.weapon) : bestOwned;
      if (weaponValue(pick) < bar * 1.15) break; // not worth a slot
      if (full) {
        t.money += this.sellValue(weakest);
        t.weapons = t.weapons.filter((id) => id !== weakest.id);
        t.weaponIdx = 0;
      }
      t.money -= pick.cost;
      t.weapons.push(pick.id);
    }
    // abilities: Hard keeps a Double Shot and a Deflector, Normal a Double Shot, Easy now and then
    const wants = t.type === 'hard' ? ['double', 'shield'] : t.type === 'normal' ? ['double'] : rng.chance(0.4) ? [rng.pick(['double', 'shield'])] : [];
    if ((this.isLate() || hasTrait(t, 'gatekeeper')) && t.type !== 'easy') wants.unshift('barrier'); // late game (or November): a barrier first
    for (const id of wants) {
      const ab = ABILITIES.find((a) => a.id === id);
      const cost = this.abilityCost(t, ab);
      if (t.abilities[id] < 1 && t.money - reserve >= cost * 1.5) { t.money -= cost; t.abilities[id] = 1; }
    }
    // vehicle upgrades: everyone wants an engine level; Normal and Hard a workshop; Hard the computer
    const vwants = t.type === 'hard' ? ['engine', 'workshop', 'computer'] : t.type === 'normal' ? ['engine', 'workshop'] : ['engine'];
    for (const id of vwants) {
      const u = VEHICLE_UPGRADES.find((x) => x.id === id);
      const lvl = t.upgrades[id] | 0;
      if (lvl < 1 && t.money - reserve >= u.costs[lvl] * 1.5) { t.money -= u.costs[lvl]; t.upgrades[id] = lvl + 1; }
    }
    for (let n = 0; n < 6; n++) {
      const stat = t.upgrades.hp <= t.upgrades.armour ? 'hp' : 'armour';
      const cost = this.upgradeCost(t, stat);
      if (t.money - reserve < cost) break;
      t.money -= cost;
      t.upgrades[stat]++;
    }
  }

  // Abilities (see ABILITIES): 1 / 2 arm Double Shot / Overcharge for the next shot (press again
  // to disarm; they only recharge once fired), 3 switches the Deflector on. None takes the turn.
  // late game: the second half of a finite match, or from round 4 in infinite mode
  // November's gatekeeper: the barrier is hers from round one, at half price
  abilityUnlocked(t, ab) { return !ab.late || this.isLate() || (ab.id === 'barrier' && hasTrait(t, 'gatekeeper')); }
  abilityCost(t, ab) { return ab.id === 'barrier' && hasTrait(t, 'gatekeeper') ? Math.round(ab.cost * GATEKEEPER_DISCOUNT) : ab.cost; }

  isLate() { return this.rounds ? this.round > this.rounds / 2 : this.round >= 4; }

  useAbility(t, id, dir) {
    if (this.phase !== 'aim' || t !== this.active || !(t.abilities[id] > 0) || (t.cooldown[id] > 0 && !t.armed[id])) { this.sfx.deny(); return false; }
    const ab = ABILITY_BY_ID[id];
    if (id === 'barrier') {
      if (t.barrier) { this.sfx.deny(); return false; }
      t.cooldown.barrier = ab.cd;
      const v = dir || t.aimVec();
      const len = Math.hypot(v.x, v.y) || 1;
      t.barrier = { x: v.x / len, y: v.y / len };
      t.barrierHit = 1;
      this.events.push(`${t.name} raises a Bulwark Barrier.`);
    } else if (id === 'shield') {
      if (t.shield) { this.sfx.deny(); return false; }
      t.cooldown.shield = ab.cd;
      t.shield = true;
      this.events.push(`${t.name} raises a Deflector.`);
    } else {
      if (this.charging) { this.sfx.deny(); return false; }
      t.armed[id] = !t.armed[id];
      if (id === 'over') t.charge = Math.min(t.charge, t.chargeCap());
    }
    this.particles.text(t.x, t.y - 90, t.armed[id] === false ? `${ab.name} off` : ab.name, '#ffd84a');
    this.sfx.click();
    return true;
  }

  // The match leader (sole most round wins) carries a bounty for whoever destroys them.
  updateBounties() {
    for (const t of this.tanks) t.bounty = 0;
    const st = this.tanks.slice().sort((a, b) => b.wins - a.wins);
    if (st.length > 1 && st[0].wins > st[1].wins) {
      st[0].bounty = LEADER_BOUNTY * (st[0].wins - st[1].wins);
      this.events.push(`There is a ¢${st[0].bounty} bounty on ${st[0].name}.`);
      if (this.round > 1) this.ui.notice(`Bounty: ¢${st[0].bounty} on ${st[0].name}.`);
    }
  }

  // Repair kit: restores part of health and armour, and uses up this turn (no shot).
  useRepair(t) {
    if (this.phase !== 'aim' || t !== this.active || t.kits <= 0 || t.firedThisTurn) { this.sfx.deny(); return false; }
    t.kits--;
    const hp = Math.min(t.maxHp - t.hp, Math.round(t.maxHp * REPAIR_FRAC));
    const ar = Math.min(t.maxArmour - t.armour, Math.round(t.maxArmour * REPAIR_FRAC));
    t.hp += hp;
    t.armour += ar;
    this.particles.text(t.x, t.y - 40, `+${hp + ar}`, '#8fe0a0', true);
    for (let i = 0; i < 16; i++) {
      this.particles.add({ x: t.x + (Math.random() - 0.5) * 30, y: t.y - Math.random() * 20, vx: 0, vy: -0.6 - Math.random(), g: 0, drag: 0.99, life: 0.9, size: 4, color: [90, 200, 120] });
    }
    this.sfx.repair();
    this.events.push(`${t.name} used a repair kit (+${hp} health, +${ar} armour).`);
    if (t.isCpu && Math.random() < 0.6) this.banter(t, 'repair');
    // using the kit is the turn
    this.sfx.chargeStop();
    this.charging = false;
    t.charge = 0;
    t.shotsLeft = 0;
    t.firedThisTurn = true;
    this.salvo = null;
    this.report = null;
    this.phase = 'resolve';
    this.resolveSteps = 0;
    this.quiet = 0;
    return true;
  }

  // ------------------------------------------------------------ save / load
  // The match autosaves between rounds (A3's menu had a "load" button that never worked).
  saveMatch(resumeAt) {
    const data = {
      v: 1, resumeAt, completed: resumeAt === 'shop' ? this.round : this.round - 1, rounds: this.rounds, awardMult: this.awardMult,
      balance: this.balance, events: this.events_on, map: this.mapChoice,
      tanks: this.tanks.map((t) => ({
        idx: t.idx, name: t.name, type: t.type, vehicle: t.vehicle.id, money: t.money, wins: t.wins,
        upgrades: t.upgrades, weapons: t.weapons, kits: t.kits, abilities: t.abilities, stats: t.stats,
      })),
      savedAt: Date.now(),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }

  clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  static readSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!d || d.v !== 1 || !Array.isArray(d.tanks) || d.tanks.length < 2) return null;
      return d;
    } catch (e) {
      return null;
    }
  }

  loadMatch(d) {
    this.sfx.unlock();
    this.turnSerial = 0;
    this.report = null;
    this.awardMult = d.awardMult || 1;
    this.setOptions({ balance: d.balance || 'classic', events: d.events === true, map: d.map });
    this.satellite = new Satellite();
    this.tanks = d.tanks.map((s) => {
      const t = new Tank(s.idx, { name: s.name, type: s.type, vehicle: s.vehicle });
      t.money = s.money | 0;
      t.wins = s.wins | 0;
      t.upgrades = { hp: s.upgrades?.hp | 0, armour: s.upgrades?.armour | 0 };
      for (const u of VEHICLE_UPGRADES) t.upgrades[u.id] = clamp(s.upgrades?.[u.id] | 0, 0, u.costs.length);
      const ws = (s.weapons || []).filter((id) => WEAPON_BY_ID[id]).slice(0, MAX_WEAPONS);
      t.weapons = ws.length ? ws : [t.vehicle.weapon.id];
      t.kits = clamp(s.kits | 0, 0, REPAIR_MAX);
      for (const a of ABILITIES) t.abilities[a.id] = clamp(s.abilities?.[a.id] | 0, 0, 1);
      t.stats = { dealt: s.stats?.dealt || 0, kills: s.stats?.kills | 0 };
      t.resetRound(WORLD_W / 2, this.terrain);
      return t;
    });
    this.rounds = d.rounds;
    this.round = d.completed;
    this.satellite.setTier(satelliteTier(Math.max(1, this.round), this.rounds));
    this.events = [`Match loaded after round ${this.round}.`];
    this.ui.showHud(true);
    if (d.resumeAt === 'shop') this.afterRoundEnd();
    else this.startRound();
  }

  // ------------------------------------------------------------ misc controls
  toggleMute() {
    this.sfx.unlock();
    this.sfx.setMuted(!this.sfx.muted);
    this.ui.syncMute();
  }

  toggleMusic() {
    this.sfx.unlock();
    this.sfx.setMusic(!this.sfx.musicOn);
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
    this.drawHazardsBack(ctx, cam);
    this.terrain.draw(ctx, cam.x, cam.x + VIEW_W);
    this.terrain.drawTrees(ctx, cam.x, cam.x + VIEW_W);
    this.drawInfra(ctx);
    const aiming = this.phase === 'aim' ? this.active : null;
    if (aiming && !this.cpu) this.drawGhost(ctx, aiming);
    for (const t of this.tanks) t.draw(ctx, t === aiming);
    if (aiming && !this.cpu) this.drawAimGuide(ctx, aiming);
    if (aiming && !this.cpu && aiming.mark) this.drawMark(ctx, aiming);
    for (const d of this.drops) d.draw(ctx);
    for (const c of this.crates) c.draw(ctx);
    this.drawTraces(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const l of this.lasers) l.draw(ctx);
    this.drawHazardsFront(ctx, cam);
    this.particles.draw(ctx);

    // snow (screen pixels), and the flash of a lightning strike
    ctx.setTransform(k, 0, 0, k, 0, 0);
    this.bg.drawSnow(ctx);
    if (this.screenFlash > 0.01) {
      ctx.fillStyle = `rgba(235,245,255,${this.screenFlash})`;
      ctx.fillRect(0, 0, W, H);
      this.screenFlash *= 0.82;
    }

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

  drawAimGuide(ctx, t) {
    const m = t.muzzle();
    const v = t.aimVec();
    const dot = (x, y, d, len) => {
      const a = 0.8 * clamp((len - d) / (len * 0.6), 0, 1); // solid at first, then fades out
      ctx.fillStyle = `rgba(32,32,74,${a})`;
      sq(ctx, x, y, 4);
    };
    if (t.charge <= 0) {
      for (let d = 8; d < AIM_LINE_LEN; d += 14) dot(m.x + v.x * d, m.y + v.y * d, d, AIM_LINE_LEN);
      return;
    }
    // predicted arc for the current charge (gravity, terrain and trees; no dispersion)
    const p = { x: m.x, y: m.y, vx: v.x * t.charge, vy: v.y * t.charge, age: 0, drift: t.weapon.drift, guide: guideFor(t.weapon, t), prefer: preferFor(t) };
    const seek = this.seekables();
    const wind = AIM_GUIDE_WIND || t.upgrades.computer ? this.wind : { x: 0, y: 0 };
    let travelled = 0;
    let next = 8;
    let px = p.x;
    let py = p.y;
    const arcLen = AIM_ARC_LEN * (t.upgrades.computer ? 1.6 : 1);
    for (let i = 0; i < 600 && next < arcLen; i++) {
      const r = stepBallistic(p, this.terrain, wind, this.targets(), t, seek);
      const seg = dist(px, py, p.x, p.y);
      while (seg > 0 && next <= travelled + seg && next < arcLen) {
        const f = (next - travelled) / seg;
        dot(lerp(px, p.x, f), lerp(py, p.y, f), next, arcLen);
        next += 14;
      }
      travelled += seg;
      px = p.x;
      py = p.y;
      if (r) break;
    }
  }

  // target marker: a box-built crosshair in the player's colour
  drawMark(ctx, t) {
    const { x, y } = t.mark;
    ctx.fillStyle = t.color;
    for (let d = 8; d <= 20; d += 6) {
      sq(ctx, x - d, y, 4); sq(ctx, x + d, y, 4); sq(ctx, x, y - d, 4); sq(ctx, x, y + d, 4);
    }
    ctx.fillStyle = '#ffffff';
    sq(ctx, x, y, 4);
  }

  drawHud(ctx) {
    const cam = this.cam;
    const sat = this.satellite;
    // satellite caption (A3 Satellite.Draw)
    if (sat.y - cam.y > -80) {
      ctx.font = `15px ${HUD_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sat.name}-Class Low Orbit Ion Cannon`, Math.round(sat.x - cam.x + 120), Math.round(sat.y - cam.y + 4));
      ctx.fillText(`Level: ${sat.level} · ${sat.alive ? Math.round(sat.health * 100) + '% power' : 'OFFLINE'}`, Math.round(sat.x - cam.x + 120), Math.round(sat.y - cam.y + 26));
      // MAIA's health bar (its strike damage scales with it)
      const bx = Math.round(sat.x - cam.x + 120), by = Math.round(sat.y - cam.y + 34);
      ctx.fillStyle = HUD.plate;
      ctx.fillRect(bx, by, 204, 10);
      ctx.fillStyle = sat.health > 0.5 ? '#ff78c8' : sat.alive ? HUD.gold : HUD.ash;
      ctx.fillRect(bx + 2, by + 2, Math.round(200 * sat.health), 6);
    }
    const live = this.phase === 'aim' ? this.active : null;
    for (const t of this.tanks) t.drawLabel(ctx, t.x - cam.x, t.y - cam.y, t === live);
    this.drawHazardLabels(ctx, cam);
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
    const t = this.active;
    this.markInfo = this.phase === 'aim' && t && !this.cpu && t.mark ? this.markPower(t) : null;
    if (this.markInfo) this.drawMarkLabel(ctx, t, this.markInfo);
    if (t && this.phase !== 'roundEnd') this.drawBars(ctx, t);
  }

  // A3 UI_Minimap: a track at the top right with a dot per tank, on a dark plate
  drawMinimap(ctx) {
    const x0 = 1190, y0 = 80, w = 360, h = 20;
    const mx = (x) => x0 + (w * clamp(x, 0, WORLD_W)) / WORLD_W;
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(x0 - 10, y0 - 12, w + 20, h + 24);
    ctx.fillStyle = HUD.line;
    ctx.fillRect(x0, y0 + h / 2 - 1, w, 2);
    ctx.fillRect(x0 - 1, y0 + 2, 2, h - 4);
    ctx.fillRect(x0 + w - 1, y0 + 2, 2, h - 4);
    ctx.fillStyle = 'rgba(195,176,255,0.14)';
    ctx.fillRect(mx(this.cam.x), y0 + 1, (w * VIEW_W) / WORLD_W, h - 2);
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
    for (const d of this.mobs) {
      if (!d.alive) continue;
      ctx.fillStyle = HUD.hot;
      sq(ctx, mx(d.x), y0 + h / 2 - 9, 5);
    }
    for (const c of this.crates) {
      ctx.fillStyle = HUD.gold;
      sq(ctx, mx(c.x), y0 + h / 2 - (c.landed ? 0 : 8), 7);
    }
    if (this.active) box(mx(this.active.x), 16, HUD.bright);
    const shell = this.projectiles[0];
    if (shell) box(mx(shell.x), 10, HUD.gold);
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

  drawMarkLabel(ctx, t, info) {
    const sx = t.mark.x - this.cam.x;
    const sy = t.mark.y - this.cam.y;
    let txt;
    let col = HUD.fg;
    if (info.behind) txt = 'turn around';
    else if (info.far || info.frac > 1) { txt = 'out of reach at this angle'; col = HUD.hot; }
    else { txt = `power ${Math.round(info.frac * 100)}%${info.blocked ? ' · blocked' : ''}`; if (info.blocked) col = HUD.hot; }
    ctx.font = `13px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 16;
    // by the marker while it's on screen, otherwise above the charge bar
    const on = sx > 0 && sx < VIEW_W && sy > 60 && sy < VIEW_H - 120;
    const bx = Math.round(on ? clamp(sx - w / 2, 8, VIEW_W - w - 8) : 1120 + 400 - w);
    const by = Math.round(on ? sy - 52 : 752);
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(bx, by, Math.round(w), 22);
    ctx.fillStyle = t.color;
    ctx.fillRect(bx, by, 4, 22);
    ctx.fillStyle = col;
    ctx.fillText(txt, bx + w / 2 + 2, by + 16);
  }

  // A3 UI_Combat: charge bar (with last-charge tick) and fuel bar, bottom right, as hatched meters
  drawBars(ctx, t) {
    const x0 = 1120, w = 400;
    const hatch = (x, y, ww, hh) => { ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = x + 2; i < x + ww; i += 6) ctx.fillRect(i, y, 2, hh); };
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(x0 - 70, 784, w + 82, 70);
    ctx.font = `11px ${HUD_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = HUD.ash;
    ctx.fillText('POWER', x0 - 60, 811);
    ctx.fillText('FUEL', x0 - 60, 843);
    // power
    ctx.fillStyle = HUD.line;
    ctx.fillRect(x0, 796, w, 20);
    const pw = Math.round(w * (t.charge / t.chargeCap()));
    ctx.fillStyle = HUD.gold;
    ctx.fillRect(x0, 796, pw, 20);
    hatch(x0, 796, pw, 20);
    if (t.lastCharge > 0) {
      ctx.fillStyle = HUD.bright;
      ctx.fillRect(Math.round(x0 + w * t.lastCharge) - 1, 790, 2, 32);
    }
    // power the target marker needs at this angle
    const mi = this.markInfo;
    if (mi && mi.frac && mi.frac <= 1) {
      ctx.fillStyle = mi.blocked ? HUD.hot : HUD.cool;
      ctx.fillRect(Math.round(x0 + w * mi.frac) - 2, 788, 4, 36);
      sq(ctx, x0 + w * mi.frac, 786, 8);
    }
    // fuel
    ctx.fillStyle = HUD.line;
    ctx.fillRect(x0, 834, w, 8);
    const fw = Math.round(w * clamp(t.fuel / t.maxFuel, 0, 1));
    ctx.fillStyle = HUD.accent;
    ctx.fillRect(x0, 834, fw, 8);
    hatch(x0, 834, fw, 8);
  }

}
