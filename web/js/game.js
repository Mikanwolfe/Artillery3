'use strict';
// Game: match state machine (menu -> aim -> resolve -> roundEnd -> shop -> ... -> gameEnd),
// the camera, rules lifted from A3 (armour then HP, autoloader clips, salvos, satellite strikes,
// wind every 12 turns, end-of-round prize money) and rendering.

const CHATTINESS = 0.7; // scales every reaction probability in react(); lower = quieter CPUs
const CAM_ZOOM_MIN = 0.5; // mouse-wheel zoom range (1: the standard 1600 x 900 view)
const CAM_ZOOM_MAX = 1.8;
let CAM_FULL = VIEW_W / WORLD_W; // the furthest a set piece pulls back: the map's whole width, edge to edge (setAspect)
// the wheel's floor: never so far out that the view is wider than the map (a wide screen hits it first)
const camZoomMin = () => Math.max(CAM_ZOOM_MIN, CAM_FULL);
const CAM_ZOOM_EASE = 6; // the wheel zoom closes 1/6 of the way to its target each frame
const LABEL_ANCHOR = 60; // HUD labels hang this far (world units at zoom 1) above a vehicle's feet
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
const WINGS_GLIDE = 3; // Ikaros's fall speed cap (world units a frame)
const REPAIR_MAX = 1;
const REPAIR_FRAC = 0.7; // of max health and of max armour
// Prize money counts only damage that actually came off a target (no overkill, no damage past
// armour), and acid drip at a reduced rate: acid's many small hits used to flood the payout.
const ACID_PAY_RATE = 0.5;
const ROUND_BASE = 800; // flat credits everyone gets at the end of a round (A3: 500)
const ROUND_STEP = 200; // and this much more for each round after the first
const SAVE_KEY = 'a3.save';
const CRATE_CHANCE = 0.3; // chance of a supply drop at the start of each turn (after the first few)
const CRATE_MAX = 2;
const GOLDEN_CHANCE = 0.08; // chance a turn opens with the spy plane's golden crate (once a round at most)
const GOLDEN_CASH = 1200; // + GOLDEN_CASH_ROUND a round after the first
const GOLDEN_CASH_ROUND = 300;
const GOLDEN_UPLINK = 3; // turns of MAIA uplink
// Smoke traces: every shell leaves a line of grey squares that drift with the wind and fade
const TRACE_LIFE = 360; // frames (~6 s)
const TRACE_MAX = 5000;
const TRACE_STEP = 7; // world units between puffs along a shell's path (jittered), so fast shells don't leave dashes
// Arcade bonuses that reward high, plunging shots (shells, guns and acid; not lasers):
//  - kinetic: extra damage from impact speed, packed into a tighter radius than the blast
//  - altitude: the whole blast is scaled up by how far the shell fell from the top of its arc
const KINETIC_MIN_SPEED = 25; // px/frame at impact before the kinetic bonus starts
const KINETIC_PER_SPEED = 0.022; // + this share of the damage per px/frame above that (x a weapon's own kin)
const KINETIC_MAX = 0.5; // capped at +50%, like the altitude bonus
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
const KILL_BOUNTY = 250; // and a quarter of the victim's max health and armour on top (killPay)
const KILL_SHARE = 1; // (all of the victim's max health and armour, on top of KILL_BOUNTY)
// the round's pay: the flat ROUND_BASE (+ROUND_STEP a round), then each player's own damage to rivals
// at PAY_OWN, everyone a PAY_SHARED cut of the round's total, and the last two standing a placement bonus
const PAY_OWN = 2.5, PAY_SHARED = 0.25, PLACE_PAY = 600, PLACE_STEP = 150;
const CPU_PICK_SPREAD = 0.8; // CPUs buy at random among affordable guns at least this share of the best's worth
// what a CPU earns on top of a player's pay, round pay and bounties, by difficulty (never shown:
// the pay screen and the bounty pop-ups show the base)
const CPU_CREDIT = { easy: 1.1, normal: 1.3, hard: 1.6 };
const FLAK_REACH = 160; // how far a flak burst's fragments fan out to catch a squadron (+ twice its blast radius)
const STARTER_SELL = 250; // what her starting gun or mount fetches if she sells it
const AA_SHARE_BURNED = 0.4; // ... once planes have killed it
const SAT_HEAL = 0.25; // share of its max health MAIA repairs once a turn cycle (every n turns)
const SAT_DOWN_CYCLES = 2; // shot down, MAIA stays offline this many turn cycles (2n turns for n players)
const SAT_REBOOT = 0.5; // and comes back with this share of its health
// damage popup tiers by accuracy (share of the blast radius from dead centre)
const HIT_TIERS = [
  { tag: 'GRAZE', color: '#c8c4d4' },
  { tag: 'GLANCING', color: '#ffd8b0' },
  { tag: 'SOLID', color: '#ff9a4a' },
  { tag: 'DIRECT HIT', color: '#fff27a' },
];
const HIT_POPUP_LIFE = 4; // seconds a damage popup stays up (more for a good hit and its chips); further hits add to it
const LEADER_BOUNTY = 600; // per round-win of lead over the runner-up
const WEALTH_BOUNTY = 0.3; // and on anyone this share of her worth over the table's average, paid out of her own purse when she falls
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
    this.zoom = 1; // mouse wheel: >1 closer, <1 further out (CAM_ZOOM_MIN..CAM_ZOOM_MAX)
    this.rot = 0; // a roll, in radians, for set pieces (the HUD never turns)
    this.ceil = -1000; // how high the camera may go (set pieces lift it, into space)
    this.wide = 0; // how far past the map's edges it may go (G.W.'s battery sits off the map)
    this.wideSide = 0; // past which edge: -1 the left, 1 the right, 0 both
    this.zmin = 0; // set pieces may pull back further than the wheel can (0: CAM_ZOOM_MIN)
  }

  // the view in world units at this zoom, and world -> screen (HUD) coordinates
  get w() { return VIEW_W / this.zoom; }
  get h() { return VIEW_H / this.zoom; }
  sx(x) { return (x - this.x) * this.zoom; }
  sy(y) { return (y - this.y) * this.zoom; }
  // a HUD anchor `lift` above a world point keeps its screen distance above it at any zoom
  sya(y, lift) { return this.sy(y - lift) + lift; }

  // zoom about the centre of the view
  setZoom(z, ease = false) {
    z = clamp(z, this.zmin || camZoomMin(), CAM_ZOOM_MAX);
    if (!ease) this.zoomTo = z; // set pieces jump straight there; the wheel eases (update)
    const cx = this.x + this.w / 2, cy = this.y + this.h * 0.55;
    this.zoom = z;
    this.x = clamp(cx - this.w / 2, this.wideSide > 0 ? 0 : -this.wide, Math.max(0, WORLD_W - this.w) + (this.wideSide < 0 ? 0 : this.wide));
    this.y = clamp(cy - this.h * 0.55, this.ceil, WORLD_BOTTOM - this.h);
  }

  follow(obj) { this.focus = obj; this.manual = null; }

  target() {
    const f = this.manual || this.focus;
    if (!f) return null;
    return {
      x: clamp(f.x - this.w / 2 - (this.manual ? 0 : this.bias), this.wideSide > 0 ? 0 : -this.wide, Math.max(0, WORLD_W - this.w) + (this.wideSide < 0 ? 0 : this.wide)),
      y: clamp(f.y - this.h * 0.55, this.ceil, WORLD_BOTTOM - this.h),
    };
  }

  update() {
    // the wheel's zoom closes on its target a fraction a frame (P control), like the camera's pan
    if (this.zoomTo && Math.abs(this.zoomTo - this.zoom) > 0.001) this.setZoom(this.zoom + (this.zoomTo - this.zoom) / CAM_ZOOM_EASE, true);
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
      case 'KeyE': case 'Tab': if (down && !e.repeat) this.queue.push({ cycle: 1 }); break;
      case 'KeyS': if (down && !e.repeat) this.queue.push({ drop: true }); break;
      case 'KeyQ': if (down && !e.repeat) this.queue.push({ cycle: -1 }); break;
      case 'KeyR': if (down && !e.repeat) this.queue.push({ repair: true }); break;
      case 'KeyX': if (down && !e.repeat) this.queue.push({ recall: true }); break;
      case 'KeyW': case 'KeyJ': if (down && !e.repeat) this.queue.push({ jump: true }); break;
      case 'KeyL': if (down && !e.repeat) this.queue.push({ jump: 'leap' }); break;
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
    this.flyovers = [];
    this.planes = [];
    this.airGroups = [];
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

  // drag (either mouse button, or touch) pans the camera; it eases back on the next event. The
  // wheel zooms.
  // A click / tap without dragging puts down a target marker (or clears it, near your own vehicle).
  initDrag() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    // mouse wheel: zoom in and out about the centre of the view
    c.addEventListener('wheel', (e) => {
      if (this.phase === 'menu') return;
      e.preventDefault();
      this.cam.zoomTo = clamp((this.cam.zoomTo || this.cam.zoom) * Math.exp(-e.deltaY * 0.0015), camZoomMin(), CAM_ZOOM_MAX); // eased in by Camera.update
    }, { passive: false });
    // two fingers pinch-zoom (eased like the wheel); the gesture never pans, aims or marks
    const pts = new Map();
    const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    c.addEventListener('pointerdown', (e) => {
      if (this.phase === 'menu') return;
      this.sfx.unlock();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        this.drag = null;
        this.pinch = { d: span(), z: this.cam.zoomTo || this.cam.zoom };
        c.setPointerCapture(e.pointerId);
        return;
      }
      // pressing on (or close to) your own vehicle and dragging aims her gun at the finger instead
      const t = this.active, p = this.worldAt(e);
      const near = this.phase === 'aim' && t && !t.isCpu && dist(p.x, p.y, t.x, t.y - TANK_H / 2) < Math.max(70, 56 * p.sc);
      this.drag = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y, moved: false, aim: near };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointerup', (e) => {
      if (this.drag && !this.drag.moved) this.placeMark(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && pts.size >= 2) {
        this.cam.zoomTo = clamp(this.pinch.z * span() / this.pinch.d, camZoomMin(), CAM_ZOOM_MAX);
        return;
      }
      if (!this.drag) return;
      if (!this.drag.moved && Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) < 6) return;
      this.drag.moved = true;
      if (this.drag.aim) { const p = this.worldAt(e); this.input.queue.push({ aimAt: { x: p.x, y: p.y } }); return; }
      const sc = VIEW_W / c.clientWidth / this.cam.zoom;
      this.cam.manual = {
        x: this.drag.cx - (e.clientX - this.drag.x) * sc + this.cam.w / 2,
        y: this.drag.cy - (e.clientY - this.drag.y) * sc + this.cam.h * 0.55,
      };
    });
    const end = (e) => {
      this.drag = null;
      pts.delete(e.pointerId);
      if (pts.size < 2) this.pinch = null; // (the finger left behind doesn't start a drag)
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  // a pointer event's world position (and world units per CSS pixel)
  worldAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const sc = VIEW_W / r.width / this.cam.zoom;
    return { x: this.cam.x + (e.clientX - r.left) * sc, y: this.cam.y + (e.clientY - r.top) * sc, sc };
  }

  placeMark(e) {
    const t = this.active;
    if (this.phase !== 'aim' || !t || t.isCpu) return;
    const r = this.canvas.getBoundingClientRect();
    const sc = VIEW_W / r.width / this.cam.zoom;
    const x = clamp(this.cam.x + (e.clientX - r.left) * sc, 0, WORLD_W - 1);
    let y = this.cam.y + (e.clientY - r.top) * sc;
    if (dist(x, y, t.x, t.y - 10) < 40) { t.mark = null; this.sfx.click(); return; }
    y = Math.min(y, this.terrain.hAt(x)); // a click below the surface marks the ground there
    t.mark = { x, y };
    store.set('markUsed', true); // the hint has done its job
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
    // which way the barrel actually throws: past vertical (a gun that can aim over her shoulder, or
    // a slope tipping her back) it fires behind her, and the guide works that way too
    const throws = Math.abs(u.x) < 1e-3 ? 0 : Math.sign(u.x);
    if (throws !== dir) return { frac: null, behind: true, past: dir === t.facing, over: dir !== t.facing && t.aimVec(t.weapon.elevMax).x * t.facing < 0 };
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
    if (this.bg) this.bg.dispose(); // (its cached strips: some browsers hold canvas memory until told)
    this.bg = new Background(this.biome);
  }

  // the screen's shape: the width stretches to fit (ASPECT_MIN..ASPECT_MAX) at the same height and
  // scale, so a wider screen just sees more of the map. Returns the aspect actually used.
  setAspect(ar) {
    ar = clamp(ar || 16 / 9, ASPECT_MIN, ASPECT_MAX);
    W = Math.round((H * ar) / 16) * 16; // (a multiple of 16 keeps VIEW_W whole)
    VIEW_W = W / VIEW_SCALE;
    CAM_FULL = VIEW_W / WORLD_W;
    this.cam.setZoom(this.cam.zoomTo || this.cam.zoom); // re-clamped to the new width
    return W / H;
  }

  resize(cssWidth) {
    this.k = clamp(Math.ceil((cssWidth * (window.devicePixelRatio || 1)) / W), 1, 3);
    this.canvas.width = W * this.k;
    this.canvas.height = H * this.k;
    this.ctx.imageSmoothingEnabled = false;
  }

  // opts: { balance: 'rebalanced' | 'classic', events: bool }
  startMatch(configs, rounds, opts = {}) {
    // each match runs on its own seed (the page's ?seed for the first), shown on the pause screen
    if (this.seedUsed || this.seed === undefined) this.seed = Math.floor(Math.random() * 1e6);
    this.seedUsed = true;
    rng.seed(this.seed);
    const label = document.getElementById('pause-seed');
    if (label) label.textContent = `Seed ${this.seed} · replay the first match with ?seed=${this.seed}`;
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
    this.flyovers = [];
    this.planes = [];
    this.airGroups = [];
    this.aaRounds = [];
    this.goldenRound = false;
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
    this.deathOrder = [];
    this.resetZone();
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
    const jit = 0.25 / Math.max(1, this.round); // (later rounds start them further apart: each nearer the middle of its own stretch)
    const xs = this.tanks.map((_, i) => 100 + slot * (i + 0.5) + rng.range(-slot * jit, slot * jit));
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
    this.zoneStrike(this.active); // her turn is over: the fleet fires if she ended it on its marks (zone.js)
    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length <= 1) { this.endRound(); return; }
    if (this.hazardStep()) return; // drones' bombing run / rising fog, once per cycle
    do { this.turnPtr = (this.turnPtr + 1) % this.order.length; } while (!this.tanks[this.order[this.turnPtr]].alive);
    const t = this.tanks[this.order[this.turnPtr]];
    this.active = t;
    t.turnsTaken = (t.turnsTaken || 0) + 1;
    this.aaNewTurn();
    this.sfx.newTurn();
    this.turnSerial++;
    this.turnCount++;
    if (this.turnCount % alive.length === 0) this.zoneCycle(this.turnCount / alive.length); // (once a cycle: the fleet marks more ground)
    const windChanged = this.turnCount > 1 && this.turnCount % 12 === 0;
    if (windChanged) {
      this.setWind();
      this.events.push('The wind has changed.');
    }
    this.updateFrontsTurn(windChanged);
    this.satellite.newTurn();
    this.satTurn();
    if (this.turnCount > 2 && this.crates.filter((c) => c.alive).length < CRATE_MAX && rng.chance(CRATE_CHANCE)) this.spawnCrate();
    else if (this.events_on && !this.range && !this.goldenRound && this.turnCount > 3 && rng.chance(GOLDEN_CHANCE)) this.spyPlane();
    t.fuel = t.maxFuel;
    t.shield = false; // a Deflector lasts until its owner's next turn
    t.barrier = null; // so does a Bulwark Barrier
    if (t.upgrades.workshop && (t.hp < t.maxHp || t.armour < t.maxArmour)) { // field workshop: patch her up a little each turn
      const got = t.heal(Math.round(t.maxArmour * 0.05 * t.upgrades.workshop)); // (health first, like every heal)
      if (got > 0) this.particles.text(t.x, t.y - 40, `+${got}`, '#8fe0a0');
    }
    this.fogDamage(t);
    this.lavaDamage(t);
    this.infraTurn(t);
    if (!t.alive) { this.nextTurn(); return; }
    for (const id in t.cooldown) if (t.cooldown[id] > 0) t.cooldown[id]--;
    if (this.range) { t.reload = {}; for (const id in t.wings) for (const q of t.wings[id]) if (q.state === 'rearm') q.turns = 1; for (const id in t.cooldown) t.cooldown[id] = 0; } // the Codex range: no waiting (squads rearm at once, but are still the squads she has)
    t.tickReloads();
    t.drill = hasTrait(t, 'drill');
    if (t.isCpu && !this.range) this.cpuRecall(t); // (a CPU keeps a squad out only for a sure kill or a bounty)
    t.shotsLeft = t.shotsFor(t.weapon); // autoloaders reload every turn (planes: the squads she has left)
    t.firedThisTurn = false;
    this.startAim();
  }

  startAim() {
    const t = this.active;
    this.timeScale = 1; // (in case a set piece's bullet time was cut short)
    t.charge = 0;
    if (t.weapon.air) t.shotsLeft = t.firedThisTurn ? Math.min(t.shotsLeft, t.squadsFree(t.weapon)) : t.shotsFor(t.weapon); // (a squad lost since)
    t.clampElev();
    this.input.ctl.reset();
    this.input.queue.length = 0;
    this.charging = false;
    this.phase = 'aim';
    this.cpu = t.isCpu ? new CpuController(this, t) : null;
    if (!(this.cinematic > 0)) this.cam.follow(this.range ? this.rangeFocus() : t); // (the spy plane's pass keeps the camera)
    this.ui.turn(t);
  }

  // ------------------------------------------------------------ main loop
  step() {
    this.time += DT;
    this.bg.update(DT, this.wind, this.cam);
    this.particles.update(DT, this.wind);
    // while a CPU searches for its shot the world holds still (only effects move), so how long the
    // search takes on this machine never changes the match: seeded games replay exactly
    if (this.cpu && this.cpu.planGen && this.phase === 'aim') {
      this.updateAim();
      this.updateTraces();
      this.cam.update();
      return;
    }
    this.satellite.barrage = !!(this.satSeq && this.satSeq.barrage) || this.projectiles.some((p) => p.opensMaia); // the Hatsuyuki barrage (Yukikaze, Innocentia's Array)
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
    this.stepTowers();
    this.stepGiants();
    this.stepCold();
    this.stepDrones();
    this.stepPlanes();
    this.stepAA();
    this.updateAA();
    this.updateHazards();
    if (this.phase === 'aim') this.updateAim();
    else if (this.phase === 'resolve') this.updateResolve();
    else if (this.phase === 'hazard') this.updateHazard();
    this.lasers = this.lasers.filter((l) => l.update());
    this.updateTraces();
    for (const c of this.crates) if (c.alive) c.update(this);
    for (const f of this.flyovers) f.update(this);
    this.flyovers = this.flyovers.filter((f) => f.alive);
    if (this.cinematic > 0) { // the spy plane's pass: hand the camera back once its crate is down
      this.cinematic--;
      const p = this.flyovers[0];
      if (!p || (p.dropped && p.dropped.landed) || this.phase !== 'aim') this.cinematic = 0;
      if (!this.cinematic) { this.cam.ceil = -1000; if (this.phase === 'aim' && this.active) this.cam.follow(this.range ? this.rangeFocus() : this.active); }
    }
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
        if (hasTrait(t, 'wings')) t.vy = Math.min(t.vy, WINGS_GLIDE); // she glides down
        t.y += t.vy;
        const gy = this.groundAt(t.x, t.y - t.vy);
        if (t.y >= gy) {
          t.y = gy;
          if (t.vy >= 0) {
            t.vy = 0; t.jvx = 0; t.jumping = false; t.falling = false;
            this.particles.puff(t.x, t.y);
            this.landed(t, 0); // a jump or leap lands softly, however far down (a void still takes her)
            t.leaping = false;
          }
        }
        continue;
      }
      if (t.dropT > 0) t.dropT--;
      const gy = this.groundAt(t.x, t.y, t.dropT > 0);
      if (t.y < gy - 0.5) {
        if (!t.falling) t.fallFrom = t.y;
        t.falling = true;
        t.vy += GRAV;
        if (hasTrait(t, 'wings')) t.vy = Math.min(t.vy, WINGS_GLIDE);
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
    if (t.y >= WORLD_BOTTOM) { // down into a void (15X's Zero Point): gone
      this.events.push(`${t.name} fell into the void.`);
      this.damage(t, (t.hp + t.armour) * 10 + 1000, this.terrain.voidOwner && this.terrain.voidOwner !== t ? this.terrain.voidOwner : null);
      return;
    }
    if (drop <= FALL_SAFE || hasTrait(t, 'wings')) return;
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
          if (h[i] >= WORLD_BOTTOM || h[i + 1] >= WORLD_BOTTOM) continue; // nothing slides into a void
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
        age: 0, life: TRACE_LIFE * (0.6 + Math.random() * 0.6) * (p.w.dark ? 1.8 : 1), s: (0.6 + Math.random() * 0.8) * (p.w.dark ? 1.7 : 1),
        vx: (Math.random() - 0.5) * 0.12, vy: -0.02 - Math.random() * 0.08, dark: !!p.w.dark, // the rift's rockets trail near-black smoke
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
      ctx.fillStyle = t.dark ? `rgba(10,6,14,${0.8 * (1 - k) * (1 - k * 0.3)})` : `rgba(96,90,108,${0.42 * (1 - k) * (1 - k * 0.3)})`;
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
    this.damage(t, TREE_RAM_DMG + 3 * tr.h, null);
  }

  spawnCrate() {
    const total = CRATE_KINDS.reduce((a, k) => a + k.w, 0);
    let r = rng.next() * total;
    const kind = CRATE_KINDS.find((k) => (r -= k.w) < 0).id;
    this.crates.push(new Crate(rng.range(150, WORLD_W - 150), kind));
    this.events.push('A supply crate is dropping in.');
    this.ui.notice('Supply drop incoming!');
  }

  // the spy plane: the camera goes up to it as it crosses high over the map, and it drops a golden crate
  spyPlane() {
    this.goldenRound = true;
    const left = rng.chance(0.5);
    const p = new SpyPlane(left ? -260 : WORLD_W + 260, left ? 1 : -1, rng.range(500, WORLD_W - 500));
    this.flyovers.push(p);
    this.cinematic = 480; // input waits while it plays (cut short once the crate is down)
    this.cam.ceil = Math.min(this.cam.ceil, p.y - 600); // (lifted for the pass: the plane is way up)
    this.cam.follow(p);
    this.events.push('A spy plane passes high overhead.');
    this.ui.notice('A spy plane overhead: it is dropping something!');
    this.sfx.satPrep();
  }

  claimCrate(c, t) {
    if (!c.alive || !t) return;
    c.alive = false;
    let desc;
    if (c.kind === 'golden') { // one of three, each well worth the detour
      const r = rng.int(0, 2);
      if (r === 0) {
        desc = `golden repair (+${t.heal(Math.round((t.maxHp + t.maxArmour) * 0.7))})`; // (health first, then armour)
      } else if (r === 1) {
        const amt = GOLDEN_CASH + GOLDEN_CASH_ROUND * (this.round - 1);
        t.money += amt;
        desc = `¢${amt.toLocaleString('en-US')}`;
      } else {
        t.uplinkTurns = GOLDEN_UPLINK;
        desc = `a MAIA uplink for ${GOLDEN_UPLINK} turns`;
      }
    } else if (c.kind === 'repair') {
      desc = `field repair (+${t.heal(Math.round(t.maxHp * 0.3 + t.maxArmour * 0.2))})`;
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
    // driving into a tree knocks it down, at a cost (not from a bridge or anything else above it)
    for (const tr of this.terrain.trees) {
      if (tr.alive && Math.abs(tr.x - nx) < TANK_W / 2 + 3 && Math.abs(tr.x - nx) < Math.abs(tr.x - t.x)
        && t.y > this.terrain.hAt(tr.x) - this.terrain.treeHeight(tr) + 4) this.ramTree(t, tr);
    }
    t.x = nx;
    t.fuel--;
    t.walking = 4;
  }

  // W: hop in the facing direction for JUMP_FUEL of a full tank
  // L: leap, the same arc on a far bigger scale, for LEAP_FUEL of a full tank; she lands softly
  jump(t, leap = false) {
    const cost = Math.ceil(t.maxFuel * (leap ? LEAP_FUEL : JUMP_FUEL) * (hasTrait(t, 'wings') ? 0.5 : 1)); // Ikaros's wings: half
    if (this.phase !== 'aim' || t !== this.active || t.falling || t.fuel < cost || (leap && t.upgrades.deck)) { this.sfx.deny(); return false; } // (no leaping with a flight deck on)
    t.fuel -= cost;
    t.vy = leap ? LEAP_VY : JUMP_VY;
    t.jvx = t.facing * (leap ? LEAP_VX : JUMP_VX);
    t.leaping = leap;
    if (leap) { for (let i = 0; i < 10; i++) this.particles.puff(t.x + (Math.random() - 0.5) * 30, t.y); this.shake = Math.max(this.shake, 3); }
    t.fallFrom = t.y;
    t.jumping = true;
    t.falling = true; // (no driving mid-air, and the turn waits for her to land)
    this.particles.puff(t.x, t.y);
    this.sfx.click();
    return true;
  }

  updateAim() {
    const t = this.active;
    if (!t.alive) { // she died on her own turn (drove into a tree, fell, a live wire): it passes on
      this.charging = false;
      this.input.queue.length = 0;
      if (this.range) this.resetRange(); else this.nextTurn();
      return;
    }
    if (this.cinematic > 0) { this.input.queue.length = 0; return; } // the spy plane's pass: everyone watches
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
        } else if (a.aimAt) { // dragged from her: face the finger and point the gun at it
          const p = t.pivot(), dx = a.aimAt.x - p.x, dy = a.aimAt.y - p.y;
          if (Math.hypot(dx, dy) < 12) continue;
          t.facing = dx < 0 ? -1 : 1;
          t.elev = deg(Math.atan2(-dy, Math.abs(dx))) - t.hullAngle(t.facing);
        } else if (a.drop) { // S: step off the bridge she stands on, to the ground below
          if (!t.falling && t.y < this.terrain.hAt(t.x) - 6 && this.groundAt(t.x, t.y, true) > t.y + 4) { t.dropT = 8; this.sfx.click(); } else this.sfx.deny();
        } else if (a.jump) {
          this.jump(t, a.jump === 'leap');
        } else if (a.repair) {
          this.useRepair(t);
          return;
        } else if (a.recall) { // X: her squads home (the selected plane weapon's, else all of them)
          this.recallSquads(t, t.weapon.air && this.recallable(t, t.weapon).length ? t.weapon : null);
        } else if (a.ability) {
          this.useAbility(t, a.ability);
        } else if (a.endTurn) {
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
      this.charging = true;
      t.charge = Math.min(t.chargeCap(), t.charge + w.maxCharge * 0.005); // A3 Weapon.Update
    } else if (this.charging) {
      this.charging = false;
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
    if (!w.air && !t.firedThisTurn && reloadOf(w)) t.reload[w.id] = reloadOf(w) + 1; // sits out reloadOf(w) of its owner's turns
    // a golden crate's long uplink: the first shot of each of her next few turns calls MAIA
    const linked = !!t.uplink || (t.uplinkTurns > 0 && !t.firedThisTurn);
    if (t.uplinkTurns > 0 && !t.firedThisTurn) t.uplinkTurns--;
    t.shotsLeft--;
    t.firedThisTurn = true;
    const dir = t.aimVec();
    // armed abilities go on this shot, then recharge
    const dbl = t.armed.double;
    if (dbl) t.cooldown.double = ABILITY_BY_ID.double.cd;
    if (t.armed.over) t.cooldown.over = ABILITY_BY_ID.over.cd;
    t.lastCharge = t.charge / t.chargeCap();
    t.armed = { double: false, over: false };
    this.salvo = { t, w, vx: dir.x * t.charge, vy: dir.y * t.charge, left: (w.salvo + (w.kind === 'rocket' && hasTrait(t, 'telemetry') ? 1 : 0)) * (dbl ? 2 : 1), timer: 0, first: true, uplink: linked, designate: this.designation(t) };
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
    const sp = spreadOf(s.w, t);
    const vx = s.vx + (rng.next() - 0.5) * sp;
    const vy = s.vy + (rng.next() - 0.5) * sp;
    const p = new Projectile(this, s.w, t, m.x, m.y, vx, vy, s.first);
    p.launch = Math.atan2(-vy, Math.abs(vx)); // launch angle above the horizon: steeper shots earn more altitude bonus
    p.uplink = s.uplink && s.first;
    if (s.designate) { // the designator's dot goes out ahead of every round (no damage)
      p.designate = s.designate;
      const q = s.designate.point ? s.designate : seekCenter(s.designate);
      this.lasers.push(new Laser(m.x, m.y, q.x, q.y, '#ff3a4a', 3, 16));
    }
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
    else if (t.alive && t.shotsLeft > 0 && (!t.weapon.air || t.squadsFree(t.weapon) > 0)) this.startAim(); // autoloader (planes: her next squad): same tank fires again
    else this.nextTurn();
  }

  // ------------------------------------------------------------ satellite
  startSatellite() {
    if (!this.satellite.alive) { // shot down: the uplink finds nobody home
      this.particles.text(this.satTarget.x, this.satTarget.y - 50, 'MAIA offline', '#9a90b0');
      this.satTarget = null;
      return;
    }
    this.satSeq = { t: 0, target: this.satTarget, owner: this.satTarget.owner, barrage: this.satTarget.barrage || null, lock: this.satTarget.lock || null, w: this.satTarget.w || null };
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
    if (s.barrage) { this.updateBarrage(s, sat); return; }
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

  // Yukikaze's Hatsuyuki barrage: MAIA opens its wings and antenna (about 40 frames), then fires
  // b.pulses strikes b.gap frames apart at the target its rocket locked onto (or where it landed). Each does b.mult x the rocket's damage, whatever MAIA's
  // level or health, so the call is worth the same from round one.
  updateBarrage(s, sat) {
    const b = s.barrage;
    const start = 80;
    sat.charge = s.t < start ? clamp((s.t - 30) / 50, 0, 1) : 0.6;
    const k = (s.t - start) / b.gap;
    if (s.t >= start && k % 1 === 0 && k < b.pulses) {
      const c = s.lock && s.lock.alive ? seekCenter(s.lock) : s.target; // it tracks a locked target
      const tg = { x: c.x + (k ? (rng.next() - 0.5) * 50 : 0), y: c.y };
      const lens = sat.lens();
      this.lasers.push(new Laser(lens.x, lens.y, tg.x, tg.y, k % 2 ? '#bfe8ff' : '#fffff0', 14, 40));
      this.sfx.satFire();
      const r = b.r * (hasTrait(s.owner, 'uplink') ? 1.3 : 1);
      const dmg = b.mult * s.w.dmg; // a multiple of the rocket's own damage: the same whatever MAIA's level or health
      this.explode(tg.x, tg.y, { maia: true, dmg, dmgR: r, explR: 8, from: { x: lens.x - tg.x, y: lens.y - tg.y } }, s.owner, 'laser');
      this.cam.follow({ x: s.target.x, y: s.target.y });
    }
    if (s.t > start + b.gap * b.pulses + 50) this.satSeq = null;
  }

  // ------------------------------------------------------------ combat rules
  impact(p, r) {
    const w = p.w;
    if (r && r.hit === 'tree' && this.report) this.report.treeHit = true;
    if (w.tower) { // a radio tower's broken top has come down on something
      this.explode(p.x, p.y, { dmg: w.dmg, dmgR: w.dmgR, explR: w.explR, from: { x: -p.vx, y: -p.vy } }, null, 'shell');
      this.towerLanded(p);
      return;
    }
    if (w.kind === 'air') { // the designator's dot has landed: a squad (or a whole fleet) is coming
      if (r && r.hit !== 'out') {
        const q = w.fleet && p.owner.wing(w).find((q) => !q.tasked && q.state === 'deck');
        if (q) this.projectiles.push(new FleetStrike(this, p.owner, p, w, q));
        else this.launchSquad(p);
      }
      return;
    }
    if (w.kind === 'laser') {
      // the pointer has landed: the drone climbs until it can see the spot and fires (lasers.js)
      if (r && r.hit !== 'out') this.projectiles.push(new DroneBeam(this, w, p.owner, p));
    } else {
      const bonus = this.shotBonus(p);
      if (p.aaCut) { bonus.dmg *= p.aaCut; bonus.visR = (bonus.visR || bonus.dmgR) * (0.4 + 0.6 * p.aaCut); } // got through the point defence, damaged (and a smaller bang)
      this.explode(p.x, p.y, { ...bonus, from: { x: -p.vx, y: -p.vy } }, p.owner, w.kind === 'acid' ? 'acid' : 'shell');
      if (w.kind === 'acid') {
        for (let i = 0; i < 30; i++) {
          const a = -Math.PI * (0.1 + 0.8 * rng.next());
          const sp = 2 + rng.next() * 6;
          this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 4, Math.cos(a) * sp, Math.sin(a) * sp, w.acid));
        }
        this.sfx.acid();
      }
      if (w.kind === 'flak' || w.airburst) this.shrapnel(p);
      if (w.orbital) this.projectiles.push(new OrbitalStrike(this, p.owner, p, w.orbital)); // November's Verdict (finals.js)
      if (w.naito) this.projectiles.push(new NaitoStrike(this, p.owner, p, w.naito)); // 15X's Zero Point
      if (w.array) this.projectiles.push(new MaiaArray(this, p.owner, p, w.array)); // Innocentia's Constellation
      if (w.battery) this.projectiles.push(new BatteryStrike(this, p.owner, p, w.battery)); // G.W. Tiger's Ragnarök
      if (w.rift) this.projectiles.push(new SkyTear(this, p.owner, p, w.rift)); // Alban's Morrighan
      if (w.incendiary && w.frag) { // a burning fragment: a small patch of fire that sticks and scorches
        for (let i = 0; i < 2; i++) this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 2, (rng.next() - 0.5) * 3, -1 - rng.next() * 2, w.incendiary, true));
      }
    }
    if (p.storm) this.lightning(p, w);
    if ((w.sat || p.uplink) && p.main && w.kind !== 'laser') {
      // Yukikaze's barrage goes for whatever its rocket was locked onto, wherever the rocket landed
      const lock = w.maia && p.lastLock && p.lastLock.alive ? p.lastLock : null;
      const at = lock ? seekCenter(lock) : p;
      this.satTarget = { x: at.x, y: at.y, owner: p.owner, barrage: w.maia || null, lock, w };
    } // a laser's MAIA call follows its beam
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
    if (hit) { hit.region = reg.tag; this.hitPopup(c.x, c.y - 70, amt, hit, sat); }
    if (owner) { owner.stats.dealt += amt * 0.25; }
    this.sfx.hit();
    if (!sat.alive) {
      this.particles.explosion(c.x, c.y, 160, 'laser');
      this.shake = Math.max(this.shake, 8);
      // it stays down for SAT_DOWN_CYCLES turn cycles (2n turns), then reboots at half health
      const down = SAT_DOWN_CYCLES * Math.max(1, this.tanks.filter((t) => t.alive).length);
      sat.downUntil = this.turnCount + down;
      this.ui.notice(`${owner ? owner.name : 'Someone'} knocked MAIA offline for ${down} turns.`);
      this.events.push('MAIA is offline.');
    } else this.events.push(`${owner ? owner.name : 'Something'} hit MAIA (${reg.tag.toLowerCase()}): ${Math.round(sat.health * 100)}%.`);
  }

  // every turn: MAIA's max health follows the average toughness of the vehicles still standing;
  // once a turn cycle (every n turns, n players standing) it repairs SAT_HEAL of that
  satTurn(fresh = false) {
    const sat = this.satellite;
    const alive = this.tanks.filter((t) => t.alive);
    if (!alive.length) return;
    const max = alive.reduce((a, t) => a + t.maxHp + t.maxArmour, 0) / alive.length;
    const was = sat.alive;
    if (!fresh && !was && this.turnCount < (sat.downUntil || 0)) { sat.maxHp = max; return; } // still offline
    const heal = this.turnCount % alive.length === 0 ? max * SAT_HEAL : 0;
    sat.hp = fresh ? max : !was ? max * SAT_REBOOT : clamp(sat.hp * (max / sat.maxHp) + heal, 0, max);
    sat.maxHp = max;
    if (!was && sat.alive) this.ui.notice('MAIA is back online.');
  }

  // A damage popup that reads the hit: the number grows and heats up the closer to dead centre it
  // landed (and with the size of the hit), with a quality tag and a chip per modifier underneath.
  // It rides on its target (`on`), and while it lasts further hits add to it instead of stacking
  // another on top: the total, the best hit's tier, a hit count and the latest hit's chips
  hitPopup(x, y, amt, h, on = null) {
    const live = on && this.particles.list.find((p) => p.type === 'hit' && p.follow === on && p.kind !== 'acid' && p.age < p.life - 0.3);
    const q = live ? Math.max(live.q, h.q) : h.q, total = (live ? live.total : 0) + amt, n = live ? live.n + 1 : 1;
    const tier = q > 0.85 ? 3 : q > 0.6 ? 2 : q > 0.3 ? 1 : 0;
    const color = HIT_TIERS[tier].color;
    const size = Math.round(18 + 22 * q + Math.min(18, Math.sqrt(total) * 0.9));
    const chips = [];
    if (h.alt >= 0.05) chips.push([`ALT +${Math.round(h.alt * 100)}%`, '#f2c45a']);
    if (h.kin >= 0.05) chips.push([`KIN +${Math.round(h.kin * 100)}%`, '#ff9a5a']);
    if (h.front > 1.01) chips.push([`FRONT ×${h.front.toFixed(2)}`, '#ffd84a']);
    if (h.front < 0.99) chips.push([`RAIN ×${h.front.toFixed(2)}`, '#8ab4ff']);
    if (h.sat) chips.push(['MAIA', '#ff78c8']);
    if (h.region) chips.push([`MAIA ${h.region}`, '#ff78c8']);
    if (h.sloped) chips.push(['SLOPED −20%', '#9ab0c8']);
    if (h.blocked) chips.push(['BARRIER −80%', '#78e6d2']);
    if (h.shield) chips.push(['DEFLECTOR ½', '#96d2ff']);
    if (h.capped) chips.push(['REDUNDANCY CAP', '#c3b0ff']);
    if (h.flak) chips.push(['FLAK ×2', '#78d8c4']);
    if (h.zone) chips.push(['HATSUYUKI FLEET', '#ff6070']);
    if (h.shieldHit) chips.push(['SHIELDING', '#9ae0ff']);
    if (h.aa) chips.push(['AA', '#e8d8a0']);
    if (h.pd) chips.push(['POINT DEFENCE', '#9ae0ff']);
    if (h.armour) chips.push(['ARMOUR', '#c8d2e4']);
    const tag = n > 1 ? `${HIT_TIERS[tier].tag} · ${n} HITS` : HIT_TIERS[tier].tag;
    const life = HIT_POPUP_LIFE + h.q + chips.length * 0.15;
    if (live) Object.assign(live, { q, total, n, str: String(Math.round(total)), color, size, tag, chips, punchAt: live.age, life: Math.max(live.life, live.age + life) });
    else this.particles.add({ type: 'hit', x, y, vx: 0, vy: -0.6, g: 0, drag: 0.98, life, q, total, n, punchAt: 0,
      str: String(Math.round(amt)), color, size, tag, chips, ...this.popupAnchor(on, x, y) });
    if (h.q > 0.85) this.shake = Math.max(this.shake, 5);
  }

  // where a popup rides: its offset from the target it follows (see Particles.update)
  popupAnchor(on, x, y) { return on ? { follow: on, ox: x - on.x, oy: y - on.y } : {}; }

  // acid's slow damage: one running total per target, above the hit popup, kept up while it burns
  acidPopup(t, amt) {
    const live = this.particles.list.find((p) => p.type === 'hit' && p.follow === t && p.kind === 'acid' && p.age < p.life - 0.3);
    if (live) {
      live.total += amt;
      live.str = String(Math.round(live.total));
      live.hidden = live.total < 1;
      live.life = Math.max(live.life, live.age + HIT_POPUP_LIFE);
      return;
    }
    this.particles.add({ type: 'hit', kind: 'acid', x: t.x, y: t.y - 125, vx: 0, vy: -0.6, g: 0, drag: 0.98, life: HIT_POPUP_LIFE, total: amt, n: 1, punchAt: 0,
      str: String(Math.round(amt)), hidden: amt < 1, color: '#c8f0a0', size: 20, tag: 'ACID', chips: [], ...this.popupAnchor(t, t.x, t.y - 125) });
  }

  // a rocket that transforms in flight but hits before it does: half damage (the payload is the point)
  bodyFactor(p) { const w = p.w; return (w.carpet || w.split || w.lance) && !p.charging && !p.dropped ? 0.5 : 1; }

  // Object 15X's laser designator: what she has selected. A player's target marker snaps to a
  // vehicle, drone or the satellite within DESIGNATE_SNAP of it (and follows it), otherwise it
  // designates the marked point; a CPU designates the target of its plan.
  designation(t) {
    if (!hasTrait(t, 'designator')) return null;
    if (t.isCpu) return this.cpu && this.cpu.tank === t && this.cpu.plan ? this.cpu.plan.target || null : null;
    if (!t.mark) return null;
    let best = null, bd = DESIGNATE_SNAP;
    for (const c of this.targets()) {
      if (c === t || !c.alive) continue;
      const q = seekCenter(c), d = dist(q.x, q.y, t.mark.x, t.mark.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best || { x: t.mark.x, y: t.mark.y, alive: true, point: true };
  }

  shotBonus(p) {
    const w = p.w;
    const alt = altitudeBonus(p.y - p.peak, p.launch || 0);
    const speed = Math.hypot(p.vx, p.vy);
    const body = this.bodyFactor(p);
    // a fast impact: a percentage on top, like the altitude bonus (w.kin: a weapon's own multiplier
    // makes it climb to the cap sooner)
    const kin = Math.min(KINETIC_MAX, Math.max(0, speed - KINETIC_MIN_SPEED) * KINETIC_PER_SPEED * (p.charging ? w.lance.kin : w.kin || 1));
    const front = this.frontMult(p);
    return { ...w, alt, front, kinPct: kin, dmg: w.dmg * body * (1 + alt) * (1 + kin) * front, kin: null };
  }

  // flak burst: fragments rain down from the airburst
  shrapnel(p) {
    // fused on an aircraft, the burst throws a dense, fast cone of heavier fragments at it
    const air = p.fuseTarget && p.fuseTarget.alive ? p.fuseTarget.center() : null;
    const frag = { id: 'frag', name: 'Shrapnel', kind: 'shell', dmg: p.w.dmg * (air ? 0.45 : 0.2), dmgR: air ? 40 : 24, explR: 2, salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: 1, maxCharge: 10, frag: true, incendiary: p.w.incendiary || 0 };
    // fused on a plane, it fans out over every aircraft near it (its squadmates too), the fragments
    // dealt round them, each thrown where that one will be: the whole squadron is caught
    const flock = air ? this.aaAircraft(p.owner).filter((e) => e.alive && (e.isPlane || e.flying) && dist(e.center().x, e.center().y, p.x, p.y) < FLAK_REACH + p.w.dmgR * 2) : [];
    const n = p.w.incendiary ? 3 : air ? Math.min(28, 10 + Math.min(6, Math.round(p.w.dmgR / 40)) + 3 * Math.max(0, flock.length - 1)) : 6 + Math.min(6, Math.round(p.w.dmgR / 40)); // incendiary: fewer, burning
    for (let i = 0; i < n; i++) {
      // a downward cone, or thrown at the aircraft (led by its speed), so the fragments hit them
      let a, sp = air ? 16 + rng.next() * 4 : 3 + rng.next() * 5;
      if (air && flock.length) { // a ballistic solution onto where it will be (low arc)
        const e = flock[i % flock.length];
        let q = e.center(), T = 0;
        for (let it = 0; it < 3; it++) {
          const tx = q.x + (e.vx || 0) * T - p.x, ty = -(q.y + (e.vy || 0) * T - p.y), v2 = sp * sp; // (y up)
          const disc = v2 * v2 - GRAV * (GRAV * tx * tx + 2 * ty * v2);
          if (disc < 0) { a = Math.atan2(-ty, tx); break; }
          const th = Math.atan2(v2 - Math.sqrt(disc), GRAV * Math.abs(tx) || 1e-6);
          a = tx >= 0 ? -th : Math.PI + th;
          T = Math.abs(tx) / Math.max(1, sp * Math.cos(th));
        }
        a += (rng.next() - 0.5) * 0.08;
      } else a = air ? Math.atan2(air.y - p.y, air.x - p.x) + (rng.next() - 0.5) * 0.7 : Math.PI / 2 + (rng.next() - 0.5) * 1.6;
      const f = new Projectile(this, frag, p.owner, p.x, p.y, Math.cos(a) * sp + p.vx * (air ? 0 : 0.2), Math.sin(a) * sp, false);
      f.age = 10;
      this.projectiles.push(f);
    }
  }

  explode(x, y, def, owner, palette = 'shell') {
    if (this.report) this.report.blasts.push({ x, y });
    if (y > this.terrain.hAt(x) - (def.explR || 10) * 4 - 20) this.terrain.crater(x, def.explR || 10); // airbursts don't dig
    if (this.terrain.forts.length) this.blastForts(x, y, def);
    this.blastInfra(x, y, def);
    this.blastGiants(x, y, def);
    this.blastAhu(x, y, def);
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
      // (a hostile: from the nearest point of its body, so a hit on a long hull counts as one)
      const d = t.isMob ? Math.hypot(Math.max(0, Math.abs(x - t.x) - t.hw), Math.max(0, t.y - t.hh - y, y - t.y)) : dist(c.x, c.y, x, y);
      let amt = d < def.dmgR ? def.dmg * (1 - d / def.dmgR) : 0;
      // what went into the hit, for the damage popup: accuracy (1 = dead centre) and each modifier
      const hit = { px: x, py: y, q: def.dmgR ? clamp(1 - d / def.dmgR, 0, 1) : 0, alt: def.alt || 0, front: def.front || 1, kin: def.kinPct || 0, sat: !!def.maia };
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
    this.particles.explosion(x, y, def.visR || def.dmgR, palette); // visR: set pieces look bigger than they hit
    this.sfx.explosion(Math.min(60, (def.explR || 10) + def.dmgR * 0.1));
    this.shake = Math.max(this.shake, Math.min(14, 2 + def.dmgR * 0.05));
  }

  // A3 Character.Damage: armour soaks hits until it is gone, then health takes them
  damage(t, amt, owner, quiet = false, def = null, hit = null) {
    if (!t.alive || amt <= 0) return;
    if (owner && owner.isMob && t.isMob) return; // hostiles never hurt each other
    if (owner && owner.isMob) owner = null; // mob attacks count as the environment
    if (t.isPlane) { this.damagePlane(t, amt, owner, def, hit); return; }
    if (t.isMob) { this.damageMob(t, amt, owner, def, hit); return; }
    if (t.isSat) { this.damageSat(t, amt, owner, hit); return; }
    if (t.dummy) { this.rangeHit(t, amt, hit); return; } // the Codex's training dummy
    if (this.range && this.range.drill && t === this.tanks[0]) { this.range.through += amt; this.particles.text(t.x, t.y - 40, String(Math.round(amt)), '#ff9a8a'); this.ui.codexReadout(); return; } // (an AA drill's rocket that got through)
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
      this.acidPopup(t, amt);
    } else if (amt > 3) {
      if (hit) this.hitPopup(t.x, t.y - 46, amt, hit, t);
      else this.particles.text(t.x + (Math.random() - 0.5) * 20, t.y - 40, String(Math.round(amt)), '#ffffff', amt > 100);
      this.sfx.hit();
      if (owner && owner !== t) this.events.push(`${owner.name} hit ${t.name} for ${Math.round(amt)}.`);
    }
    if (t.hp <= 0 && hasTrait(t, 'grace') && !t.graceUsed) { // Ikaros: once a round she won't fall
      t.hp = 1;
      t.graceUsed = true;
      this.particles.text(t.x, t.y - 80, 'GRACE', '#ffe8a0', true);
      for (let i = 0; i < 16; i++) this.particles.add({ x: t.x + (Math.random() - 0.5) * 30, y: t.y - 20 - Math.random() * 30, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, g: -0.02, drag: 0.97, life: 1.2, size: 3 + Math.random() * 3, color: i % 2 ? [255, 236, 160] : [255, 255, 255] });
      this.events.push(`${t.name} is saved by grace.`);
    }
    if (t.hp <= 0 && def && def.ord) t.airDowned = (t.airDowned || 0) + 1; // (a CPU remembers: see autoBuy)
    if (t.hp <= 0) this.kill(t, owner);
  }

  kill(t, owner) {
    t.hp = 0;
    t.alive = false;
    t.speech = null;
    if (this.report) this.report.kills.push({ victim: t, killer: owner && owner !== t ? owner : null });
    if (!t.isMob && !t.dummy) (this.deathOrder || (this.deathOrder = [])).push(t); // (for placement pay)
    this.particles.explosion(t.x, t.y - 8, 160, 'shell');
    this.sfx.explosion(55);
    this.sfx.die();
    this.shake = Math.max(this.shake, 12);
    if (owner && owner !== t) {
      owner.stats.kills++;
      this.events.push(`${owner.name} destroyed ${t.name}!`);
      const pay = KILL_BOUNTY + Math.round(KILL_SHARE * (t.maxHp + t.maxArmour)) + (t.bounty || 0); // (a tougher girl pays more)
      if (t.bountyWealth) { const fee = Math.min(t.money, t.bountyWealth); t.money -= fee; t.bountyWealth = 0; if (fee) this.events.push(`${t.name} pays ¢${fee} of the bounty on her out of her own purse.`); } // (a rich girl's price, paid by her)
      owner.money += pay + this.cpuCredit(owner, pay);
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
    if (this.range) { this.resetRange(); return; } // the Codex range has no rounds: she died out there, start it over
    this.phase = 'roundEnd';
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
    // a flat ROUND_BASE that grows by ROUND_STEP each round, so progression keeps pace over a run
    // each player: the flat base and a share of the round's damage, plus her own damage to rivals and
    // a placement bonus for the last two standing (the battle royale pays the fighters)
    const award = Math.round(ROUND_BASE + ROUND_STEP * (this.round - 1) + this.roundDamage * this.awardMult * PAY_SHARED);
    const place = PLACE_PAY + PLACE_STEP * (this.round - 1);
    const second = (this.deathOrder || []).slice(-1)[0];
    for (const t of this.tanks) {
      const own = Math.round((t.roundDealt || 0) * this.awardMult * PAY_OWN);
      const bonus = t === winner ? place : t === second ? Math.round(place / 2) : 0;
      t.roundPay = award + own + bonus;
      t.roundPayParts = { award, own, bonus };
      t.money += t.roundPay + this.cpuCredit(t, t.roundPay); // (a CPU's difficulty bonus: silent, not on the pay screen)
    }
    this.lastAward = Math.round(this.tanks.reduce((s, t) => s + t.roundPay, 0) / this.tanks.length); // (what a CPU plans its savings around)
    this.awardMult += 0.08;
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
    this.charging = false;
    this.paused = false;
    this.ui.showPause(false);
    const st = this.tanks.slice().sort((a, b) => b.wins - a.wins || b.stats.dealt - a.stats.dealt);
    this.phase = 'gameEnd';
    this.ui.showHud(false);
    this.ui.showGameEnd(st);
    if (this.tanks.some((t) => !t.isCpu) && !this.range) this.ui.unlockSecret(); // a first game played: Ikaros comes through
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
  cpuCredit(t, amt) { return t && t.isCpu ? Math.round(amt * ((CPU_CREDIT[t.type] || 1) - 1)) : 0; }
  sellValue(w) { return w.starter ? STARTER_SELL : w.cost; } // a full refund: trying a new gun should cost nothing (a starter: a little scrap)
  // what a gun costs her: a starter she sold comes back for what she got for it
  costOf(w) { return w.starter ? STARTER_SELL : w.cost; }
  // her own starting guns: in the shop again once she has sold them
  ownStarters(tank) { return [tank.vehicle.weapon, ...(tank.vehicle.extra || [])]; }

  buy(tank, kind, id) {
    if (kind === 'weapon') {
      const w = WEAPON_BY_ID[id];
      if (!w || tank.weapons.includes(id) || tank.weapons.length >= MAX_WEAPONS || tank.money < this.costOf(w) || !forVehicle(w, tank.vehicle.id) || (w.starter && !this.ownStarters(tank).includes(w))) { this.sfx.deny(); return false; }
      tank.money -= this.costOf(w);
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
    } else if (kind === 'aa') { // an air-defence mount into a free slot (two of the same can't share)
      const a = AA_BY_ID[id], slot = a ? aaSlotFor(tank, a.role) : -1;
      if (!a || a.starter || slot < 0 || tank.aa.includes(id) || tank.money < a.cost) { this.sfx.deny(); return false; }
      if (tank.aa[slot]) tank.money += this.aaSellValue(tank, tank.aa[slot]); // (her own mount, swapped out: scrap)
      tank.money -= a.cost;
      tank.aa[slot] = id;
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

  // anything but her last gun sells (her starter for scrap: it is the gun that never reloads, so think twice)
  canSell(tank, id) { return tank.weapons.length > 1; } // (her starter too: it frees the slot, for a little)

  // a girl's own mount (Zuihou's) came with her and stays; bought ones sell back in full
  canSellAA(tank, id) { return !!AA_BY_ID[id]; }
  aaSellValue(tank, id) { return aaOwn(tank, id) ? STARTER_SELL : AA_BY_ID[id].cost; } // (her own mount: a little scrap)
  sellAA(tank, id) {
    if (!this.canSellAA(tank, id)) { this.sfx.deny(); return false; }
    tank.money += this.aaSellValue(tank, id);
    tank.aa[tank.aa.indexOf(id)] = null;
    this.sfx.sell();
    return true;
  }

  sell(tank, id) {
    if (!this.canSell(tank, id)) { this.sfx.deny(); return false; }
    tank.weapons = tank.weapons.filter((x) => x !== id);
    tank.weaponIdx = 0;
    tank.money += this.sellValue(WEAPON_BY_ID[id]);
    this.sfx.sell();
    return true;
  }

  // CPU shopping between rounds: keep a couple of repair kits; buy a gun only if it is a clear upgrade
  // on its best one (selling the weakest when all its slots are full), and save up rather than
  // settle when something much stronger is within one more round's pay (Easy doesn't plan ahead and
  // sometimes buys at random); then abilities, then Health++ / Armour++ with what's left.
  // a CPU's strategy for the coming round, from the field it faces (see CPU_STRATEGIES): each one
  // scores from what its rivals carry and fly (and what it carries itself); Hard takes the best,
  // Normal usually does, Easy goes with its gut more often than not
  pickStrategy(t) {
    const rivals = this.tanks.filter((x) => x !== t && x.alive !== false);
    const guns = rivals.flatMap((x) => x.weapons.map((id) => WEAPON_BY_ID[id]));
    const mine = t.weapons.map((id) => WEAPON_BY_ID[id]);
    const rivalAA = rivals.reduce((s, x) => s + (x.aa || []).filter((id) => AA_BY_ID[id] && AA_BY_ID[id].role === 'air').reduce((a, id) => a + aaPower(AA_BY_ID[id]), 0), 0) / Math.max(1, rivals.length);
    const big = guns.filter((w) => !w.air && weaponValue(w) > 2500).length;
    const score = {
      antiair: guns.filter((w) => w.air).length * 2 + rivals.filter((x) => hasTrait(x, 'flightdeck')).length * 3 + (t.airDowned ? 3 : 0),
      pointdef: guns.filter((w) => w.kind === 'rocket' || w.carpet).length * 1.5 + rivals.filter((x) => hasTrait(x, 'firecontrol')).length * 2,
      airpower: (hasTrait(t, 'flightdeck') ? 4 : 0) + mine.filter((w) => w.air).length * 2 - rivalAA / 40,
      fortress: big * 1.5 + (t.hp < t.maxHp * 0.5 ? 1 : 0),
      hunter: this.events_on ? 0.5 + this.round * 0.3 + (this.mobs || []).filter((m) => m.alive).length * 0.3 : 0,
      balanced: 2.5,
    };
    const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
    const gut = t.type === 'easy' ? 0.6 : t.type === 'normal' ? 0.25 : 0;
    const pick = rng.chance(gut) ? rng.pick(ranked.slice(0, 3))[0] : ranked[0][0];
    if (pick !== t.strategy) this.events.push(`${t.name} goes for ${CPU_STRATEGIES[pick].name}.`);
    return pick;
  }

  autoBuy(t) {
    t.strategy = this.pickStrategy(t);
    const S = CPU_STRATEGIES[t.strategy];
    const kitsWanted = REPAIR_MAX;
    while (t.kits < kitsWanted && t.money >= REPAIR_COST * 2) { t.money -= REPAIR_COST; t.kits++; }
    // a flight deck once it flies planes (VTOL squads rearm longer): the more of its rack is planes,
    // the keener (two or more and even Easy buys one, ahead of guns and air defence)
    const planes = t.weapons.filter((id) => WEAPON_BY_ID[id].air).length;
    if (planes && !hasTrait(t, 'flightdeck') && !t.upgrades.deck && (t.type !== 'easy' || planes >= 2)) {
      const u = VEHICLE_UPGRADES.find((x) => x.id === 'deck');
      const need = planes >= 2 || S.deck ? 1 : 1.3; // (cash in hand over its price)
      if (t.money >= u.costs[0] * need) { t.money -= u.costs[0]; t.upgrades.deck = 1; }
    }
    const horizon = (this.lastAward || 500) * (t.type === 'hard' ? 2 : 1); // how far ahead it saves
    let reserve = 0;
    // air defence first (not Easy), from a share of its money: point defence if rivals carry rockets
    // or planes, else anti-air (from round 2, when drones come); one of each role for a second slot.
    // Once planes have killed it (any CPU, Easy too), anti-air comes first, from a bigger share, and
    // a lesser mount is traded in for the best anti-air gun it can afford
    const burned = (t.airDowned || 0) > 0;
    const mounts = () => t.aa.filter((id) => AA_BY_ID[id] && !aaOwn(t, id)).map((id) => AA_BY_ID[id]); // (bought ones)
    if (burned) {
      const best = AA_WEAPONS.filter((a) => a.role === 'air' && !t.aa.includes(a.id) && a.cost <= t.money * AA_SHARE_BURNED).sort((a, b) => b.cost - a.cost)[0];
      const air = mounts().find((a) => a.role === 'air');
      if (best && air && best.cost > air.cost * 1.5) { t.aa[t.aa.indexOf(air.id)] = null; t.money += air.cost; } // trade up
      if (best && !mounts().some((a) => a.role === 'air')) {
        let slot = aaSlotFor(t, 'air');
        const worst = mounts().sort((a, b) => a.cost - b.cost)[0];
        if (slot < 0 && worst) { slot = t.aa.indexOf(worst.id); t.aa[slot] = null; t.money += worst.cost; }
        if (slot >= 0 && best.cost <= t.money) { t.money -= best.cost; t.aa[slot] = best.id; }
      }
    }
    // then by what its rivals field: planes call for anti-air, rockets and carpets for point
    // defence (drones from round 2 count as aircraft); the bigger threat first, the other for a
    // second slot. A share of its money (more on Hard), and only for something clearly better than
    // what sits in that slot (her own starter is swapped out; a bought one is sold back first)
    {
      const rivals = this.tanks.filter((x) => x !== t && x.alive !== false).flatMap((x) => x.weapons.map((id) => WEAPON_BY_ID[id]));
      const threat = { air: rivals.filter((w) => w.air).length * 2 + (this.round >= 2 ? 1 : 0), missile: rivals.filter((w) => w.kind === 'rocket' || w.carpet).length * 1.5 };
      if (S.role) threat[S.role] += 100; // (its strategy says which comes first)
      const roles = ['air', 'missile'].filter((r) => threat[r] > 0).sort((a, b) => threat[b] - threat[a]);
      const share = t.money * Math.min(0.8, (t.type === 'hard' ? 0.6 : t.type === 'normal' ? 0.5 : 0.3) * S.aa);
      let spent = 0;
      for (const role of roles) {
        const fit = t.aa.findIndex((id) => !id || AA_BY_ID[id].role === role), slot = fit >= 0 ? fit : aaSlotFor(t, role);
        if (slot < 0) continue;
        const old = AA_BY_ID[t.aa[slot]];
        const refund = old ? this.aaSellValue(t, old.id) : 0;
        const pick = AA_WEAPONS.filter((a) => a.role === role && !t.aa.includes(a.id) && a.cost <= share - spent + refund).sort((a, b) => b.cost - a.cost)[0];
        if (!pick || (old && aaPower(pick) < aaPower(old) * 1.3)) continue;
        t.money += refund; t.money -= pick.cost; spent += pick.cost - refund;
        t.aa[slot] = pick.id;
      }
    }
    if (S.armour) for (let n = 0; n < S.armour; n++) { // (a fortress: health and armour levels before guns)
      const stat = t.upgrades.hp <= t.upgrades.armour ? 'hp' : 'armour', cost = this.upgradeCost(t, stat);
      if (t.upgrades[stat] >= 2 || t.money < cost * 1.6) break;
      t.money -= cost; t.upgrades[stat]++;
    }
    const worth = (w) => cpuValue(w, t); // (her own line counts for more, lasers for less)
    for (let n = 0; n < 4; n++) {
      const owned = t.weapons.map((id) => WEAPON_BY_ID[id]);
      const bestOwned = Math.max(...owned.map(worth));
      const sellable = owned.filter((w) => this.canSell(t, w.id) && !w.starter); // (a CPU keeps the gun that never reloads)
      const weakest = (sellable.length ? sellable : owned).slice().sort((a, b) => worth(a) - worth(b))[0];
      const full = t.weapons.length >= MAX_WEAPONS;
      const budget = t.money + (full ? this.sellValue(weakest) : 0);
      const shop = WEAPONS.filter((w) => !t.weapons.includes(w.id) && forVehicle(w, t.vehicle.id)).sort((a, b) => worth(b) - worth(a));
      let pick = shop.find((w) => w.cost <= budget);
      if (!pick) break;
      // not too clinical: any affordable gun within CPU_PICK_SPREAD of the best one's worth will do
      const close = shop.filter((w) => w.cost <= budget && worth(w) >= worth(pick) * CPU_PICK_SPREAD);
      pick = rng.pick(close);
      if (t.type === 'easy' && rng.chance(0.4)) pick = rng.pick(shop.filter((w) => w.cost <= budget));
      else {
        const later = shop.find((w) => w.cost <= budget + horizon);
        // save only when what it can afford now is a small step up; a big jump is bought straight away
        if (later && later !== pick && worth(later) > worth(pick) * 1.4 && worth(pick) < bestOwned * 1.6 && t.type !== 'easy') {
          reserve = Math.min(t.money, later.cost - (full ? this.sellValue(weakest) : 0)); // save up for it
          break;
        }
      }
      // classic: a gun must beat the best one owned; rebalanced: reloads make a rack of guns worth
      // having, so it only has to beat the one it replaces (or the starter, for an empty slot)
      const bar = BALANCE === 'rebalanced' ? worth(full ? weakest : t.vehicle.weapon) : bestOwned;
      if (worth(pick) < bar * 1.15) break; // not worth a slot
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
    if (S.armour && !wants.includes('shield')) wants.unshift('shield'); // (a fortress wants its Deflector)
    if (this.isLate() && t.type !== 'easy') wants.unshift('barrier'); // late game: a barrier first
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
  abilityUnlocked(t, ab) { return !ab.late || this.isLate(); }
  abilityCost(t, ab) { return ab.cost; }

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
  // bounties for the round: on the leader in wins, LEADER_BOUNTY a round-win of lead; and on anyone
  // much richer than the table (cash and half what her guns cost), WEALTH_BOUNTY of the difference,
  // which comes out of her own purse when she is killed (so a fat lead is a fat target)
  updateBounties() {
    const worth = (t) => t.money + t.weapons.reduce((s, id) => s + (WEAPON_BY_ID[id].starter ? 0 : WEAPON_BY_ID[id].cost * 0.5), 0);
    const avg = this.tanks.reduce((s, t) => s + worth(t), 0) / Math.max(1, this.tanks.length);
    for (const t of this.tanks) {
      t.bountyWealth = this.round > 1 ? Math.round((Math.max(0, worth(t) - avg) * WEALTH_BOUNTY) / 50) * 50 : 0;
      t.bounty = t.bountyWealth;
    }
    const st = this.tanks.slice().sort((a, b) => b.wins - a.wins);
    if (st.length > 1 && st[0].wins > st[1].wins) st[0].bounty += LEADER_BOUNTY * (st[0].wins - st[1].wins);
    for (const t of this.tanks.filter((x) => x.bounty > 0).sort((a, b) => b.bounty - a.bounty)) {
      this.events.push(`There is a ¢${t.bounty} bounty on ${t.name}.`);
      if (this.round > 1) this.ui.notice(`Bounty: ¢${t.bounty} on ${t.name}.`);
    }
  }

  // Repair kit: restores part of health and armour, and uses up this turn (no shot).
  useRepair(t) {
    if (this.phase !== 'aim' || t !== this.active || t.kits <= 0 || t.firedThisTurn) { this.sfx.deny(); return false; }
    t.kits--;
    const got = t.heal(Math.round((t.maxHp + t.maxArmour) * REPAIR_FRAC)); // (health first, then armour)
    this.particles.text(t.x, t.y - 40, `+${got}`, '#8fe0a0', true);
    for (let i = 0; i < 16; i++) {
      this.particles.add({ x: t.x + (Math.random() - 0.5) * 30, y: t.y - Math.random() * 20, vx: 0, vy: -0.6 - Math.random(), g: 0, drag: 0.99, life: 0.9, size: 4, color: [90, 200, 120] });
    }
    this.sfx.repair();
    this.events.push(`${t.name} used a repair kit (+${got}).`);
    if (t.isCpu && Math.random() < 0.6) this.banter(t, 'repair');
    // using the kit is the turn
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
        upgrades: t.upgrades, weapons: t.weapons, kits: t.kits, abilities: t.abilities, stats: t.stats, aa: t.aa,
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
      t.weapons = ws.length ? ws : [t.vehicle.weapon, ...(t.vehicle.extra || [])].map((w) => w.id);
      t.kits = clamp(s.kits | 0, 0, REPAIR_MAX);
      if (Array.isArray(s.aa)) t.aa = t.aa.map((v, i) => (AA_BY_ID[s.aa[i]] ? s.aa[i] : v));
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
      this.acc = (this.acc || 0) + Math.min(0.1, dtReal) * this.speed * (this.timeScale || 1); // set pieces can slow time (bullet time)
      let n = 0;
      while (this.acc >= DT && n < 800) { this.step(); this.acc -= DT; n++; }
    }
    this.render();
    this.ui.updateHud(this);
  }

  render() {
    const ctx = this.ctx;
    const k = this.k;
    const cam = this.cam;
    const s = k * VIEW_SCALE * cam.zoom;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.bg.drawSky(ctx, cam);
    // very high up (the NXi fleet shot) the sky gives way to space
    const space = clamp((-cam.y - 900) / 1400, 0, 1);
    if (space > 0) drawSpace(ctx, space, this.time);
    if (this.ascent > 0) drawAscent(ctx, this.ascent, this.time, this.ascentDir || 1); // a set piece's climb (or fall)

    // world
    const sx = this.shake > 0.5 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    const sy = this.shake > 0.5 ? (Math.random() - 0.5) * this.shake * 2 : 0;
    ctx.setTransform(s, 0, 0, s, -(cam.x + sx) * s, -(cam.y + sy) * s);
    if (cam.rot) { // a camera roll (the NXi fleet shot): turn the world about the middle of the screen
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(cam.rot);
      ctx.translate(-W / 2, -H / 2);
      ctx.transform(VIEW_SCALE * cam.zoom, 0, 0, VIEW_SCALE * cam.zoom, -(cam.x + sx) * VIEW_SCALE * cam.zoom, -(cam.y + sy) * VIEW_SCALE * cam.zoom);
    }
    this.satellite.draw(ctx);
    for (const p of this.projectiles) if (p.drawBack) p.drawBack(ctx); // set pieces' backdrops, behind the hills
    this.bg.drawRidges(ctx, cam);
    for (const p of this.projectiles) if (p.drawMid) p.drawMid(ctx); // (over the far hills: the Parallel Night's sea)
    this.drawHazardsBack(ctx, cam);
    this.terrain.draw(ctx, cam.x, cam.x + cam.w);
    this.terrain.drawTrees(ctx, cam.x, cam.x + cam.w);
    this.drawGiants(ctx);
    this.drawAhu(ctx);
    this.drawInfra(ctx);
    const aiming = this.phase === 'aim' ? this.active : null;
    if (aiming && !this.cpu) this.drawGhost(ctx, aiming);
    for (const t of this.tanks) t.draw(ctx, t === aiming);
    this.drawDrones(ctx, aiming && !this.cpu ? aiming : null);
    this.drawPlanes(ctx);
    if (aiming && !this.cpu) this.drawAimGuide(ctx, aiming);
    if (aiming && !this.cpu && aiming.mark) this.drawMark(ctx, aiming);
    if (aiming && hasTrait(aiming, 'designator')) { // her laser dot sits on the designated target
      const d = this.designation(aiming);
      if (d && d.alive) {
        const q = designPoint(d);
        ctx.fillStyle = (this.time * 4 | 0) % 2 ? '#ff3a4a' : '#ffd0d4';
        sq(ctx, q.x, q.y, 5);
        ctx.fillStyle = 'rgba(255,58,74,0.35)';
        sq(ctx, q.x, q.y, 11);
      }
    }
    for (const d of this.drops) d.draw(ctx);
    for (const c of this.crates) c.draw(ctx);
    for (const f of this.flyovers) f.draw(ctx);
    this.drawTraces(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const l of this.lasers) l.draw(ctx);
    this.drawHazardsFront(ctx, cam);
    this.particles.draw(ctx);

    // snow (screen pixels), and the flash of a lightning strike
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (space < 0.3) this.bg.drawSnow(ctx);
    if (this.screenFlash > 0.01) {
      ctx.fillStyle = `rgba(235,245,255,${this.screenFlash})`;
      ctx.fillRect(0, 0, W, H);
      this.screenFlash *= 0.82;
    }
    for (const p of this.projectiles) if (p.drawScreen) p.drawScreen(ctx); // set pieces' full-screen scenes

    // HUD in the original's 1600x900 screen units
    ctx.setTransform(k * VIEW_SCALE, 0, 0, k * VIEW_SCALE, 0, 0); // the HUD never zooms
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
      ctx.fillStyle = `rgba(255,255,255,${a})`; // a white rim, so it reads on dark ground too
      sq(ctx, x, y, 7);
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
    for (const [col, s] of [['#ffffff', 7], [t.color, 4]]) { // white rim first, so it reads on dark ground
      ctx.fillStyle = col;
      for (let d = 8; d <= 20; d += 6) {
        sq(ctx, x - d, y, s); sq(ctx, x + d, y, s); sq(ctx, x, y - d, s); sq(ctx, x, y + d, s);
      }
    }
    ctx.fillStyle = '#ffffff';
    sq(ctx, x, y, 4);
  }

  drawHud(ctx) {
    const cam = this.cam;
    const sat = this.satellite;
    // satellite caption (A3 Satellite.Draw)
    if (cam.sy(sat.y) > -80) {
      ctx.font = `15px ${HUD_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sat.name}-Class Low Orbit Ion Cannon`, Math.round(cam.sx(sat.x) + 120), Math.round(cam.sy(sat.y) + 4));
      ctx.fillText(`Level: ${sat.level} · ${sat.alive ? Math.round(sat.health * 100) + '% power' : `OFFLINE (${Math.max(0, (sat.downUntil || 0) - this.turnCount)} turns)`}`, Math.round(cam.sx(sat.x) + 120), Math.round(cam.sy(sat.y) + 26));
      // MAIA's health bar (its strike damage scales with it)
      const bx = Math.round(cam.sx(sat.x) + 120), by = Math.round(cam.sy(sat.y) + 34);
      ctx.fillStyle = HUD.plate;
      ctx.fillRect(bx, by, 204, 10);
      ctx.fillStyle = sat.health > 0.5 ? '#ff78c8' : sat.alive ? HUD.gold : HUD.ash;
      ctx.fillRect(bx + 2, by + 2, Math.round(200 * sat.health), 6);
    }
    const live = this.phase === 'aim' ? this.active : null;
    for (const t of this.tanks) t.drawLabel(ctx, cam.sx(t.x), cam.sy(t.y), t === live);
    this.drawHazardLabels(ctx, cam);
    this.drawPlaneLabels(ctx, cam);
    this.particles.drawText(ctx, cam);
    for (const t of this.tanks) t.drawSpeech(ctx, cam.sx(t.x), cam.sya(t.y, LABEL_ANCHOR));
    // shells above the view
    ctx.fillStyle = '#ffffff';
    for (const p of this.projectiles) {
      if (p.y < cam.y) {
        const x = clamp(cam.sx(p.x), 10, VIEW_W - 10);
        sq(ctx, x, 8, 6);
        sq(ctx, x, 16, 12);
      }
    }
    this.drawMinimap(ctx);
    this.drawWindMarker(ctx);
    const t = this.active;
    this.markInfo = this.phase === 'aim' && t && !this.cpu && t.mark ? this.markPower(t) : null;
    if (this.markInfo) this.drawMarkLabel(ctx, t, this.markInfo);
    // until a player has used it once: a hint that clicking the map shows the power a target needs
    else if (this.phase === 'aim' && t && !this.cpu && !this.range && !t.firedThisTurn && !store.get('markUsed')) {
      const txt = 'Tip: click a target to see the power it needs';
      ctx.font = `13px ${HUD_FONT}`;
      ctx.textAlign = 'center';
      const w = ctx.measureText(txt).width + 16;
      const bx = Math.round(VIEW_W - 80 - w), by = 752;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time * 3);
      ctx.fillStyle = HUD.plate;
      ctx.fillRect(bx, by, Math.round(w), 22);
      ctx.fillStyle = t.color;
      ctx.fillRect(bx, by, 4, 22);
      ctx.fillStyle = HUD.dim;
      ctx.fillText(txt, Math.round(bx + w / 2 + 2), by + 16);
      ctx.globalAlpha = 1;
    }
    if (t && this.phase !== 'roundEnd') this.drawBars(ctx, t);
  }

  // A3 UI_Minimap: a track at the top right with a dot per tank, on a dark plate
  drawMinimap(ctx) {
    const x0 = VIEW_W - 410, y0 = 80, w = 360, h = 20;
    const mx = (x) => x0 + (w * clamp(x, 0, WORLD_W)) / WORLD_W;
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(x0 - 10, y0 - 12, w + 20, h + 24);
    ctx.fillStyle = HUD.line;
    ctx.fillRect(x0, y0 + h / 2 - 1, w, 2);
    ctx.fillRect(x0 - 1, y0 + 2, 2, h - 4);
    ctx.fillRect(x0 + w - 1, y0 + 2, 2, h - 4);
    ctx.fillStyle = 'rgba(195,176,255,0.14)';
    ctx.fillRect(mx(this.cam.x), y0 + 1, (w * this.cam.w) / WORLD_W, h - 2);
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
    const mx = VIEW_W / 2 - 10, top = 38;
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
    const sx = this.cam.sx(t.mark.x);
    const sy = this.cam.sy(t.mark.y);
    let txt;
    let col = HUD.fg;
    if (info.behind) txt = info.past ? 'lower the gun: it points back over her' : info.over ? 'turn around, or aim back past vertical' : 'turn around';
    else if (info.far || info.frac > 1) { txt = 'out of reach at this angle'; col = HUD.hot; }
    else { txt = `power ${Math.round(info.frac * 100)}%${info.blocked ? ' · blocked' : ''}`; if (info.blocked) col = HUD.hot; }
    ctx.font = `13px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 16;
    // by the marker while it's on screen, otherwise above the charge bar
    const on = sx > 0 && sx < VIEW_W && sy > 60 && sy < VIEW_H - 120;
    const bx = Math.round(on ? clamp(sx - w / 2, 8, VIEW_W - w - 8) : VIEW_W - 80 - w);
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
    const x0 = VIEW_W - 480, w = 400;
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
