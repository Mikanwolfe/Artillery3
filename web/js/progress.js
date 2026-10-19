'use strict';
// Progression: a new player starts with G.W. Tiger and a plain duel. Every round cleared counts
// (one won counts two), and at set counts a tier unlocks: the next girl (in roster order, Ikaros
// last), new hostiles and events, and more of the shop. Kept in this browser (store 'prog'). It only
// applies to matches started from the menu (opts.prog): ?auto matches and the Codex range have it
// all. A first visit asks whether they have played before; if not, a short tutorial match with
// G.W. Tiger and a coach box (Tutorial, below).
// Hooks: Game.has (hazards, mobs, zone, forts, crates, the spy plane), Game.itemOk (shop and CPU
// buying), Game.endRound (progClear), UI.roster, UI.showProgress / the menu's progress card.

const PROG_TIERS = [
  { at: 0, girl: 'gwt', rarity: 2, core: 2, kinds: ['shell', 'gun'], feats: [],
    foes: 'None. Players only.', gear: 'Common and Uncommon shells and guns. Cores I–II. Health, armour, repair kits, vehicle upgrades.' },
  { at: 2, girl: 'obj', rarity: 3, core: 2, kinds: ['laser'], feats: ['crates', 'forts', 'fronts', 'abilities'],
    foes: 'Supply crates. Forts. Weather fronts.', gear: 'Lasers. Rare guns. Abilities: Double Shot, Overcharge, Deflector.' },
  { at: 4, girl: 'nxi', rarity: 4, core: 3, kinds: [], feats: ['drones', 'debris', 'aa'],
    foes: 'Drones. Gunners. Falling debris.', gear: 'Air-defence mounts. Epic guns. Cores III.' },
  { at: 7, girl: 'int', rarity: 5, core: 4, kinds: ['acid', 'flak'], feats: ['turrets', 'sudden', 'spy'],
    foes: 'Shore batteries. Sudden death. Spy plane.', gear: 'Acid. Flak. Mythical guns. Cores IV.' },
  { at: 10, girl: 'alb', rarity: 6, core: 5, kinds: ['rocket'], feats: ['fpv', 'zone', 'barrier'],
    foes: 'FPV drones. Closing zone.', gear: 'Rockets. Legendary guns. Bulwark Barrier. Cores V.' },
  { at: 14, girl: 'zui', rarity: 7, core: 6, kinds: ['air'], feats: ['blimp', 'ground', 'deck'],
    foes: 'Blimps. Drone carriers. Drone tanks. AA tanks.', gear: 'Aircraft. Flight deck. Godly guns. Cores VI.' },
  { at: 18, girl: 'ang', rarity: 8, core: 6, kinds: [], feats: ['boss', 'android'],
    foes: 'Mothership Shirayuki. Android.', gear: 'Parallel Night final weapons.' },
];
const PROG_TOP = PROG_TIERS.length - 1;
const FEAT_TIER = {};
const KIND_TIER = {};
const GIRL_TIER = {};
PROG_TIERS.forEach((T, i) => {
  for (const f of T.feats) FEAT_TIER[f] = i;
  for (const k of T.kinds) KIND_TIER[k] = i;
  GIRL_TIER[T.girl] = i;
});

// the profile in this browser: rounds cleared, whether they have been asked, whether they took the
// tutorial, and 'all' (a veteran: everything unlocked)
const PROG = {
  d: null,
  get data() { return this.d || (this.d = Object.assign({ cleared: 0, all: false, asked: false, tut: false }, store.get('prog') || {})); },
  save() { store.set('prog', this.data); },
  tier() { const d = this.data; if (d.all) return PROG_TOP; let i = 0; while (i < PROG_TOP && d.cleared >= PROG_TIERS[i + 1].at) i++; return i; },
  next() { const i = this.tier(); return i < PROG_TOP ? PROG_TIERS[i + 1] : null; },
  girlOk(id) { return (GIRL_TIER[id] ?? 0) <= this.tier(); },
  // a round cleared: returns the tiers it reached (usually none)
  clear(n) {
    const was = this.tier();
    this.data.cleared += n;
    this.save();
    const now = this.tier(), got = [];
    for (let i = was + 1; i <= now; i++) got.push(i);
    return got;
  },
  reset() { Object.assign(this.data, { cleared: 0, all: false }); this.save(); },
  unlockAll() { this.data.all = true; this.save(); },
};
const girlName = (id) => (VEHICLES.find((v) => v.id === id) || {}).name || id;
function tierLine(i) { const T = PROG_TIERS[i]; return `Tier ${i}: ${girlName(T.girl)} unlocked. Hostiles: ${T.foes} Shop: ${T.gear}`; }

Object.assign(Game.prototype, {
  // the tier this match plays at (everything, outside progression)
  tierNow() { return this.prog ? PROG.tier() : PROG_TOP; },
  // is a hostile, event or shop feature unlocked?
  has(feat) { return (FEAT_TIER[feat] ?? 0) <= this.tierNow(); },
  // can this be bought at this tier? (a gun, an AA mount, a core)
  itemOk(x) {
    if (!this.prog) return true;
    const T = PROG_TIERS[this.tierNow()];
    if (x.coreKind) return x.rarity <= T.core;
    if (x.role) return this.has('aa') && x.rarity <= T.rarity;
    if (x.starter) return true;
    return x.rarity <= T.rarity && (KIND_TIER[x.kind] ?? 0) <= this.tierNow();
  },
  // the shop's filter buttons: a kind of gun (or air defence) only once it is unlocked
  shopFilterOk(f) { return f === 'aa' ? this.has('aa') : (KIND_TIER[f] ?? 0) <= this.tierNow(); },
  // a round is over: count it toward the next tier (once a round, however many humans played)
  progClear(winner) {
    if (!this.prog || !this.tanks.some((t) => !t.isCpu)) return;
    const got = PROG.clear(winner && !winner.isCpu && !this.tut ? 2 : 1); // (the tutorial's rounds count one each)
    for (const i of got) {
      this.events.push(`Tier ${i} unlocked.`);
      this.ui.addUnlock(i);
    }
    const n = PROG.next();
    if (!got.length && n) this.ui.addUnlockHint(n.at - PROG.data.cleared, PROG.tier() + 1);
  },
});

// ------------------------------------------------------------ the tutorial
// A two-round match: G.W. Tiger against an Easy G.W. Tiger. A coach box walks through driving,
// aiming, firing, the autoloader, the rival's turn, the shop, and then lets them win round two.
// Each step has a check run every frame (Game.frame -> tutTick) that moves it on.
const TUTORIAL = [
  { title: 'Move', text: 'Press ← or → to move. Moving uses fuel. Fuel refills at the start of each turn.',
    done: (g, t, s) => Math.abs(t.x - s.x) > 30 },
  { title: 'Aim', text: 'Press ↑ or ↓ to change the gun angle. Aim at your rival.',
    done: (g, t, s) => Math.abs(t.elev - s.elev) >= 8 },
  { title: 'Fire', text: 'Hold Space to charge. Release Space to fire. More charge gives more range. There is no wind in this round.',
    done: (g, t) => t.firedThisTurn },
  { title: 'Second shot', text: 'G.W. Tiger fires two shots each turn. Correct your aim from the first impact. Fire again. If the first shot hits a rival, you get it back.',
    done: (g, t) => g.active !== t || (g.phase === 'aim' && t.shotsLeft <= 0) },
  { title: 'Rival turn', text: 'Now your rival fires. You get credits at the end of each round for the damage you do. A kill gives more.',
    done: (g, t, s) => g.active === t && g.phase === 'aim' && t.turnsTaken > s.turns },
  { title: 'Destroy', text: 'Destroy your rival. Press Enter to end your turn early. Press H to see all controls.',
    done: (g) => g.phase === 'roundEnd' || g.phase === 'shop' },
  { title: 'Shop', text: 'This is the shop. Bought guns do more damage. After a bought gun fires, it reloads for 1–3 turns. Your starting gun does not reload. The core (top right) adds health, armour and damage. Click Done to continue.',
    done: (g) => g.phase !== 'shop' && g.phase !== 'roundEnd' && g.round >= 2 },
  { title: 'Wind', text: 'This round has wind. The arrow at the top shows its direction and strength. Wind pushes your shells. Aim to correct for it, then fire.',
    done: (g, t) => g.round >= 2 && t.firedThisTurn },
  { title: 'Round 2', text: 'Win this round. Each round you finish counts toward the next tier. A tier unlocks a girl, hostiles and shop items.',
    done: (g) => g.phase === 'gameEnd' },
];

Object.assign(Game.prototype, {
  tutStart() { this.tut = { i: 0, s: null }; this.setWind(); this.windMarker = this.windDir; this.ui.coach(this.tut); this.introStart(); }, // (round 1: no wind)
  tutTick() {
    const T = this.tut;
    if (!T) return;
    const me = this.tanks.find((t) => !t.isCpu);
    if (!me) return;
    if (this.phase === 'gameEnd' || this.phase === 'menu') { this.tutEnd(this.phase === 'gameEnd' && T.i >= 6); return; } // (over, or ended early)
    if (T.i < 6 && (this.phase === 'roundEnd' || this.phase === 'shop')) { T.i = 6; T.s = null; this.ui.coach(T); } // (the round ended mid-lesson: on to the shop)
    const step = TUTORIAL[T.i];
    if (!T.s) { // (where she was when the step began: driving and aiming count from there)
      if (T.i < 4 && !(this.active === me && this.phase === 'aim')) return;
      T.s = { x: me.x, elev: me.elev, turns: me.turnsTaken | 0 };
      this.ui.coach(T);
    }
    if (!step.done(this, me, T.s)) return;
    T.i++;
    T.s = null;
    if (T.i >= TUTORIAL.length) { this.tutEnd(true); return; }
    this.sfx.hover();
    this.ui.coach(T);
  },
  tutEnd(finished) {
    this.tut = null;
    if (this.phase === 'intro') this.introEnd();
    PROG.data.tut = true;
    PROG.save();
    this.ui.coach(null);
    if (finished) this.ui.tutDone();
  },
});

// ------------------------------------------------------------ the tutorial's opening tour
// Before the first lesson the camera shows the field: the rival, then her, both facing each other,
// a fort and a big tree (a shell hits each), a radio tower (a shell at its base brings it down),
// then it pulls back over the whole map, centred on her. A set map (TUT_SEED on TUT_MAP), so it is
// the same every time. Enter skips it. Game.step runs updateIntro while phase is 'intro'.
const TUT_SEED = 20; // (calm wind; a big oak between them)
const TUT_MAP = 'forest';
const INTRO_FLIGHT = 75; // frames a demonstration shell is in the air

Object.assign(Game.prototype, {
  introStart() {
    const me = this.tanks.find((t) => !t.isCpu), cpu = this.tanks.find((t) => t.isCpu);
    if (!me || !cpu) return;
    const T = this.terrain, mid = (me.x + cpu.x) / 2;
    me.facing = Math.sign(cpu.x - me.x) || 1;
    cpu.facing = -me.facing;
    // a fort to shoot at, out past the rival (forts are off in the tutorial's events-off match)
    const fx = clamp(cpu.x + Math.sign(cpu.x - me.x) * 420, 300, WORLD_W - 300);
    T.forts.push(new Fort(fx, T, this.biome.fort));
    const fort = T.forts[T.forts.length - 1];
    const fortAt = { x: fort.x0 + (fort.cols * FORT_CELL) / 2, y: T.hAt(fort.x0 + (fort.cols * FORT_CELL) / 2) };
    const giant = (T.giants || []).find((G) => G.state === 'up');
    // and a radio tower (they only stand from round 2 on): on the highest flat ground clear of the rest
    if (!(T.towers || []).length) this.placeTowers([me.x, cpu.x, fx, fx - 100, fx + 100].concat((T.giants || []).flatMap((G) => [G.x - 150, G.x, G.x + 150])), T.material, 1, 260);
    const tower = (T.towers || []).slice().sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0];
    const at = (x, dy = 0) => ({ x, y: T.hAt(x) - dy });
    const fit = clamp(VIEW_W / (Math.abs(me.x - cpu.x) + 600), camZoomMin(), 1.2);
    const B = [];
    let f = 0;
    const beat = (len, o) => { B.push({ at: f, ...o }); f += len; };
    beat(150, { title: 'Your rival', text: 'This is your rival. She is a CPU player.', focus: at(cpu.x, 60), zoom: 1.5 });
    beat(150, { title: 'You', text: 'This is you: G.W. Tiger. You face your rival.', focus: at(me.x, 60), zoom: 1.5 });
    beat(180, { title: 'Turns', text: 'You and your rival take turns to fire. The last player alive wins the round.', focus: at(mid, 120), zoom: fit });
    beat(60, { title: 'Destructibles', text: 'Shells destroy ground and structures. A fort gives cover until shells break it.', focus: { x: fortAt.x, y: fortAt.y - 80 }, zoom: 1.2 });
    beat(150, { fire: { x: fortAt.x, y: fortAt.y - 40 } });
    if (giant) {
      beat(60, { title: 'Destructibles', text: 'A big tree gives cover. Hit its trunk and the tree falls.', focus: at(giant.x, 140), zoom: 1.1 });
      beat(190, { fire: { ...at(giant.x, 20), dx: 480, dy: 140, n: 40 } }); // (low from the side, under the canopy)
    }
    if (tower) {
      beat(60, { title: 'Radio tower', text: 'Hit a radio tower at its base and it falls. Do not stand near it.', focus: at(tower.x, 120), zoom: 0.75 });
      beat(240, { fire: { ...at(tower.x + 12, 0), dx: 420, dy: 300, n: 50 } }); // (a low arc: a high one meets MAIA)
    }
    beat(200, { title: 'The map', text: 'This is the full map. Use the mouse wheel to zoom. Drag to look around.', focus: at(me.x, 200), zoom: camZoomMin() });
    beat(0, { end: true });
    this.intro = { f: 0, beats: B, shooter: cpu };
    $('banner').classList.remove('show'); // (her turn's banner waits for the tour to end)
    this.phase = 'intro';
    this.charging = false;
    this.report = { shooter: cpu, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
  },

  updateIntro() {
    const I = this.intro;
    if (!I) { this.phase = 'aim'; return; }
    for (const b of I.beats) {
      if (b.at !== I.f) continue;
      if (b.end) { this.introEnd(); return; }
      if (b.title) this.ui.coachShow(`Tutorial · ${b.title}`, `${b.text} (Enter: skip)`);
      if (b.focus) this.cam.follow(b.focus);
      if (b.zoom) this.cam.zoomTo = clamp(b.zoom, camZoomMin(), CAM_ZOOM_MAX);
      if (b.fire) this.introShot(b.fire);
    }
    I.f++;
    this.projectiles = this.projectiles.filter((p) => p.update());
    this.input.queue.length = 0;
  },

  // a demonstration shell, from high up off to one side, onto (x, y) in INTRO_FLIGHT frames (no wind)
  // (hard enough to bring down a tree or a tower in one: these are far from both girls)
  introShot(to) {
    const w = { ...WEAPON_BY_ID.morser, drift: 0, dmg: 800, dmgR: 70, explR: 24 };
    const n = to.n || INTRO_FLIGHT, sx = to.x - (to.dx || 380), sy = to.y - (to.dy || 560);
    this.projectiles.push(new Projectile(this, w, this.intro.shooter, sx, sy, (to.x - sx) / n, (to.y - sy - 0.5 * GRAV * n * n) / n, true));
    this.sfx.shot(w);
  },

  introEnd() {
    if (!this.intro) return;
    this.intro = null;
    this.projectiles.length = 0;
    this.report = null;
    this.cam.zoomTo = 1;
    this.phase = 'aim';
    this.startAim();
    if (this.tut) this.ui.coach(this.tut);
  },
});
