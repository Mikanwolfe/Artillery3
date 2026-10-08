'use strict';
// Final weapons (w.sig: one per girl, only in her own shop) and their set pieces:
//   Ikaros' Apollon        a laser like any other, but where the beam lands a meteorite comes down
//   November's Verdict     a target dot; an NXi battlecruiser fleet drops in overhead, the camera
//                          rolls to show it in formation, and the flagship's spinal lance fires down
//   Innocentia's Array     five MAIAs over the target, each opening up for a Hatsuyuki barrage, their
//                          volleys rolling over one another (Game.updateConstellation)
//   G.W. Tiger's Ragnarök  a marker shell; the camera whips off the map to her platoon of G.W.
//                          SPGs and a Karl-Gerät, which rain shells on the area (BatteryStrike)
//   Object 15X's Railgun   the slug goes through up to w.pierce of ground and cover (stepBallistic)
//   Alban's Morrighan      a flare that summons the war goddess over the mark; she looses a rain of
//                          seeking arrows of light (DeitySummon)

// ---------------------------------------------------------------------------------- meteor
class Meteor {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x; this.ty = at.y;
    const dir = rng.chance(0.5) ? 1 : -1;
    this.sx = at.x - dir * 900; this.sy = at.y - 1500; // in from high up, at a slant
    this.x = this.sx; this.y = this.sy;
    this.k = 0;
    this.T = cfg.time || 55;
    game.cam.follow(this);
    game.ui.notice('The sky answers.');
  }

  update() {
    const g = this.game;
    this.k++;
    const f = Math.min(1, Math.pow(this.k / this.T, 1.5)); // it speeds up as it falls
    this.x = lerp(this.sx, this.tx, f);
    this.y = lerp(this.sy, this.ty, f);
    for (let i = 0; i < 3; i++) {
      g.particles.add({ x: this.x + (Math.random() - 0.5) * 18, y: this.y + (Math.random() - 0.5) * 18, vx: (Math.random() - 0.5) * 2, vy: -Math.random(), g: -0.02, drag: 0.96, life: 0.6 + Math.random() * 0.6, size: 8 + Math.random() * 12, color: i ? [255, 150 + Math.random() * 80, 40] : [90, 80, 80] });
    }
    if (this.k < this.T) return true;
    const c = this.cfg;
    g.explode(this.tx, this.ty, { dmg: c.dmg, dmgR: c.r, explR: 60, from: { x: this.sx - this.tx, y: this.sy - this.ty } }, this.owner, 'shell');
    g.shake = Math.max(g.shake, 22);
    g.screenFlash = Math.max(g.screenFlash || 0, 0.5);
    g.sfx.explosion(60);
    g.cam.follow({ x: this.tx, y: this.ty });
    return false;
  }

  draw(ctx) {
    const t = this.game.time;
    ctx.fillStyle = '#5a4a44'; sq(ctx, this.x, this.y, 30);
    ctx.fillStyle = '#7a6258'; sq(ctx, this.x - 5, this.y - 5, 18);
    ctx.fillStyle = (t * 20 | 0) % 2 ? '#ffb040' : '#ffe080';
    sq(ctx, this.x + 8, this.y + 8, 12);
  }
}

// --------------------------------------------------------------------- the NXi battlecruiser
// After the November Division reference art. The ship is built around a spinal mount: one huge gun
// barrel runs its whole length (the dark core, ringed with accelerator coils, glimpsed between the
// pale armour plates) and the bow is the muzzle, held between two armour jaws. Around it: stepped
// pale-lavender plates, a command tower aft with antenna masts and red tip lights, spike fins, small
// turrets, violet thrusters at the stern. Parts are [x, y, w, h, colour] in a profile with the bow
// at +x; drawn either in profile or turned a quarter nose-down (boxes stay axis-aligned either way).
const NXI_HULL = { W: '#e6e8f6', S: '#b9bdd6', T: '#9298b6', D: '#1a1e34', R: '#283050', G: '#3c4560', g: '#8e98b8', K: '#262c40', L: '#7fb4ff', l: '#cfe6ff', V: '#b48cff', r: '#ff3a3a' };
const BC_MUZZLE = 246; // the muzzle tip, along the length from the centre
const BATTLECRUISER = [
  // the spinal gun: one heavy gunmetal barrel the whole length of the ship, out past the bow
  [-150, -11, 392, 22, 'G'], [-150, -11, 392, 2, 'g'], [-150, 9, 392, 2, 'K'],
  // stern engine block and its hex panels
  [-176, -28, 38, 52, 'R'], [-172, -22, 12, 10, 'D'], [-158, -22, 12, 10, 'D'], [-172, 12, 12, 10, 'D'], [-158, 12, 12, 10, 'D'],
  // armour wrapped round the barrel's breech and midsection (the barrel shows in the slot between)
  [-140, -30, 250, 18, 'W'], [-120, -38, 130, 8, 'W'], [10, -36, 70, 6, 'S'], [-140, -30, 250, 2, 'l'],
  [-140, 12, 250, 16, 'S'], [-110, 28, 150, 6, 'T'], [-140, 26, 250, 2, 'T'],
  [-90, -30, 2, 18, 'S'], [-30, -30, 2, 18, 'S'], [30, -30, 2, 18, 'S'], [80, -30, 2, 18, 'S'], [-60, 12, 2, 14, 'T'], [0, 12, 2, 14, 'T'], [60, 12, 2, 14, 'T'],
  [-104, -44, 64, 6, 'S'], [-40, -44, 40, 6, 'W'], [80, -36, 32, 6, 'W'], [-150, 24, 14, 6, 'T'], [-104, -48, 30, 4, 'W'],
  [-6, 12, 64, 12, 'R'],
  // the bow: two armoured jaws clamping the barrel where it leaves the hull, swept back
  [108, -40, 44, 28, 'W'], [104, -46, 34, 6, 'S'], [136, -34, 22, 22, 'W'], [150, -26, 14, 14, 'S'],
  [108, 12, 44, 24, 'S'], [136, 12, 22, 18, 'S'], [150, 12, 14, 10, 'T'],
  // the exposed barrel: thick reinforcing jackets, then a slotted muzzle brake
  [170, -15, 14, 30, 'R'], [170, -15, 14, 2, 'g'], [200, -14, 12, 28, 'R'], [200, -14, 12, 2, 'g'],
  [226, -18, 20, 36, 'G'], [226, -18, 20, 2, 'g'], [230, -18, 3, 10, 'D'], [236, -18, 3, 10, 'D'], [230, 8, 3, 10, 'D'], [236, 8, 3, 10, 'D'],
  // spike fins, dorsal fin aft, ventral fins under the stern
  [118, -70, 8, 30, 'W'], [120, -82, 4, 12, 'W'], [121, -88, 2, 6, 'S'],
  [-128, -56, 6, 18, 'W'], [-127, -64, 3, 8, 'S'],
  [-112, 34, 7, 20, 'S'], [-110, 54, 4, 10, 'T'], [-82, 34, 7, 16, 'S'], [-80, 50, 4, 8, 'T'],
  // the command tower aft, with its antenna masts
  [-80, -58, 44, 20, 'W'], [-72, -72, 28, 14, 'S'], [-66, -80, 16, 8, 'W'], [-74, -52, 36, 3, 'L'],
  [-64, -102, 2, 22, 'T'], [-56, -96, 2, 16, 'T'], [-46, -92, 2, 12, 'T'],
  // small turrets on top and under the keel
  [0, -48, 18, 10, 'W'], [18, -46, 40, 3, 'T'], [58, -44, 14, 8, 'W'], [72, -42, 30, 3, 'T'],
  [-40, 32, 16, 8, 'S'], [-56, 35, 40, 3, 'T'], [70, 28, 14, 7, 'S'], [84, 31, 26, 3, 'T'],
];
// the big accelerator rings round the barrel, breech to muzzle (they light in turn as it charges)
const BC_RINGS = [-100, -30, 40, 110, 176, 206];
// down: drawn turned nose-down (bow toward +y), centred on x, y; otherwise in profile facing d
function drawBattlecruiser(ctx, x, y, d, time, down = false, charge = 0) {
  const R = (px, py, pw, ph, col) => {
    ctx.fillStyle = col;
    if (down) ctx.fillRect(Math.round(x - py - ph), Math.round(y + px), ph, pw);
    else ctx.fillRect(Math.round(x + (d > 0 ? px : -px - pw)), Math.round(y + py), pw, ph);
  };
  for (const [px, py, pw, ph, c] of BATTLECRUISER) R(px, py, pw, ph, NXI_HULL[c]);
  BC_RINGS.forEach((px, i) => {
    const lit = charge > 0 && charge * BC_RINGS.length > i;
    R(px, -13, 5, 26, lit ? NXI_HULL.l : '#4a5a88');
    if (lit) R(px - 2, -15, 9, 2, `rgba(200,235,255,${charge})`);
  });
  // windows along the plates, a few flickering
  for (let i = 0; i < 26; i++) {
    const px = -134 + i * 9;
    R(px, -26, 4, 3, (i * 7 + (time * 3 | 0)) % 11 === 0 ? NXI_HULL.l : NXI_HULL.L);
    if (i % 3 === 0) R(px + 2, 18, 3, 2, NXI_HULL.L);
  }
  // the muzzle's bore glowing as it charges
  R(244, -8, 4, 16, charge > 0 ? `rgba(200,235,255,${0.5 + 0.5 * charge})` : NXI_HULL.D);
  // red tip lights, violet thrusters
  const blink = (time * 2 | 0) % 2 ? NXI_HULL.r : '#7a2020';
  for (const [px, py] of [[-64, -104], [-56, -98], [121, -90], [-127, -66]]) R(px, py, 2, 2, blink);
  const flick = 0.6 + 0.4 * Math.sin(time * 30);
  for (const py of [-20, -3, 14]) { R(-188, py, 12, 6, `rgba(180,140,255,${flick})`); R(-182, py + 2, 4, 2, 'rgba(255,255,255,0.8)'); }
  // the NXi marking on the bow jaw
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = NXI_HULL.T;
  if (down) ctx.fillText('NXi', x + 30, y + 126); else ctx.fillText('NXi', x + d * 126, y - 18);
}

// a supporting frigate: a short wedge hull round a small gun, nose-down or in profile
const FRIGATE = [
  [-60, -6, 130, 12, 'G'], [-60, -6, 130, 2, 'g'],
  [-70, -14, 24, 28, 'R'], [-46, -16, 70, 10, 'W'], [-46, 6, 70, 10, 'S'], [24, -12, 24, 8, 'W'], [24, 4, 24, 8, 'S'],
  [-30, -26, 18, 10, 'W'], [-26, -34, 2, 8, 'T'], [60, -8, 10, 16, 'R'],
];
function drawFrigate(ctx, x, y, time, down = true) {
  for (const [px, py, pw, ph, c] of FRIGATE) {
    ctx.fillStyle = NXI_HULL[c];
    if (down) ctx.fillRect(Math.round(x - py - ph), Math.round(y + px), ph, pw);
    else ctx.fillRect(Math.round(x + px), Math.round(y + py), pw, ph);
  }
  ctx.fillStyle = `rgba(180,140,255,${0.6 + 0.4 * Math.sin(time * 30)})`;
  if (down) ctx.fillRect(Math.round(x - 4), Math.round(y - 78), 8, 8); else ctx.fillRect(Math.round(x - 78), Math.round(y - 4), 8, 8);
}

// ------------------------------------------------------------------------- orbital strike
// A fleet shot. The November Division holds station far above the battlefield (ORB_ALT up). Frames:
// 0-80 the climb: the camera rushes up from the mark through streaks of light, the sky giving way
// to space, rolling a quarter turn and pulling back on the way, so the fleet is revealed in
// formation (escorts and frigates round the flagship, smaller, darker battlecruisers in layers
// behind); 80-140 the flagship's spinal mount charges, ring by ring; 140 the tachyon lance fires;
// 140-205 the camera rolls back and rides the beam down to the mark, which it hits at 205 with a
// blast far bigger than its damage radius.
const ORB_ALT = 9000;
const ORB = { CLIMB: 80, FIRE: 140, HIT: 205, END: 280 };
const FLEET = {
  escorts: [[-240, 90], [240, 60]],
  frigates: [[-130, 280], [140, 320], [-350, 360], [360, 270]],
  mid: [[-460, -140], [-170, -240], [170, -200], [470, -110], [-620, 40], [640, 10]],
  far: [[-720, -320], [-520, -420], [-300, -380], [-60, -460], [200, -430], [420, -380], [620, -300], [800, -200], [-860, -150], [900, -60]],
};
function drawScaled(ctx, x, y, sc, alpha, fn) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  fn();
  ctx.restore();
}
// space, in screen pixels: the dark, and stars that twinkle
const SPACE_STARS = Array.from({ length: 140 }, (_, i) => [(i * 7919) % 1000 / 1000, (i * 104729) % 1000 / 1000, 1 + (i % 3), i]);
function drawSpace(ctx, a, time) {
  ctx.fillStyle = `rgba(6,8,24,${a})`;
  ctx.fillRect(0, 0, W, H);
  for (const [u, v, s, i] of SPACE_STARS) {
    ctx.fillStyle = `rgba(${i % 5 ? '220,228,255' : '200,170,255'},${a * (0.5 + 0.5 * Math.sin(time * 2 + i))})`;
    ctx.fillRect(Math.round(u * W), Math.round(v * H), s, s);
  }
}

// the climb: streaks of light rushing up the screen (screen pixels), thick in the middle of the climb
const ASCENT_STREAKS = Array.from({ length: 90 }, (_, i) => [((i * 7919) % 997) / 997, ((i * 104729) % 991) / 991, 0.6 + ((i * 31) % 7) / 7]);
function drawAscent(ctx, a, time) {
  for (const [u, v, sp] of ASCENT_STREAKS) {
    const y = (((v - time * 2.2 * sp) % 1) + 1) % 1; // moving up
    const len = 30 + 90 * a * sp;
    ctx.fillStyle = `rgba(${sp > 1.2 ? '200,225,255' : '255,255,255'},${0.15 + 0.55 * a})`;
    ctx.fillRect(Math.round(u * W), Math.round(y * H), 2 + Math.round(sp), Math.round(len));
  }
}

class OrbitalStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.x = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.y = this.ground - ORB_ALT; // the flagship's centre on station
    this.t = 0;
    this.charge = 0;
    this.beam = 0;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: at.x, y: this.ground - 200 };
    game.cam.ceil = this.y - 2500;
    game.cam.follow(this.focus);
    game.ui.notice('NXi November Division fleet on station.');
  }

  get muzzleY() { return this.y + BC_MUZZLE; }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus;
    if (t <= ORB.CLIMB) { // the climb, rolling and pulling back on the way up
      const u = ease(t / ORB.CLIMB);
      f.x = this.tx;
      f.y = lerp(this.ground - 200, this.y + 60, u);
      const r = ease((t - ORB.CLIMB * 0.35) / (ORB.CLIMB * 0.65));
      cam.rot = -Math.PI / 2 * r;
      cam.setZoom(lerp(this.zoom0, 0.5, r));
      g.ascent = Math.sin(Math.PI * Math.min(1, t / ORB.CLIMB)); // streaks swell, then clear for the reveal
    } else g.ascent = 0;
    if (t > ORB.CLIMB && t <= ORB.FIRE) this.charge = (t - ORB.CLIMB) / (ORB.FIRE - ORB.CLIMB);
    if (t === ORB.FIRE) {
      this.hit = beamTrace(g.terrain, g.targets(), null, this.tx, this.muzzleY + 4, this.tx, WORLD_BOTTOM);
      this.hitY = this.hit.y;
      this.beam = 1;
      g.screenFlash = Math.max(g.screenFlash || 0, 0.4);
      g.sfx.satFire();
    }
    if (t > ORB.FIRE && t <= ORB.HIT) { // roll back and ride the beam down
      const u = ease((t - ORB.FIRE) / (ORB.HIT - ORB.FIRE));
      cam.rot = -Math.PI / 2 * (1 - Math.min(1, u * 1.6));
      cam.setZoom(lerp(0.5, Math.min(this.zoom0, 0.6), u));
      f.y = lerp(this.muzzleY, this.hitY - 220, u);
    }
    if (t === ORB.HIT) {
      cam.rot = 0;
      g.explode(this.tx, this.hitY, { dmg: this.cfg.dmg, dmgR: this.cfg.r, explR: 60, visR: 520, from: { x: 0, y: -1 } }, this.owner, 'laser');
      for (let i = 0; i < 90; i++) { // the shockwave, running out along the ground and up
        const a = -Math.PI * Math.random(), sp = 6 + Math.random() * 10;
        g.particles.add({ x: this.tx, y: this.hitY - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, g: 0.02, drag: 0.93, life: 0.9 + Math.random() * 0.6, size: 8 + Math.random() * 14, color: i % 3 ? [200, 230, 255] : [255, 255, 255] });
      }
      g.shake = Math.max(g.shake, 34);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.9);
      g.sfx.explosion(70);
    }
    cam.follow(f);
    if (t < ORB.HIT) cam.snap(); // the set piece drives the camera itself
    if (t > ORB.HIT && t <= ORB.HIT + 30) cam.setZoom(lerp(Math.min(this.zoom0, 0.6), this.zoom0, (t - ORB.HIT) / 30));
    if (t > ORB.HIT + 10) { this.beam = Math.max(0, this.beam - 1 / 40); this.charge = this.beam; }
    if (t >= ORB.END) { cam.rot = 0; cam.ceil = -1000; g.ascent = 0; return false; }
    return true;
  }

  draw(ctx) {
    const time = this.game.time, x = this.x, y = this.y;
    for (const [dx, dy] of FLEET.far) drawScaled(ctx, x + dx, y + dy, 0.3, 0.35, () => drawBattlecruiser(ctx, 0, 0, 1, time + dx, true));
    for (const [dx, dy] of FLEET.mid) drawScaled(ctx, x + dx, y + dy, 0.55, 0.6, () => drawBattlecruiser(ctx, 0, 0, 1, time + dx, true));
    for (const [dx, dy] of FLEET.frigates) drawFrigate(ctx, Math.round(x + dx), Math.round(y + dy), time + dx);
    for (const [dx, dy] of FLEET.escorts) drawBattlecruiser(ctx, Math.round(x + dx), Math.round(y + dy), 1, time + dx, true, 0);
    drawBattlecruiser(ctx, Math.round(x), Math.round(y), 1, time, true, this.charge);
    const my = this.muzzleY;
    const glow = Math.max(this.charge, this.beam);
    if (glow > 0) { ctx.fillStyle = `rgba(160,220,255,${0.3 + 0.6 * glow})`; sq(ctx, x, my + 4, 12 + 26 * glow); }
    if (this.beam > 0) {
      const w = 26 * this.beam + 6;
      ctx.fillStyle = `rgba(150,210,255,${0.5 * this.beam})`;
      ctx.fillRect(Math.round(x - w), Math.round(my), Math.round(w * 2), Math.round(this.hitY - my));
      ctx.fillStyle = `rgba(255,255,255,${this.beam})`;
      ctx.fillRect(Math.round(x - w * 0.35), Math.round(my), Math.round(w * 0.7), Math.round(this.hitY - my));
    }
  }
}

Object.assign(Game.prototype, {
  // Innocentia's Array: four more MAIAs appear across the sky over the mark; the camera pulls back
  // to hold them and the target in one view, and all five fire one after another (it never cuts)
  updateConstellation(s, sat) {
    const c = s.constellation;
    const tg = s.target;
    if (!s.extras) {
      s.extras = [];
      for (const ox of [-560, -280, 280, 560].slice(0, c.n - 1)) {
        const e = new Satellite();
        e.x = tg.x + ox; e.y = sat.y + rng.range(-60, 60); e.tier = 3; e.hp = e.maxHp;
        e.barrage = true; // every one of them opens up for a Hatsuyuki barrage
        e.lookAt(tg);
        s.extras.push(e);
        this.particles.explosion(e.x, e.y, 60, 'laser');
      }
      sat.x = clamp(tg.x, 200, WORLD_W - 200);
      sat.lookAt(tg);
      s.prevZoom = this.cam.zoom;
      this.cam.setZoom(Math.min(this.cam.zoom, 0.55));
      this.cam.follow({ x: tg.x, y: Math.min(tg.y - 520, (sat.y + tg.y) / 2 + 160) }); // the whole array and the mark
      this.sfx.satPrep();
      this.ui.notice('Constellation online: five MAIAs.');
    }
    for (const e of s.extras) { e.update(); e.lookAt(tg); }
    const all = [sat, ...s.extras];
    const start = 80; // once their wings and antennae are open
    for (const e of all) e.charge = s.t < start ? clamp((s.t - 30) / 50, 0, 1) : e.fired >= c.pulses ? 0 : 0.6;
    // each opens fire c.gap frames after the last, from the middle outward and back, and fires
    // c.pulses pulses c.pgap apart, so the volleys roll over one another
    for (let k = 0; k < all.length; k++) {
      const j = (s.t - start - k * c.gap) / c.pgap;
      if (j < 0 || j % 1 !== 0 || j >= c.pulses) continue;
      const e = all[[2, 1, 3, 0, 4][k] % all.length];
      e.fired = j + 1;
      const lens = e.lens();
      const p = { x: tg.x + (k || j ? (rng.next() - 0.5) * 60 : 0), y: tg.y };
      this.lasers.push(new Laser(lens.x, lens.y, p.x, p.y, j % 2 ? '#bfe8ff' : '#fffff0', 16, 50));
      this.sfx.satFire();
      const r = c.r * (hasTrait(s.owner, 'uplink') ? 1.3 : 1);
      this.explode(p.x, p.y, { maia: true, dmg: c.dmg, dmgR: r, explR: 10, from: { x: lens.x - p.x, y: lens.y - p.y } }, s.owner, 'laser');
      this.shake = Math.max(this.shake, 6);
    }
    if (s.t > start + c.gap * (all.length - 1) + c.pgap * c.pulses + 70) {
      for (const e of s.extras) e.barrage = false;
      this.cam.setZoom(s.prevZoom || 1);
      this.satSeq = null;
    }
  },

});

// ------------------------------------------------------------------------- G.W. battery
// G.W. Tiger's Ragnarök: the shell is a marker. The camera whips sideways off the edge of the map
// to her platoon (four G.W. Tiger SPGs in the original Artillery box art, and a Karl-Gerät 60cm
// siege mortar), which ripple-fires two rounds a gun, then the mortar; it whips back to the mark as
// the shells rain in across the area, and the Karl's round lands last with an earthquake.
const BATTERY = { OUT: 34, FIRE: 44, KARL: 112, BACK: 128, BACK_END: 160, LAND: 168, LAND_GAP: 7, KARL_LAND: 246, END: 320 };
const BATTERY_OFF = 1100; // how far past the edge of the map the guns sit
const BATTERY_SCALE = 2.6;
const BATTERY_GUNS = [-660, -490, -320, -150]; // the G.W.s, from the Karl outward (x, before facing)

// the original G.W. Tiger SPG (Geschützwagen): a long, low six-wheel chassis, a small cab up front,
// an open raised fighting platform at the rear with a gun shield, a long barrel with a muzzle brake.
// Local coords facing right around the ground point; `fill(colour, lx, ty, w, h)`.
function drawGWSPG(fill, pal) {
  fill(pal.track, -17, -7, 34, 7);
  fill(pal.track, -19, -5, 38, 3);
  for (let i = 0; i < 6; i++) fill(pal.wheel, -16 + (i * 29) / 5, -5, 3, 3);
  fill(pal.hull, -17, -11, 33, 4);
  fill(pal.light, -17, -11, 33, 1);
  fill(pal.dark, 9, -14, 6, 3);
  fill(pal.deep, 12, -13, 2, 1);
  fill(pal.hull, -18, -16, 16, 5);
  fill(pal.deep, -1, -10, 8, 2);
  fill(pal.lamp, 15, -10, 2, 2);
}
function drawGWMount(fill, pal) {
  fill(pal.dark, -6, -22, 4, 9);
  fill(pal.deep, -18, -18, 2, 2);
  fill(pal.deep, -12, -18, 2, 2);
}
// the Karl-Gerät: a long tracked carriage with eleven road wheels, a deep cradle amidships and the
// stubby 60cm mortar raised steeply out of it
function drawKarl(fill, pal) {
  fill(pal.track, -34, -8, 68, 8);
  fill(pal.track, -36, -6, 72, 4);
  for (let i = 0; i < 11; i++) fill(pal.wheel, -33 + i * 6.3, -6, 4, 4);
  fill(pal.hull, -33, -14, 66, 6);
  fill(pal.light, -33, -14, 66, 1);
  fill(pal.dark, -14, -24, 28, 10); // the cradle
  fill(pal.light, -14, -24, 28, 1);
  fill(pal.deep, 24, -18, 8, 4); // driver's hood
  fill(pal.dark, -32, -18, 10, 4); // engine deck
}

class BatteryStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    // the guns sit off the edge behind her (the side she fired from), facing the mark
    this.side = owner.x <= at.x ? -1 : 1;
    this.edge = this.side < 0 ? 0 : WORLD_W;
    this.bx = this.edge + this.side * BATTERY_OFF; // the Karl
    this.by = game.terrain.hAt(clamp(this.edge, 2, WORLD_W - 2)); // ground level out there
    this.face = -this.side;
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: this.tx, y: this.ground - 160 };
    this.whip = 0; // pan speed, for the speed lines
    this.guns = BATTERY_GUNS.map((dx) => ({ x: this.bx - this.face * dx, recoil: 0, flash: 0 }));
    this.karl = { x: this.bx, recoil: 0, flash: 0 };
    // where each round comes down (deterministic: rng)
    this.rounds = [];
    for (let i = 0; i < BATTERY_GUNS.length * 2; i++) {
      const x = clamp(this.tx + (rng.next() * 2 - 1) * cfg.spread, 4, WORLD_W - 4);
      this.rounds.push({ x, at: BATTERY.LAND + i * BATTERY.LAND_GAP + Math.round(rng.next() * 4), done: false });
    }
    game.cam.wide = BATTERY_OFF + 1600;
    game.cam.follow(this.focus);
    game.ui.notice('G.W. battery, fire for effect.');
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus, px = f.x;
    const view = { x: this.bx + this.face * 320, y: this.by - 150 }; // the middle of the platoon
    if (t <= BATTERY.OUT) { // whip out to the guns
      const u = ease(t / BATTERY.OUT);
      f.x = lerp(this.tx, view.x, u); f.y = lerp(this.ground - 160, view.y, u);
      cam.setZoom(lerp(this.zoom0, 0.75, u));
    }
    // ripple fire: two rounds a gun, the autoloader's second close behind, then the mortar
    this.guns.forEach((gun, i) => {
      if (t === BATTERY.FIRE + i * 6 || t === BATTERY.FIRE + 30 + i * 6) this.fire(gun, false);
    });
    if (t === BATTERY.KARL) this.fire(this.karl, true);
    if (t > BATTERY.BACK && t <= BATTERY.BACK_END) { // and whip back to the mark
      const u = ease((t - BATTERY.BACK) / (BATTERY.BACK_END - BATTERY.BACK));
      f.x = lerp(view.x, this.tx, u); f.y = lerp(view.y, this.ground - 200, u);
      cam.setZoom(lerp(0.75, Math.min(this.zoom0, 0.6), u));
    }
    for (const r of this.rounds) {
      if (r.done || t < r.at) continue;
      r.done = true;
      const y = g.terrain.hAt(r.x);
      g.explode(r.x, y, { dmg: this.cfg.dmg, dmgR: this.cfg.r, explR: 36, from: { x: this.face, y: -2 } }, this.owner, 'shell');
      g.shake = Math.max(g.shake, 14);
    }
    if (t === BATTERY.KARL_LAND) {
      const k = this.cfg.karl;
      g.explode(this.tx, this.ground, { dmg: k.dmg, dmgR: k.r, explR: k.explR, visR: 320, from: { x: this.face, y: -3 } }, this.owner, 'shell');
      g.quake(this.tx, this.ground, k.quake, this.owner);
      g.shake = Math.max(g.shake, 36);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.6);
      g.sfx.explosion(70);
    }
    for (const gun of [...this.guns, this.karl]) { gun.recoil = Math.max(0, gun.recoil - 0.06); gun.flash = Math.max(0, gun.flash - 0.15); }
    if (t > BATTERY.KARL_LAND && t <= BATTERY.KARL_LAND + 30) cam.setZoom(lerp(Math.min(this.zoom0, 0.6), this.zoom0, (t - BATTERY.KARL_LAND) / 30));
    cam.follow(f);
    if (t <= BATTERY.BACK_END) cam.snap(); // the set piece drives the camera itself
    this.whip = Math.abs(f.x - px);
    if (t >= BATTERY.END) { cam.wide = 0; return false; }
    return true;
  }

  // one gun going off: recoil, a muzzle flash, smoke, dust kicked up off the ground
  fire(gun, karl) {
    const g = this.game, m = this.muzzle(gun, karl);
    gun.recoil = 1; gun.flash = 1;
    for (let i = 0; i < (karl ? 60 : 22); i++) {
      const a = -Math.PI / 2 + this.face * (karl ? 0.35 : 0.7) + (Math.random() - 0.5) * 1.4, sp = 2 + Math.random() * (karl ? 10 : 7);
      g.particles.add({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -0.01, drag: 0.9, life: 0.8 + Math.random() * 0.9, size: (karl ? 12 : 7) + Math.random() * 12, color: i % 4 ? [150, 146, 150] : [255, 200, 120] });
    }
    for (let i = 0; i < 10; i++) g.particles.add({ x: gun.x + (Math.random() - 0.5) * 120, y: this.by - 2, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 1.5, g: 0.02, drag: 0.93, life: 0.9, size: 6 + Math.random() * 8, color: [170, 160, 150] });
    g.shake = Math.max(g.shake, karl ? 26 : 10);
    if (karl) g.screenFlash = Math.max(g.screenFlash || 0, 0.35);
    g.sfx.explosion(karl ? 55 : 30);
  }

  aim(karl) { const e = karl ? 1.2 : 0.95; return { x: Math.cos(e) * this.face, y: -Math.sin(e) }; } // raised steeply
  muzzle(gun, karl) {
    const S = BATTERY_SCALE, v = this.aim(karl), piv = karl ? [0, -24] : [-9, -18];
    const d = (karl ? 50 : 34) - gun.recoil * 6;
    return { x: gun.x + this.face * piv[0] * S + v.x * d * S, y: this.by + piv[1] * S + v.y * d * S };
  }

  draw(ctx) {
    const g = this.game, t = this.t, S = BATTERY_SCALE, face = this.face, time = g.time;
    // the ground out past the edge of the map, where the guns are dug in
    const x0 = this.side < 0 ? this.edge - 2600 : this.edge, x1 = this.side < 0 ? this.edge : this.edge + 2600;
    const T = g.terrain;
    ctx.fillStyle = T.color; ctx.fillRect(x0, this.by, x1 - x0, WORLD_BOTTOM - this.by + 400);
    if (T.cap) { ctx.fillStyle = T.cap; ctx.fillRect(x0, this.by, x1 - x0, 8); }
    const pal = {
      hull: this.owner.color, light: shade(this.owner.color, 0.3), dark: shade(this.owner.color, -0.25), deep: shade(this.owner.color, -0.5),
      track: '#2b2d33', wheel: '#6b6f78', metal: '#8a8fa0', lamp: '#fff3c0',
    };
    const box = (gx) => (c, lx, ty, w, h) => {
      ctx.fillStyle = c;
      const left = face > 0 ? gx + lx * S : gx - (lx + w) * S;
      ctx.fillRect(Math.round(left), Math.round(this.by + ty * S), Math.ceil(w * S), Math.ceil(h * S));
    };
    const barrel = (gun, karl) => {
      const v = this.aim(karl), piv = karl ? [0, -24] : [-9, -18];
      const px = gun.x + face * piv[0] * S, py = this.by + piv[1] * S;
      const n = karl ? 6 : 8, step = karl ? 7 : 4.5, start = karl ? 6 : 6, size = karl ? 13 : 4;
      ctx.fillStyle = pal.deep;
      for (let i = 0; i < n; i++) {
        const d = start + i * step - gun.recoil * 6;
        sq(ctx, px + v.x * d * S, py + v.y * d * S, (i === n - 1 ? (karl ? 16 : 6.5) : size) * S);
      }
      if (gun.flash > 0) {
        const m = this.muzzle(gun, karl);
        ctx.fillStyle = `rgba(255,236,170,${gun.flash})`;
        sq(ctx, m.x + v.x * 10 * S, m.y + v.y * 10 * S, (karl ? 30 : 16) * S * gun.flash);
        ctx.fillStyle = `rgba(255,160,60,${gun.flash * 0.8})`;
        sq(ctx, m.x + v.x * 18 * S, m.y + v.y * 18 * S, (karl ? 20 : 10) * S * gun.flash);
      }
    };
    drawKarl(box(this.karl.x), pal);
    barrel(this.karl, true);
    for (const gun of this.guns) { drawGWSPG(box(gun.x), pal); barrel(gun, false); drawGWMount(box(gun.x), pal); }
    // rounds on the way down: a shell and its streak over the mark
    for (const r of this.rounds) {
      const k = r.at - t;
      if (k <= 0 || k > 22) continue;
      const y = this.ground - k * 46;
      ctx.fillStyle = 'rgba(255,240,200,0.45)'; ctx.fillRect(Math.round(r.x - face * k * 3 - 2), Math.round(y - 70), 4, 70);
      ctx.fillStyle = '#2a2a2e'; sq(ctx, r.x - face * k * 3, y, 8);
    }
    const kk = BATTERY.KARL_LAND - t;
    if (kk > 0 && kk <= 34) { // the 60cm round, a lot bigger, a lot slower
      const y = this.ground - kk * 40, x = this.tx - face * kk * 2;
      ctx.fillStyle = 'rgba(255,220,160,0.5)'; ctx.fillRect(Math.round(x - 6), Math.round(y - 140), 12, 140);
      ctx.fillStyle = '#26262a'; ctx.fillRect(Math.round(x - 12), Math.round(y - 34), 24, 34);
      ctx.fillStyle = '#3c3c42'; ctx.fillRect(Math.round(x - 12), Math.round(y - 34), 24, 6);
    }
    // speed lines while the camera whips across
    if (this.whip > 30) {
      const cam = g.cam, a = clamp((this.whip - 30) / 90, 0, 0.7);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      for (let i = 0; i < 26; i++) {
        const u = ((i * 0.618034) % 1), v = ((i * 0.381966 + 0.17) % 1);
        const len = cam.w * (0.15 + 0.25 * v);
        const x = cam.x + ((u * 1.4 + time * 3.1 * (0.6 + v)) % 1.4 - 0.2) * cam.w;
        ctx.fillRect(Math.round(x), Math.round(cam.y + v * cam.h), Math.round(len), Math.max(2, Math.round(3 / cam.zoom)));
      }
    }
  }
}

// ------------------------------------------------------------------------------ quake
Object.assign(Game.prototype, {
  // an earthquake from the impact: everyone on the ground within q.r takes up to q.dmg (falling
  // off with distance), trees near the blast come down, dust runs out along the ground
  quake(x, y, q, owner) {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const d = Math.abs(t.x - x);
      if (d > q.r || Math.abs(t.y - this.groundAt(t.x, t.y)) > 30) continue;
      const amt = Math.round(q.dmg * (1 - d / q.r));
      if (amt < 5) continue;
      this.particles.text(t.x, t.y - 64, 'QUAKE', '#e8c890');
      this.damage(t, amt, owner);
      t.flash = 1;
    }
    this.terrain.fellTrees(x, y - 40, 320);
    for (let i = 0; i < 70; i++) {
      const dir = i % 2 ? 1 : -1, dx = dir * Math.random() * q.r;
      this.particles.add({ x: x + dx, y: this.terrain.hAt(x + dx) - 2, vx: dir * (0.5 + Math.random() * 2), vy: -Math.random() * 1.2, g: 0.03, drag: 0.95, life: 0.8 + Math.random() * 0.8, size: 4 + Math.random() * 7, color: [160, 148, 136] });
    }
    this.shake = Math.max(this.shake, 30);
    this.ui.notice('The ground shakes.');
    this.events.push('An earthquake rolls out from the impact.');
  },
});

// ------------------------------------------------------------------------- the war goddess
// Alban's Morrighan: frames 0-70 the goddess descends on a cloud bank over the mark and the camera
// pulls back to frame her; 70-95 she raises her hand and her halo wheel blazes; 95-175 she looses
// arrows of light, one every 3 frames, each a strong seeker; 175-240 she rises and fades.
const DEITY = { DESC: 70, RAISE: 95, VOLLEY: 175, END: 240 };
const DEITY_SCALE = 1.6; // she is drawn this much larger than her parts list
class DeitySummon {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.x = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.restY = this.ground - 520; // her feet (the cloud) over the mark
    this.y = this.restY - 900;
    this.t = 0;
    this.alpha = 0;
    this.raise = 0;
    this.zoom0 = game.cam.zoom;
    this.arrow = { id: 'morrighan_arrow', name: 'Arrow of Light', kind: 'rocket', dmg: cfg.dmg, dmgR: cfg.r, explR: 3, salvo: 1, clip: 1, disp: 0, acid: 0, sat: false,
      rarity: 7, maxCharge: 10, drift: 0.1, arrow: true, guide: { arm: 2, burn: 0, seek: 0, turn: 9, range: cfg.reach, cone: 180, lift: 0, brake: false } };
    game.cam.follow({ x: this.x, y: this.ground - 420 });
    game.ui.notice('Morrighan answers.');
  }

  update() {
    const g = this.game, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    if (t <= DEITY.DESC) {
      const u = ease(t / DEITY.DESC);
      this.y = lerp(this.restY - 900, this.restY, u);
      this.alpha = u;
      g.cam.setZoom(lerp(this.zoom0, Math.min(this.zoom0, 0.5), u));
    }
    if (t > DEITY.DESC && t <= DEITY.RAISE) this.raise = ease((t - DEITY.DESC) / (DEITY.RAISE - DEITY.DESC));
    if (t > DEITY.RAISE && t <= DEITY.VOLLEY && (t - DEITY.RAISE) % 3 === 0 && (t - DEITY.RAISE) / 3 < this.cfg.arrows) {
      const ang = Math.random() * TAU; // from around her halo
      const hand = { x: this.x + Math.cos(ang) * 74 * DEITY_SCALE, y: this.y + (DEITY_HEAD_Y + Math.sin(ang) * 74) * DEITY_SCALE };
      const a = Math.PI / 2 + (Math.random() - 0.5) * 1.4, sp = 12 + Math.random() * 5;
      const p = new Projectile(g, this.arrow, this.owner, hand.x, hand.y, Math.cos(a) * sp, Math.sin(a) * sp, false);
      p.age = 2;
      g.projectiles.push(p);
      if (t % 9 === 0) g.sfx.laser();
    }
    if (t > DEITY.VOLLEY) {
      const u = ease((t - DEITY.VOLLEY) / (DEITY.END - DEITY.VOLLEY));
      this.y = this.restY - 500 * u;
      this.alpha = 1 - u;
      this.raise = 1 - u;
      g.cam.setZoom(lerp(Math.min(this.zoom0, 0.5), this.zoom0, u));
    }
    return t < DEITY.END;
  }

  draw(ctx) { drawScaled(ctx, Math.round(this.x), Math.round(this.y), DEITY_SCALE, 1, () => drawDeity(ctx, 0, 0, this.alpha, this.raise, this.game.time)); }
}

// The goddess, after the Morrighan of the reference art, as anime pixel art. Rather than a hand-typed
// grid she is painted once from curved shapes onto a fine pixel grid (DEITY_P units a pixel), each
// part outlined in a darker shade of itself, then merged into runs and cached (closed and open eyes):
// long straight black hair with a hime cut and a sheen, a soft face with a pointed chin, big eyes
// (closed and serene, then open and glowing violet while she looses the volley), bare shoulders
// above a white off-shoulder gown (bust, a narrow waist, hips, a long flowing skirt), detached bell
// sleeves, gold Celtic choker, arm cuffs and a chain between her wrists, hands clasped at her chest,
// and great feathered black wings. The halo, the ring of light and the cloud bank are drawn live.
const DEITY_P = 2; // world units per sprite pixel
const DEITY_FEET = 112; // sprite row her feet stand on; her head's centre is at row 20
const DEITY_HEAD_Y = -(DEITY_FEET - 20) * DEITY_P; // her head, in units above her feet (before DEITY_SCALE)
const DEITY_PAL = {
  h: '#221a24', H: '#140f16', L: '#5e4a66', s: '#ffece2', S: '#f2c8b8', b: '#ff9fb4', m: '#d46a7c', E: '#2a1a26',
  I: '#6a3cc0', i: '#b48cff', o: '#ffffff', W: '#fdfcf8', w: '#dcd8ea', v: '#bdb6d4', G: '#f0c860', g: '#a87a2a', C: '#d8b860',
  f: '#1e1b26', F: '#2a2636', l: '#4e4864',
};
const DEITY_LINE = { // the outline each part gets
  h: '#08060a', H: '#08060a', L: '#08060a', s: '#c4867c', S: '#c4867c', W: '#9c98b8', w: '#9c98b8',
  G: '#7a5418', g: '#7a5418', C: '#7a5418', f: '#08070c', F: '#08070c', l: '#08070c',
};
const _deityFrames = {};
function deityFrame(open) {
  const key = open ? 'open' : 'shut';
  if (_deityFrames[key]) return _deityFrames[key];
  const X0 = -70, Y0 = -50, GW = 212, GH = DEITY_FEET + 52; // grid covers figure x -70..141, y -50..113
  const grid = new Array(GW * GH).fill(null);
  const set = (x, y, k) => { x = Math.round(x) - X0; y = Math.round(y) - Y0; if (x >= 0 && y >= 0 && x < GW && y < GH) grid[y * GW + x] = k; };
  const get = (x, y) => { x -= X0; y -= Y0; return x >= 0 && y >= 0 && x < GW && y < GH ? grid[y * GW + x] : null; };
  // paint a shape (a point test) with key k, ringed by its outline colour
  const paint = (inside, k, line = true, bx = [X0, X0 + GW], by = [Y0, Y0 + GH]) => {
    for (let y = by[0]; y < by[1]; y++) for (let x = bx[0]; x < bx[1]; x++) {
      if (inside(x, y)) set(x, y, k);
      else if (line && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) set(x, y, '#' + k);
    }
  };
  const ell = (cx, cy, rx, ry, rot = 0) => (x, y) => {
    const dx = x - cx, dy = y - cy, c = Math.cos(rot), s = Math.sin(rot);
    const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
    return u * u + v * v <= 1;
  };
  const poly = (pts) => (x, y) => {
    let inn = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inn = !inn;
    }
    return inn;
  };
  const or = (...fs) => (x, y) => fs.some((f) => f(x, y));
  const and = (a, b) => (x, y) => a(x, y) && b(x, y);
  const mir = (pts) => pts.map(([x, y]) => [72 - x, y]); // mirror about her centre line (x 36)
  const C = 36;

  // ---- wings: feathers hung from a bone that sweeps up and out from her shoulder blades
  for (const side of [-1, 1]) {
    const bone = (t) => { const u = 1 - t; return [C + side * (u * u * 6 + 2 * u * t * 26 + t * t * 92), u * u * 44 + 2 * u * t * -24 + t * t * -34]; };
    for (const [n, l0, l1, wid, k] of [[15, 30, 74, 4.6, 'f'], [12, 18, 40, 4.4, 'F'], [9, 9, 18, 4.2, 'F']]) {
      for (let i = n - 1; i >= 0; i--) {
        const t = 0.06 + (i / (n - 1)) * 0.94, [bx, by] = bone(t);
        const L = l0 + (l1 - l0) * Math.pow(t, 0.8), a = side * (0.12 + t * 0.62); // fanning outward toward the tip
        const cx = bx + Math.sin(a) * L * 0.5, cy = by + Math.cos(a) * L * 0.5;
        const feather = ell(cx, cy, wid, L * 0.5 + 2, -a);
        paint(feather, k, true, [Math.floor(cx - L), Math.ceil(cx + L)], [Math.floor(cy - L), Math.ceil(cy + L)]);
        // a sheen down each feather's leading edge
        const ex = cx + Math.cos(a) * side * wid * 0.55, ey = cy - Math.sin(a) * side * wid * 0.55;
        paint(and(feather, ell(ex, ey, 1.3, L * 0.42, -a)), 'l', false, [Math.floor(cx - L), Math.ceil(cx + L)], [Math.floor(cy - L), Math.ceil(cy + L)]);
      }
    }
    for (let i = 0; i <= 40; i++) { const [bx, by] = bone(i / 40); paint(ell(bx, by, 3.2, 3.2), 'f', true, [Math.floor(bx - 5), Math.ceil(bx + 5)], [Math.floor(by - 5), Math.ceil(by + 5)]); }
  }

  // ---- hair, behind her: to her hips, cut straight with fine points
  const backHair = poly([[22, 14], [50, 14], [54, 40], [56, 70], [55, 80], [52, 76], [49, 82], [46, 77], [42, 83], [38, 78], [34, 83], [30, 77], [26, 82], [23, 76], [20, 80], [16, 70], [18, 40]]);
  paint(backHair, 'h');
  paint(and(backHair, (x, y) => (x === 21 || x === 51 || x === 44 || x === 28) && y > 40 && y < 74), 'H', false);

  // ---- the gown: off the shoulder, bust, narrow waist, hips, a long skirt flaring to the cloud
  const gown = or(
    poly([[23, 46], [49, 46], [47, 54], [42.5, 60], [48, 68], [53, 84], [59, 104], [62, 112], [10, 112], [13, 104], [19, 84], [24, 68], [29.5, 60], [25, 54]]),
    ell(31, 49, 6.5, 5.5), ell(41, 49, 6.5, 5.5));
  paint(gown, 'W');
  paint(and(gown, (x, y) => x - C > 3 + (y - 45) * 0.22), 'w', false); // shaded on her left
  for (const bx of [31, 41]) paint(and(gown, (x, y) => !ell(bx, 48.4, 6.3, 5.1)(x, y) && ell(bx, 49.6, 6.6, 5.6)(x, y) && y > 49), 'v', false); // under the bust
  paint(and(gown, (x, y) => x === C && y >= 46 && y <= 52), 'v', false); // and between
  paint(and(gown, (x, y) => y === 60 && Math.abs(x - C) < 6), 'w', false); // a sash at her waist
  for (const [x0, k] of [[30, 0.22], [24, 0.4], [42, -0.1], [48, -0.3]]) paint(and(gown, (x, y) => y > 70 && Math.abs(x - (x0 - (y - 70) * k)) < 0.6), 'w', false); // skirt folds
  paint(and(gown, (x, y) => y > 108), 'w', false);

  // ---- bare shoulders and neck
  const shoulders = and(ell(C, 46, 16, 6.5), (x, y) => !gown(x, y));
  paint(or(shoulders, poly([[32, 28], [40, 28], [40, 40], [32, 40]])), 's');
  paint(and(shoulders, (x, y) => y > 44 && !gown(x, y + 1) && gown(x, y + 2)), 'S', false);
  paint((x, y) => x >= 32 && x <= 40 && y >= 31 && y <= 33, 'S', false); // under her chin

  // ---- arms: upper arms at her sides, forearms in to her hands clasped at her chest
  const thick = (ax, ay, bx, by, r) => (x, y) => {
    const dx = bx - ax, dy = by - ay, u = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const px = ax + dx * u - x, py = ay + dy * u - y;
    return px * px + py * py <= r * r;
  };
  for (const s of [-1, 1]) {
    const sx = C + s * 13, ex = C + s * 15, hx = C + s * 3;
    paint(or(thick(sx, 45, ex, 61, 2.3), thick(ex, 61, hx, 58, 2.2)), 's');
    paint(thick(sx + s * 0.6, 51.5, sx + s * 0.9, 53, 2.5), 'G'); // gold cuff above the elbow
    // the detached bell sleeve, hanging from her forearm
    const sleeve = poly([[ex - s * 1, 60], [hx + s * 4, 58], [hx + s * 1, 64], [ex + s * 2, 84], [ex + s * 9, 80], [ex + s * 4, 64]]);
    paint(sleeve, 'W');
    paint(and(sleeve, (x, y) => s * (x - ex) > 3 || y > 76), 'w', false);
    paint(thick(hx + s * 4.5, 57, hx + s * 3.5, 61, 1.8), 'G'); // wrist cuff
  }
  paint(ell(C, 58, 4.5, 3.5), 's'); // her hands, clasped
  paint((x, y) => (x === C - 1 || x === C + 1) && y >= 56 && y <= 60, 'S', false);
  for (let i = 0; i <= 8; i++) set(C - 6 + i * 1.5, 63 + Math.sin((i / 8) * Math.PI) * 3, 'C'); // the chain between her wrists

  // ---- gold Celtic choker and its knot
  paint((x, y) => x >= 31 && x <= 41 && y >= 35 && y <= 36, 'G');
  paint(ell(C, 38.5, 2.2, 2.2), 'G');
  set(C, 38, 'g'); set(C, 39, 'g');

  // ---- her face: a soft oval with a pointed chin
  paint(or(and(ell(C, 20, 12.5, 12), (x, y) => y < 23), poly([[23.5, 21], [48.5, 21], [46, 27], [40, 32], [36, 33], [32, 32], [26, 27]])), 's');
  paint(and(ell(C, 20, 12.5, 12), (x, y) => x > 46), 'S', false);
  // hair over the top of her head, with the anime sheen ring
  const cap = and(ell(C, 16, 15.5, 14), (x, y) => y < 15 || x < 23 || x > 49);
  paint(cap, 'h');
  paint(and(cap, (x, y) => Math.abs(Math.hypot((x - C) / 1.15, y - 15) - 9) < 0.8 && y < 13 && (x + y) % 5), 'L', false);
  // hime-cut bangs, straight with a few points
  paint(poly([[22, 12], [50, 12], [50, 22], [48, 19], [46, 22], [43, 18], [40, 21], [37, 17], [34, 21], [31, 18], [28, 22], [25, 19], [22, 23]]), 'h', false);
  paint((x, y) => y === 18 && (x === 32 || x === 41), 'H', false);
  // the long sidelocks, falling in front of her shoulders to her chest
  const lock = [[20, 16], [24, 16], [24, 30], [24.5, 44], [24, 56], [22.5, 62], [20.5, 58], [19.5, 44], [19, 30]];
  paint(or(poly(lock), poly(mir(lock))), 'h');
  paint((x, y) => (x === 22 || x === 50) && y > 22 && y < 54, 'L', false);
  // eyes
  for (const s of [-1, 1]) {
    const ex = C + s * 5.5;
    if (open) {
      paint((x, y) => Math.abs(x - ex) <= 3 && y >= 21 && y <= 26, 'I', false);
      paint((x, y) => Math.abs(x - ex) <= 2 && y >= 24 && y <= 26, 'i', false);
      paint((x, y) => Math.abs(x - ex) <= 3.5 && y === 20, 'E', false); // upper lash line
      set(ex + s * 4, 20, 'E'); set(ex + s * 4, 21, 'E'); // the flick at the outer corner
      set(ex - 1, 22, 'o'); set(ex - 1.5, 23, 'o'); set(ex + 1.5, 25, 'o'); // highlights
    } else {
      // closed: a gentle downward curve with lashes
      for (let i = -3; i <= 3; i++) set(ex + i, 23 + (Math.abs(i) >= 3 ? -1 : Math.abs(i) >= 2 ? 0 : 1) - 1 + 1, 'E');
      set(ex + s * 4, 21, 'E'); set(ex + s * 4.5, 22, 'E'); set(ex + s * 1, 25, 'E'); set(ex - s * 1, 25, 'E');
    }
    paint((x, y) => Math.abs(x - (ex + s * 1)) <= 1.5 && y === 27, 'b', false); // blush
  }
  set(C + 0.5, 26, 'S'); // nose
  paint((x, y) => y === 29 && x >= C - 1 && x <= C + 1, 'm', false);

  // runs of one colour, row by row
  const runs = [];
  for (let y = 0; y < GH; y++) {
    let x = 0;
    while (x < GW) {
      const k = grid[y * GW + x];
      if (!k) { x++; continue; }
      let e = x + 1;
      while (e < GW && grid[y * GW + e] === k) e++;
      const col = k[0] === '#' ? DEITY_LINE[k.slice(1)] || '#08070c' : DEITY_PAL[k];
      runs.push([col, x + X0 - C, y + Y0 - DEITY_FEET, e - x]);
      x = e;
    }
  }
  runs.sort((a, b) => (a[0] < b[0] ? -1 : 1)); // fewer fillStyle changes
  return (_deityFrames[key] = runs);
}
function drawDeity(ctx, x, y, alpha, raise, time) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const P = DEITY_P, hy = y + DEITY_HEAD_Y, bob = Math.round(Math.sin(time * 1.4) * 3);
  // a ring of light around her where the arrows form, brightening as she raises them
  const glow = 0.2 + 0.6 * raise;
  for (let k = 0; k < 48; k++) {
    const a = time * 0.4 + (k / 48) * TAU;
    ctx.fillStyle = k % 2 ? `rgba(255,226,140,${glow})` : `rgba(255,250,225,${glow})`;
    ctx.fillRect(Math.round(x + Math.cos(a) * 74 - 2), Math.round(hy + Math.sin(a) * 74 - 2), 4, 4);
  }
  let last = null;
  for (const [col, rx, ry, len] of deityFrame(raise > 0.5)) {
    if (col !== last) { ctx.fillStyle = col; last = col; }
    ctx.fillRect(x + rx * P, y + ry * P + bob, len * P + 0.4, P + 0.4); // overlap: no seams at fractional scales
  }
  // her halo, a flat gold ring floating over her head
  const halo = 0.75 + 0.25 * raise, hb = hy - 34 + bob + Math.sin(time * 2) * 2;
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * TAU;
    ctx.fillStyle = Math.sin(a) < 0 ? `rgba(196,150,60,${halo})` : `rgba(255,234,150,${halo})`;
    ctx.fillRect(Math.round(x + Math.cos(a) * 22 - 2), Math.round(hb + Math.sin(a) * 5 - 1.5), 4, 3);
  }
  // the cloud bank under her
  for (let i = 0; i < 26; i++) {
    const ox = ((i * 37) % 240) - 120, oy = (i % 4) * 8;
    ctx.fillStyle = i % 3 ? 'rgba(240,240,250,0.92)' : 'rgba(206,210,228,0.92)';
    ctx.fillRect(Math.round(x + ox - 22 + Math.sin(time + i) * 3), y - 18 + oy, 44, 22);
  }
  ctx.restore();
}
