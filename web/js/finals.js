'use strict';
// Final weapons (w.sig: one per girl, only in her own shop) and their set pieces:
//   Ikaros' Apollon        a laser like any other, but where the beam lands a meteorite comes down
//   November's Verdict     a target dot; an NXi battlecruiser fleet drops in overhead, the camera
//                          rolls to show it in formation, and the flagship's spinal lance fires down
//   Innocentia's Array     five MAIAs over the target, firing one after another (Game.updateConstellation)
//   G.W. Tiger's Ragnarök  she rides a siege mech while it's equipped (drawMech, Tank.pivot); it
//                          braces and fires one 80cm shell; the impact sets off an earthquake
//   Object 15X's Railgun   the slug goes through up to w.pierce of ground and cover (stepBallistic)
//   Alban's Morrighan      a flare that summons the war goddess over the mark; she looses a rain of
//                          seeking arrows of light (DeitySummon)

const MECH_LIFT = 30; // how far the mech raises G.W. Tiger (and her guns)

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
        e.lookAt(tg);
        s.extras.push(e);
        this.particles.explosion(e.x, e.y, 60, 'laser');
      }
      sat.x = clamp(tg.x, 200, WORLD_W - 200);
      sat.lookAt(tg);
      s.prevZoom = this.cam.zoom;
      this.cam.setZoom(Math.min(this.cam.zoom, 0.55));
      this.cam.follow({ x: tg.x, y: tg.y - 520 });
      this.sfx.satPrep();
      this.ui.notice('Constellation online: five MAIAs.');
    }
    for (const e of s.extras) { e.update(); e.lookAt(tg); }
    const all = [sat, ...s.extras];
    const start = 75;
    for (const e of all) e.charge = s.t < start ? clamp((s.t - 20) / 55, 0, 1) : e.fired ? 0 : 1;
    const k = (s.t - start) / c.gap;
    if (s.t >= start && k % 1 === 0 && k < all.length) {
      const e = all[[2, 1, 3, 0, 4][k] % all.length]; // from the middle outward and back
      e.fired = true;
      const lens = e.lens();
      const p = { x: tg.x + (k ? (rng.next() - 0.5) * 40 : 0), y: tg.y };
      this.lasers.push(new Laser(lens.x, lens.y, p.x, p.y, '#fffff0', 20, 70));
      this.sfx.satFire();
      const r = c.r * (hasTrait(s.owner, 'uplink') ? 1.3 : 1);
      this.explode(p.x, p.y, { maia: true, dmg: c.dmg, dmgR: r, explR: 14, from: { x: lens.x - p.x, y: lens.y - p.y } }, s.owner, 'laser');
      this.shake = Math.max(this.shake, 6);
    }
    if (s.t > start + c.gap * all.length + 70) {
      this.cam.setZoom(s.prevZoom || 1);
      this.satSeq = null;
    }
  },

});

// G.W. Tiger's siege mech (while the Ragnarök is equipped): two big jointed legs, a heavy hull she
// stands on, stabiliser spades that dig in when she fires (t.recoil), an exhaust stack
function drawMech(ctx, t) {
  const x = Math.round(t.x), y = Math.round(t.y), f = t.facing, time = t.blink || 0;
  const brace = clamp(t.recoil || 0, 0, 1);
  const stride = t.walking > 0 ? Math.round(Math.sin(time * 12) * 4) : 0;
  const dark = '#3a3f4a', mid = '#5a6070', light = '#868d9c', hot = '#ffb040';
  const spread = Math.round(4 * brace);
  for (const [lx, s] of [[-18 - spread, stride], [10 + spread, -stride]]) {
    const X = x + f * lx - 5;
    ctx.fillStyle = dark; ctx.fillRect(X - 6 + s, y - 6, 22, 6); // foot
    ctx.fillStyle = light; ctx.fillRect(X - 6 + s, y - 7, 22, 2);
    ctx.fillStyle = mid; ctx.fillRect(X, y - 18, 10, 12); // shin
    ctx.fillStyle = light; ctx.fillRect(X - 2, y - 22, 14, 5); // knee
    ctx.fillStyle = mid; ctx.fillRect(X + 1, y - MECH_LIFT + 2, 9, 8); // thigh
  }
  // stabiliser spades: folded up, dug in when she fires
  ctx.fillStyle = dark;
  ctx.fillRect(x - f * 30 - 3, y - 14 + Math.round(10 * brace), 6, 12);
  ctx.fillRect(x - f * 36 - 5, y - 4 + Math.round(2 * brace), 10, 4);
  ctx.fillStyle = dark; ctx.fillRect(x - 26, y - MECH_LIFT - 6, 52, 10); // hull she stands on
  ctx.fillStyle = mid; ctx.fillRect(x - 24, y - MECH_LIFT - 2, 48, 4);
  ctx.fillStyle = t.color; ctx.fillRect(x - 26, y - MECH_LIFT - 6, 52, 2);
  ctx.fillStyle = light; ctx.fillRect(x - f * 28 - 4, y - MECH_LIFT - 16, 8, 16); // exhaust stack
  if ((time * 6 | 0) % 2 || brace > 0.2) { ctx.fillStyle = hot; ctx.fillRect(x - f * 28 - 3, y - MECH_LIFT - 20, 6, 4); }
}

// ------------------------------------------------------------------------------ siege + quake
Object.assign(Game.prototype, {
  // the 80cm going off: a muzzle blast to match, the whole screen shaking
  siegeBlast(t, m) {
    for (let i = 0; i < 40; i++) {
      const a = Math.atan2(t.aimVec().y, t.aimVec().x) + (Math.random() - 0.5) * 1.6, sp = 2 + Math.random() * 9;
      this.particles.add({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -0.01, drag: 0.9, life: 0.8 + Math.random() * 0.8, size: 8 + Math.random() * 12, color: i % 4 ? [150, 146, 150] : [255, 200, 120] });
    }
    for (let i = 0; i < 16; i++) this.particles.add({ x: t.x + (Math.random() - 0.5) * 60, y: t.y - 2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 1.5, g: 0.02, drag: 0.93, life: 0.9, size: 6 + Math.random() * 6, color: [170, 160, 150] });
    this.shake = Math.max(this.shake, 22);
    this.screenFlash = Math.max(this.screenFlash || 0, 0.35);
    this.sfx.explosion(40);
  },

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
      const hand = { x: this.x + (47 + (Math.random() - 0.5) * 30) * DEITY_SCALE, y: this.y + (-390 + (Math.random() - 0.5) * 30) * DEITY_SCALE };
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

// The goddess, box-built and translucent (after Land of the Lustrous' Lunarian deities, as the
// Morrighan of the old songs): a cloud bank under her, black feathered wings, a radiant halo wheel
// behind, a serene pale face under a diadem, long dark hair, white and gold robes; one hand rises
// to loose the volley. x, y: the cloud under her feet.
function drawDeity(ctx, x, y, alpha, raise, time) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.92;
  const cy = y - 250; // halo / chest height
  // the halo wheel: two rings and spokes, slowly turning, blazing as she raises her hand
  const spin = time * 0.3;
  const glow = 0.55 + 0.45 * raise;
  for (let i = 0; i < 48; i++) {
    const a = spin + (i / 48) * TAU;
    ctx.fillStyle = i % 2 ? `rgba(255,236,170,${glow})` : `rgba(255,255,240,${glow})`;
    ctx.fillRect(Math.round(x + Math.cos(a) * 150 - 4), Math.round(cy - 40 + Math.sin(a) * 150 - 4), 8, 8);
    if (i % 2 === 0) ctx.fillRect(Math.round(x + Math.cos(a) * 112 - 3), Math.round(cy - 40 + Math.sin(a) * 112 - 3), 6, 6);
  }
  for (let k = 0; k < 16; k++) {
    const a = -spin + (k / 16) * TAU;
    ctx.fillStyle = `rgba(255,240,190,${glow * 0.7})`;
    for (let r = 40; r < 112; r += 8) ctx.fillRect(Math.round(x + Math.cos(a) * r - 2), Math.round(cy - 40 + Math.sin(a) * r - 2), 4, 4);
  }
  // black feathered wings, stepped outward and down from the shoulders
  for (const side of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      const w = 34 + k * 16, top = cy - 70 + k * 18;
      ctx.fillStyle = k % 2 ? '#1c1a24' : '#2c2836';
      ctx.fillRect(Math.round(side > 0 ? x + 26 : x - 26 - w), top, w, 16);
      ctx.fillStyle = '#4a4458';
      ctx.fillRect(Math.round(side > 0 ? x + 26 + w - 8 : x - 26 - w), top + 12, 8, 14); // feather tips
    }
  }
  // long dark hair behind
  ctx.fillStyle = '#2a2234';
  ctx.fillRect(x - 30, cy - 110, 60, 150);
  // robes: stepped, widening to the hem, white with gold trim
  for (let k = 0; k < 9; k++) {
    const w = 46 + k * 10;
    ctx.fillStyle = k % 3 === 2 ? '#e8e2d0' : '#f6f4ee';
    ctx.fillRect(x - w / 2, cy - 30 + k * 22, w, 22);
  }
  ctx.fillStyle = '#e0b850';
  ctx.fillRect(x - 46, cy - 34, 92, 6); // collar
  ctx.fillRect(x - 3, cy - 28, 6, 196); // a gold band down the front
  ctx.fillRect(x - 68, cy + 168, 136, 6); // the hem
  // the face: serene, eyes closed, under a gold diadem
  ctx.fillStyle = '#fbeee4';
  ctx.fillRect(x - 20, cy - 100, 40, 48);
  ctx.fillStyle = '#2a2234';
  ctx.fillRect(x - 22, cy - 106, 44, 12); // fringe
  ctx.fillStyle = '#e0b850';
  ctx.fillRect(x - 18, cy - 112, 36, 6); ctx.fillRect(x - 3, cy - 120, 6, 8); // diadem
  ctx.fillStyle = '#8a6a7a';
  ctx.fillRect(x - 12, cy - 78, 8, 2); ctx.fillRect(x + 4, cy - 78, 8, 2); // closed eyes
  ctx.fillRect(x - 3, cy - 64, 6, 2);
  // arms: one at her side, one rising to loose the volley
  ctx.fillStyle = '#f6f4ee';
  ctx.fillRect(x - 54, cy - 20, 14, 70);
  const ra = raise;
  ctx.fillRect(x + 40, Math.round(cy - 20 - 70 * ra), 14, 70);
  ctx.fillStyle = '#fbeee4';
  ctx.fillRect(x + 40, Math.round(cy - 32 - 70 * ra), 14, 14); // the raised hand
  if (ra > 0.5) { ctx.fillStyle = `rgba(255,250,220,${ra})`; ctx.fillRect(x + 30, Math.round(cy - 60 - 70 * ra), 34, 34); }
  // the cloud bank under her
  for (let i = 0; i < 26; i++) {
    const ox = ((i * 37) % 260) - 130, oy = (i % 4) * 8;
    ctx.fillStyle = i % 3 ? 'rgba(236,236,246,0.9)' : 'rgba(200,204,222,0.9)';
    ctx.fillRect(Math.round(x + ox - 22 + Math.sin(time + i) * 3), y - 18 + oy, 44, 22);
  }
  ctx.restore();
}
