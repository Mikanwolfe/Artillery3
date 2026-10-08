'use strict';
// Final weapons (w.sig: one per girl, only in her own shop) and their set pieces:
//   Ikaros' Apollon        a laser like any other, but where the beam lands a meteorite comes down
//   November's Verdict     a target dot; an NXi battlecruiser fleet drops in overhead, the camera
//                          rolls to show it in formation, and the flagship's spinal lance fires down
//   Innocentia's Array     five MAIAs over the target, firing one after another (Game.updateConstellation)
//   G.W. Tiger's Ragnarök  she rides a mech while it's equipped (drawMech, Tank.pivot)
//   Object 15X's Railgun   the slug goes through up to w.pierce of ground and cover (stepBallistic)
//   Alban's Morrighan      a split rocket: ten strong seekers (no set piece needed)

const MECH_LIFT = 22; // how far the mech raises G.W. Tiger (and her guns)

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
// 0-50 the camera climbs from the mark to the flagship, the sky giving way to space; 50-85 it rolls a
// quarter turn and pulls back to show the fleet in formation (escorts and frigates around the
// flagship, smaller, darker battlecruisers in two layers behind); 85-145 the flagship's spinal mount
// charges, ring by ring; 145 the tachyon lance fires; 145-205 the camera rolls back and rides the
// beam down to the mark, which it hits at 205.
const ORB_ALT = 3200;
const ORB = { CLIMB: 50, ROLL: 85, FIRE: 145, HIT: 205, END: 265 };
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
    game.cam.ceil = this.y - 2000;
    game.cam.follow(this.focus);
    game.ui.notice('NXi November Division fleet on station.');
  }

  get muzzleY() { return this.y + BC_MUZZLE; }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus;
    if (t <= ORB.CLIMB) { f.x = this.tx; f.y = lerp(this.ground - 200, this.y + 60, ease(t / ORB.CLIMB)); }
    if (t > ORB.CLIMB && t <= ORB.ROLL) {
      const u = ease((t - ORB.CLIMB) / (ORB.ROLL - ORB.CLIMB));
      cam.rot = -Math.PI / 2 * u;
      cam.setZoom(lerp(this.zoom0, 0.5, u));
    }
    if (t > ORB.ROLL && t <= ORB.FIRE) this.charge = (t - ORB.ROLL) / (ORB.FIRE - ORB.ROLL);
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
      cam.setZoom(lerp(0.5, this.zoom0, u));
      f.y = lerp(this.muzzleY, this.hitY - 160, u);
    }
    if (t === ORB.HIT) {
      cam.rot = 0;
      g.explode(this.tx, this.hitY, { dmg: this.cfg.dmg, dmgR: this.cfg.r, explR: 40, from: { x: 0, y: -1 } }, this.owner, 'laser');
      g.shake = Math.max(g.shake, 18);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.6);
      g.sfx.explosion(50);
    }
    cam.follow(f);
    if (t < ORB.HIT) cam.snap(); // the set piece drives the camera itself
    if (t > ORB.HIT + 10) { this.beam = Math.max(0, this.beam - 1 / 40); this.charge = this.beam; }
    if (t >= ORB.END) { cam.rot = 0; cam.ceil = -1000; return false; }
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

// G.W. Tiger's mech (while the Ragnarök is equipped): two big legs and a hull she stands on
function drawMech(ctx, t) {
    const x = Math.round(t.x), y = Math.round(t.y), f = t.facing, time = t.blink || 0;
    const stride = t.walking > 0 ? Math.round(Math.sin(time * 14) * 3) : 0;
    const dark = '#3e434e', mid = '#5e6472', light = '#848b9a';
    for (const [lx, s] of [[-14, stride], [8, -stride]]) {
      const X = x + f * lx - 4;
      ctx.fillStyle = dark; ctx.fillRect(X - 4 + s, y - 5, 16, 5); // foot
      ctx.fillStyle = mid; ctx.fillRect(X, y - 15, 8, 10); // shin
      ctx.fillStyle = light; ctx.fillRect(X - 1, y - 18, 10, 4); // knee
      ctx.fillStyle = mid; ctx.fillRect(X + 1, y - MECH_LIFT, 7, 5); // thigh
    }
    ctx.fillStyle = dark; ctx.fillRect(x - 20, y - MECH_LIFT - 4, 40, 7); // hull she stands on
    ctx.fillStyle = t.color; ctx.fillRect(x - 20, y - MECH_LIFT - 4, 40, 2);
    ctx.fillStyle = light; ctx.fillRect(x - f * 22 - 3, y - MECH_LIFT - 10, 6, 12); // exhaust stack
    if ((time * 6 | 0) % 2) { ctx.fillStyle = '#ffb040'; ctx.fillRect(x - f * 22 - 2, y - MECH_LIFT - 13, 4, 3); }
}
