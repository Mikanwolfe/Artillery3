'use strict';
// Final weapons (w.sig: one per girl, only in her own shop) and their set pieces:
//   Ikaros' Apollon        a laser; where it lands the camera climbs to an asteroid belt, marks a rock
//                          and flings it down: a vast crater melted to lava for good (AsteroidStrike)
//   November's Verdict     a target dot; an NXi battlecruiser fleet drops in overhead, the camera
//                          rolls to show it in formation, and the flagship's spinal lance fires down
//   Innocentia's Array     a dot; MAIA's eye opens, the sky fills with MAIAs and a vast one behind
//                          them, and the mark takes wave after wave of fire, then the vast one's beam (MaiaArray)
//   G.W. Tiger's Ragnarök  a marker shell; the camera whips off the map to her platoon of G.W.
//                          SPGs and a Karl-Gerät, which rain shells on the area (BatteryStrike)
//   Object 15X's Zero Point a railgun probe; the Naito MAIA fires from the Great Red Spot and the
//                          ground round the probe is deleted outright (NaitoStrike)
//   Alban's Morrighan      a flare that summons the war goddess over the mark; she looses a rain of
//                          seeking arrows of light (DeitySummon)

// ---------------------------------------------------------------------------------- asteroid
// Ikaros' Apollon. Where her beam lands the sky answers: the camera climbs, the light streaking
// past, the sky darkens to space, it passes the NXi fleet on station and comes out among an
// asteroid belt. It settles on one rock; a yellow outline forms around it and pulses, in silence;
// then the rock is flung down, faster than the climb, and lands: a vast crater, the ground melted
// to lava that stains it for good (Terrain.melt) and burns anyone who stands in it.
const ROCK = { CLIMB: 130, MARK: 142, PULSE: 226, DROP: 276, END: 366 };
const ROCK_ALT = 15000; // the belt, above the mark
const ROCK_CELL = 10; // the rocks' box size
// a lumpy rock as boxes: cells inside a noisy radius, shaded light on the upper left
function rockCells(R, seed) {
  const out = [], n = Math.ceil(R / ROCK_CELL);
  const bump = (a) => 0.78 + 0.12 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 + seed * 2.3) + 0.05 * Math.sin(a * 13 + seed * 5.1);
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const x = i * ROCK_CELL, y = j * ROCK_CELL, r = Math.hypot(x, y);
    if (r > R * bump(Math.atan2(y, x))) continue;
    const lit = (-x - y) / (R * 1.4), pit = hash2(i * 13 + seed * 7, j * 17) < 0.08;
    const v = pit ? 0.55 : 0.75 + 0.3 * lit + 0.08 * hash2(i, j + seed);
    out.push([x, y, `rgb(${Math.round(120 * v)},${Math.round(108 * v)},${Math.round(98 * v)})`]);
  }
  return out;
}
class AsteroidStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.belt = this.ground - ROCK_ALT;
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: this.tx, y: this.ground - 200 };
    this.rock = { x: this.tx, y: this.belt, cells: rockCells(cfg.size, 3) };
    this.mark = 0; // the yellow outline, forming then pulsing
    // the belt: rocks of every size drifting across the dark
    this.belt_ = [];
    for (let i = 0; i < 46; i++) {
      const R = 16 + hash2(i, 5) * 90, side = i % 2 ? 1 : -1;
      this.belt_.push({ x: this.tx + side * (240 + hash2(i, 9) * 2400), y: this.belt + (hash2(i, 2) - 0.5) * 1100, vx: (hash2(i, 4) - 0.5) * 1.2, R, cells: rockCells(R, i), far: hash2(i, 8) < 0.5 });
    }
    // the outline: cells just outside the rock
    const inside = new Set(this.rock.cells.map(([x, y]) => x + ',' + y));
    this.edge = [];
    for (const [x, y] of this.rock.cells) {
      for (const [dx, dy] of [[ROCK_CELL, 0], [-ROCK_CELL, 0], [0, ROCK_CELL], [0, -ROCK_CELL]]) {
        const k = (x + dx) + ',' + (y + dy);
        if (!inside.has(k)) { inside.add(k); this.edge.push([x + dx, y + dy]); }
      }
    }
    game.cam.ceil = this.belt - 2500;
    game.cam.follow(this.focus);
    game.ui.notice('The sky answers.');
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, f = this.focus, r = this.rock;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    for (const b of this.belt_) b.x += b.vx;
    if (t <= ROCK.CLIMB) { // the climb, gathering speed then easing into the belt
      // eased, and slowing right down as it passes the fleet (at ORB_ALT / ROCK_ALT of the way)
      const k = 0.85, mid = ORB_ALT / ROCK_ALT - 0.08, p = (q) => q - (k / TAU) * Math.sin(TAU * (q - mid));
      const u = (p(ease(t / ROCK.CLIMB)) - p(0)) / (p(1) - p(0));
      f.x = this.tx; f.y = lerp(this.ground - 200, this.belt + 40, u);
      cam.setZoom(lerp(this.zoom0, 0.8, u));
      g.ascent = Math.sin(Math.PI * Math.min(1, t / ROCK.CLIMB)); g.ascentDir = 1;
    }
    if (t > ROCK.CLIMB && t <= ROCK.DROP) { g.ascent = 0; f.y = this.belt + 40; }
    if (t > ROCK.CLIMB && t <= ROCK.MARK) this.mark = (t - ROCK.CLIMB) / (ROCK.MARK - ROCK.CLIMB);
    if (t > ROCK.MARK && t <= ROCK.PULSE) this.mark = 0.6 + 0.4 * Math.abs(Math.sin((t - ROCK.MARK) * 0.11));
    if (t > ROCK.PULSE && t <= ROCK.DROP) { // and down: faster than the climb, harder all the way
      this.mark = Math.max(0, 1 - (t - ROCK.PULSE) / 10);
      const u = Math.pow((t - ROCK.PULSE) / (ROCK.DROP - ROCK.PULSE), 2.2);
      r.y = lerp(this.belt, this.ground, u);
      f.y = r.y - 120 * (1 - u) - 60;
      cam.setZoom(lerp(0.8, 0.5, u));
      g.ascent = Math.min(1, u * 4) * (1 - u * 0.3); g.ascentDir = -1;
      for (let i = 0; i < 4; i++) {
        g.particles.add({ x: r.x + (Math.random() - 0.5) * this.cfg.size * 1.4, y: r.y - this.cfg.size * 0.6 - Math.random() * 40, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3, g: -0.02, drag: 0.95, life: 0.5 + Math.random() * 0.5, size: 14 + Math.random() * 20, color: i ? [255, 150 + Math.random() * 80, 40] : [110, 96, 90] });
      }
      if (t === ROCK.PULSE + 1) g.sfx.laser();
    }
    if (t === ROCK.DROP) {
      g.ascent = 0;
      const c = this.cfg, y = g.terrain.hAt(this.tx);
      g.explode(this.tx, y, { dmg: c.dmg, dmgR: c.r, explR: c.explR, visR: 620, from: { x: 0, y: -1 } }, this.owner, 'shell');
      g.terrain.melt(this.tx, c.lava);
      for (let i = 0; i < 90; i++) { // molten rock thrown out of the crater
        const a = -Math.PI * (0.08 + 0.84 * rng.next()), sp = 3 + rng.next() * 12;
        g.drops.push(new AcidDrop(g, this.owner, this.tx + (rng.next() - 0.5) * 200, g.terrain.hAt(this.tx) - 6, Math.cos(a) * sp, Math.sin(a) * sp, c.splash, true));
      }
      g.shake = Math.max(g.shake, 44);
      g.screenFlash = Math.max(g.screenFlash || 0, 1);
      g.sfx.explosion(80);
      g.events.push('The ground melts.');
    }
    cam.follow(f);
    if (t <= ROCK.DROP) cam.snap();
    if (t > ROCK.DROP + 30 && t <= ROCK.DROP + 70) cam.setZoom(lerp(0.5, this.zoom0, ease((t - ROCK.DROP - 30) / 40)));
    if (t >= ROCK.END) { cam.ceil = -1000; g.ascent = 0; g.ascentDir = 1; return false; }
    return true;
  }

  draw(ctx) {
    const t = this.t, time = this.game.time, r = this.rock;
    // the NXi fleet on station, passed on the way up
    const fy = this.ground - ORB_ALT;
    drawScaled(ctx, this.tx - 900, fy - 260, 0.6, 0.6, () => drawBattlecruiser(ctx, 0, 0, 1, time + 3));
    drawBattlecruiser(ctx, Math.round(this.tx + 520), Math.round(fy), -1, time);
    drawBattlecruiser(ctx, Math.round(this.tx - 380), Math.round(fy + 330), -1, time + 1);
    drawFrigate(ctx, Math.round(this.tx + 120), Math.round(fy - 200), time, false);
    drawFrigate(ctx, Math.round(this.tx - 640), Math.round(fy + 120), time + 2, false);
    // the belt
    const rockAt = (cells, x, y, a = 1) => {
      ctx.globalAlpha = a;
      for (const [cx, cy, col] of cells) { ctx.fillStyle = col; ctx.fillRect(Math.round(x + cx - ROCK_CELL / 2), Math.round(y + cy - ROCK_CELL / 2), ROCK_CELL, ROCK_CELL); }
      ctx.globalAlpha = 1;
    };
    for (const b of this.belt_) rockAt(b.cells, b.x, b.y, b.far ? 0.45 : 1);
    if (t >= ROCK.DROP) return;
    // the chosen rock, glowing underneath as it comes down, and its yellow outline
    rockAt(r.cells, r.x, r.y);
    if (t > ROCK.PULSE) {
      const heat = clamp((t - ROCK.PULSE) / 30, 0, 1);
      ctx.fillStyle = `rgba(255,140,40,${0.6 * heat})`;
      for (const [cx, cy] of r.cells) if (cy > this.cfg.size * 0.35) ctx.fillRect(Math.round(r.x + cx - ROCK_CELL / 2), Math.round(r.y + cy - ROCK_CELL / 2), ROCK_CELL, ROCK_CELL);
    }
    if (this.mark > 0) {
      ctx.fillStyle = `rgba(255,214,60,${this.mark})`;
      const grow = 1 + (1 - Math.min(1, this.mark * 1.5)) * 0.3;
      for (const [cx, cy] of this.edge) ctx.fillRect(Math.round(r.x + cx * grow - ROCK_CELL / 2), Math.round(r.y + cy * grow - ROCK_CELL / 2), ROCK_CELL, ROCK_CELL);
    }
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
function drawAscent(ctx, a, time, dir = 1) {
  for (const [u, v, sp] of ASCENT_STREAKS) {
    const y = (((v - dir * time * 2.2 * sp) % 1) + 1) % 1; // moving up (climbing) or down (falling)
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

// ------------------------------------------------------------------------- MAIA array
// Innocentia's Constellation. The dot lands and nothing happens. The camera drifts up to MAIA and
// the eye at her core opens; in flashes the whole sky fills with MAIAs, a vast one behind them all.
// They unfold and charge, the camera comes down to the mark, and it is hit by wave after wave of
// MAIA fire across a wide area; on the last, the vast MAIA charges and a massive beam comes down.
const ARRAY = { PAN: 30, AT: 70, EYE: 108, FILL: 182, CHARGE: 214, DOWN: 238, WAVES: 244, WAVE_GAP: 30, WAVE_SHOTS: 40, WAVE_LEN: 22, BIG_CHARGE: 404, BIG_FIRE: 446, END: 580 };
const ARRAY_BURSTS = [114, 130, 146, 162]; // the sky fills in four flashes
class MaiaArray {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.t = 0;
    this.eye = 0; // 0..1, the eye at MAIA's core opening
    this.big = 0; // the vast MAIA's charge
    this.opensMaia = false; // MAIA herself unfolds for the barrage (Game.step)
    this.zoom0 = game.cam.zoom;
    this.focus = { x: this.tx, y: this.ground - 200 };
    const sky = this.ground - 1500;
    // the array: foreground MAIAs (full art, scaled down) and far ones (silhouettes), each appearing
    // in one of the bursts; positions from the seeded rng so a replay matches
    this.fore = [];
    for (let i = 0; i < cfg.fore; i++) {
      const m = new Satellite();
      m.tier = 1 + (i % 3); m.t = i * 37;
      this.fore.push({ m, x: this.tx + (rng.next() * 2 - 1) * 1400, y: sky + 250 + rng.next() * 750, sc: 0.42 + rng.next() * 0.3, at: ARRAY_BURSTS[i % 4] });
    }
    this.far = [];
    for (let i = 0; i < cfg.far; i++) this.far.push({ x: this.tx + (rng.next() * 2 - 1) * 2000, y: sky + rng.next() * 900, r: 14 + rng.next() * 16, at: ARRAY_BURSTS[i % 4] + 4 });
    this.giant = new Satellite();
    this.giant.tier = 3;
    this.giantAt = { x: this.tx, y: sky + 80, sc: 3.4 }; // high over the mark, in frame for the last wave
    game.cam.ceil = sky - 1600; // the camera may climb to see it all
    game.cam.wide = 700; // and pull back wider than the map
    // the barrage: every shot's mark, from the seeded rng
    this.shots = [];
    for (let w = 0; w < cfg.waves; w++) {
      for (let i = 0; i < ARRAY.WAVE_SHOTS; i++) {
        const x = clamp(this.tx + (rng.next() * 2 - 1) * cfg.spread * (0.4 + 0.6 * rng.next()), 4, WORLD_W - 4);
        this.shots.push({ x, at: ARRAY.WAVES + w * ARRAY.WAVE_GAP + Math.round(rng.next() * ARRAY.WAVE_LEN), src: Math.floor(rng.next() * 1e6) });
      }
    }
    game.cam.follow(this.focus);
  }

  // a foreground MAIA's emitter, in the world
  lensOf(f) { const l = f.m.lens(); return { x: f.x + l.x * f.sc, y: f.y + l.y * f.sc }; }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, sat = g.satellite;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus, sc = sat.center();
    if (t > ARRAY.PAN && t <= ARRAY.AT) { // up to MAIA
      const u = ease((t - ARRAY.PAN) / (ARRAY.AT - ARRAY.PAN));
      f.x = lerp(this.tx, sc.x, u); f.y = lerp(this.ground - 200, sc.y + 120, u);
      cam.setZoom(lerp(this.zoom0, 1.15, u));
    }
    if (t > ARRAY.AT && t <= ARRAY.EYE) { this.eye = ease((t - ARRAY.AT) / (ARRAY.EYE - ARRAY.AT)); f.x = sc.x; f.y = sc.y + 120; }
    if (t === ARRAY.AT + 10) g.ui.notice('MAIA opens her eye.');
    if (t > ARRAY.EYE && t <= ARRAY.FILL) { // pulling back as the sky fills
      const u = ease((t - ARRAY.EYE) / (ARRAY.FILL - ARRAY.EYE));
      f.x = lerp(sc.x, this.tx, u); f.y = lerp(sc.y + 120, this.ground - 1100, u);
      cam.zmin = 0.36;
      cam.setZoom(lerp(1.15, 0.36, u));
    }
    if (ARRAY_BURSTS.includes(t)) { g.screenFlash = Math.max(g.screenFlash || 0, 0.55); g.sfx.satPrep(); }
    if (t === ARRAY.FILL) g.ui.notice('Constellation online.');
    if (t >= ARRAY.FILL) this.opensMaia = true;
    for (const q of this.fore) {
      q.m.barrage = t >= ARRAY.FILL;
      q.m.update();
      q.m.lookAt({ x: (this.tx - q.x) / q.sc, y: (this.ground - q.y) / q.sc });
      q.m.charge = t >= ARRAY.FILL ? clamp((t - ARRAY.FILL) / (ARRAY.CHARGE - ARRAY.FILL), 0, 1) : 0;
    }
    this.giant.update();
    this.giant.lookAt({ x: (this.tx - this.giantAt.x) / this.giantAt.sc, y: (this.ground - this.giantAt.y) / this.giantAt.sc });
    if (t > ARRAY.CHARGE && t <= ARRAY.WAVES) { // down to the mark, the array still overhead
      const u = ease((t - ARRAY.CHARGE) / (ARRAY.WAVES - ARRAY.CHARGE));
      f.x = this.tx; f.y = lerp(this.ground - 1100, this.ground - 650, u);
      cam.setZoom(lerp(0.36, 0.42, u));
    }
    // the barrage
    for (const s of this.shots) {
      if (s.at !== t) continue;
      const src = this.fore.length && s.src % 3 ? this.lensOf(this.fore[s.src % this.fore.length]) : (() => { const q = this.far[s.src % this.far.length]; return { x: q.x, y: q.y }; })();
      const y = g.terrain.hAt(s.x);
      g.lasers.push(new Laser(src.x, src.y, s.x, y, s.src % 2 ? '#bfe8ff' : '#ffc0e8', 10, 26));
      g.explode(s.x, y, { maia: true, dmg: this.cfg.dmg, dmgR: this.cfg.r, explR: 8, from: { x: src.x - s.x, y: src.y - y } }, this.owner, 'laser');
      if (t % 4 === 0) g.sfx.satFire();
      g.shake = Math.max(g.shake, 8);
    }
    // the last wave: the vast MAIA
    if (t > ARRAY.BIG_CHARGE && t <= ARRAY.BIG_FIRE) {
      this.big = (t - ARRAY.BIG_CHARGE) / (ARRAY.BIG_FIRE - ARRAY.BIG_CHARGE);
      this.giant.charge = this.big;
      cam.setZoom(lerp(0.42, 0.36, ease(this.big)));
      f.y = lerp(this.ground - 650, this.ground - 900, ease(this.big));
      if (t === ARRAY.BIG_CHARGE + 1) g.sfx.satPrep();
    }
    if (t === ARRAY.BIG_FIRE) {
      const l = this.giant.lens(), G = this.giantAt;
      this.beam = { x: G.x + l.x * G.sc, y: G.y + l.y * G.sc };
      const y = g.terrain.hAt(this.tx);
      g.lasers.push(new Laser(this.beam.x, this.beam.y, this.tx, y, '#ffe8f6', 150, 90));
      const B = this.cfg.final;
      g.explode(this.tx, y, { maia: true, dmg: B.dmg, dmgR: B.r, explR: B.explR, visR: 460, from: { x: this.beam.x - this.tx, y: this.beam.y - y } }, this.owner, 'laser');
      g.shake = Math.max(g.shake, 34);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.85);
      g.sfx.satFire(); g.sfx.explosion(70);
      this.giant.charge = 0;
    }
    if (t > ARRAY.BIG_FIRE + 40 && t <= ARRAY.BIG_FIRE + 80) cam.setZoom(lerp(0.36, this.zoom0, ease((t - ARRAY.BIG_FIRE - 40) / 40)));
    cam.follow(f);
    if (t <= ARRAY.BIG_FIRE + 40) cam.snap();
    if (t >= ARRAY.END) { this.opensMaia = false; cam.zmin = 0; cam.ceil = -1000; cam.wide = 0; return false; }
    return true;
  }

  // the array fades out at the end, everything in the order it arrived
  fade() { return 1 - clamp((this.t - ARRAY.BIG_FIRE - 50) / 80, 0, 1); }

  draw(ctx) {
    const t = this.t, time = this.game.time, fade = this.fade();
    // the vast MAIA, hazy, behind everything
    if (t >= ARRAY_BURSTS[3]) {
      const G = this.giantAt, a = Math.min(1, (t - ARRAY_BURSTS[3]) / 20) * fade;
      drawScaled(ctx, G.x, G.y, G.sc, 0.38 * a, () => { this.giant.x = 0; this.giant.y = 0; this.giant.draw(ctx); });
      if (this.big > 0 && t < ARRAY.BIG_FIRE) { // gathering light at its emitter
        const l = this.giant.lens();
        ctx.fillStyle = `rgba(255,220,240,${0.3 + 0.6 * this.big})`;
        sq(ctx, G.x + l.x * G.sc, G.y + l.y * G.sc, 40 + 160 * this.big + Math.sin(time * 30) * 10);
      }
    }
    // far MAIAs: silhouettes with a glowing core
    for (const q of this.far) {
      if (t < q.at) continue;
      const a = Math.min(1, (t - q.at) / 6) * fade;
      ctx.fillStyle = `rgba(90,34,70,${0.6 * a})`;
      for (let y = -q.r; y < q.r; y += 4) { const w = 2 * Math.sqrt(q.r * q.r - (y + 2) * (y + 2)); ctx.fillRect(Math.round(q.x - w / 2), Math.round(q.y + y), Math.round(w), 4); }
      ctx.fillStyle = `rgba(255,190,230,${(0.4 + 0.5 * (t >= ARRAY.FILL ? 1 : 0)) * a})`;
      sq(ctx, q.x, q.y, q.r * 0.6);
      if (t - q.at < 6) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - q.at) / 6})`; sq(ctx, q.x, q.y, q.r * 4); }
    }
    // the foreground array
    for (const q of this.fore) {
      if (t < q.at) continue;
      const a = Math.min(1, (t - q.at) / 5) * fade;
      drawScaled(ctx, q.x, q.y, q.sc, a, () => { q.m.x = 0; q.m.y = 0; q.m.draw(ctx); });
      if (t - q.at < 8) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - q.at) / 8})`; sq(ctx, q.x, q.y, 260 * q.sc); }
    }
    // the eye at MAIA's core
    if (this.eye > 0 && fade > 0) {
      const c = this.game.satellite.center(), o = this.eye;
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#17172f'; ctx.fillRect(Math.round(c.x - 30), Math.round(c.y - 1), 60, 2); // the closed lid line
      for (let y = -16; y < 16; y += 2) {
        const v = (y + 1) / 16, half = 28 * Math.sqrt(Math.max(0, 1 - v * v));
        if (Math.abs(y + 1) > 16 * o) continue;
        ctx.fillStyle = '#fff6fb'; ctx.fillRect(Math.round(c.x - half), Math.round(c.y + y), Math.round(half * 2), 2);
      }
      const ir = 11 * Math.min(1, o * 1.4);
      for (let y = -ir; y < ir; y += 2) {
        if (Math.abs(y + 1) > 16 * o) continue;
        const w = Math.sqrt(Math.max(0, ir * ir - (y + 1) * (y + 1)));
        ctx.fillStyle = Math.abs(y) < ir * 0.5 ? '#e0409a' : '#a01e6a';
        ctx.fillRect(Math.round(c.x - w), Math.round(c.y + y), Math.round(w * 2), 2);
      }
      ctx.fillStyle = '#12020c'; ctx.fillRect(Math.round(c.x - 1.5), Math.round(c.y - Math.min(9, 16 * o)), 3, Math.round(Math.min(18, 32 * o))); // slit pupil
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(c.x + 3), Math.round(c.y - 6 * o), 3, 3);
      ctx.fillStyle = '#17172f'; // lashes on the lids as they part
      ctx.fillRect(Math.round(c.x - 30), Math.round(c.y - 16 * o - 2), 60, 3);
      ctx.fillRect(Math.round(c.x - 26), Math.round(c.y + 16 * o - 1), 52, 2);
      ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------------------ the Naito MAIA
// Object 15X's Zero Point. The slug is a probe. The camera goes to MAIA and rushes up past the NXi
// fleet and the asteroid belt into the dark; the scene fades to Jupiter, vast on the left, and
// something stirs in the Great Red Spot. The view climbs and bleeds to red: the Naito MAIA
// Containment Satellite (Hatsuyuki's own MAIA is their attempt at one) slides down from above,
// a battery of barrels pointing down. "Annihilation orders received." It charges; cut to Jupiter
// further off, a beam leaving the spot; the camera plunges back to the whole map, and the ground
// around the probe is simply deleted: no explosion, sheer black cliffs, molten lips, the beam
// thinning to mist. Anything that falls in is gone (Terrain.erase, Game.landed).
// Screen-space scenes (Jupiter, the satellite) are drawn over everything by drawScreen.
const NAITO = { TO_MAIA: 20, UP: 50, SPACE: 150, FADE: 168, JUP: 172, STIR: 205, RISE: 262, RED: 290, SAT: 300, ORDERS: 352, CHARGE: 372, CUT: 432, DIVE: 476, HIT: 512, ERASE: 14, END: 650 };
const NAITO_SKY = 9000; // how far the climb goes before the fade
let _jupiter = null;
// Jupiter, painted once into a small offscreen canvas of chunky pixels: banded, limb-darkened,
// the Great Red Spot below the equator
function jupiterCanvas() {
  if (_jupiter) return _jupiter;
  const N = 220, c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d');
  const bands = [[232, 214, 186], [196, 150, 110], [238, 226, 204], [170, 118, 84], [226, 200, 160], [150, 104, 78], [236, 220, 190], [204, 160, 120], [180, 132, 96], [228, 210, 178]];
  const r = N / 2;
  for (let py = 0; py < N; py += 2) {
    for (let px = 0; px < N; px += 2) {
      const dx = (px - r + 1) / r, dy = (py - r + 1) / r, d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const lat = dy + 0.04 * Math.sin(dx * 9 + dy * 4) + 0.02 * Math.sin(dx * 23);
      const b = bands[clamp(Math.floor(((lat + 1) / 2) * bands.length * 1.6), 0, 1e3) % bands.length];
      let col = b;
      const sx = (dx - 0.32) / 0.2, sy = (dy - 0.36) / 0.11, s2 = sx * sx + sy * sy; // the spot
      if (s2 < 1) col = s2 < 0.25 ? [196, 70, 48] : s2 < 0.6 ? [214, 104, 70] : [230, 150, 110];
      const lim = 0.35 + 0.65 * Math.sqrt(1 - d2);
      x.fillStyle = `rgb(${Math.round(col[0] * lim)},${Math.round(col[1] * lim)},${Math.round(col[2] * lim)})`;
      x.fillRect(px, py, 2, 2);
    }
  }
  return (_jupiter = c);
}
// where the spot sits on that canvas, as a fraction of its size
const JUP_SPOT = [0.5 + 0.32 / 2, 0.5 + 0.36 / 2];

// the Naito MAIA: a vast containment frame round a MAIA-like core, clamps gripping it, radiator
// wings off both sides and a deck of long barrels pointing straight down. Screen units, centred on
// the core; `charge` lights the rings and muzzles, `eye` its red eye.
const NAITO_BARRELS = [[-300, 360], [-200, 470], [-100, 560], [0, 620], [100, 560], [200, 470], [300, 360]]; // [x, length]
function drawNaito(ctx, cx, cy, charge, time) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x), Math.round(cy + y), Math.round(w), Math.round(h)); };
  const dark = '#1e1a24', plate = '#3a3242', edge = '#5e5270', red = '#ff2f4a';
  // radiator wings, off the edges of the screen
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = s * (360 + i * 90);
      R(s > 0 ? x : x - 80, -160 + i * 6, 80, 220 - i * 12, i % 2 ? '#2a2432' : '#322a3c');
      R(s > 0 ? x : x - 80, -160 + i * 6, 80, 4, edge);
    }
    R(s > 0 ? 300 : -1200, -40, 900, 22, plate); // the spar
  }
  // the containment frame
  R(-340, -330, 680, 40, plate); R(-340, 250, 680, 50, plate);
  R(-340, -330, 40, 620, plate); R(300, -330, 40, 620, plate);
  for (let i = 0; i < 6; i++) { R(-300 + i * 120, -330, 6, 40, edge); R(-300 + i * 120, 250, 6, 50, edge); }
  // the antenna spire above
  R(-14, -620, 28, 300, dark); R(-60, -520, 120, 10, edge); R(-90, -440, 180, 10, edge);
  if ((time * 2 | 0) % 2) R(-6, -640, 12, 12, red);
  // the core, a MAIA's stepped discs grown huge
  const disc = (r, col) => { ctx.fillStyle = col; for (let y = -r; y < r; y += 10) { const w = 2 * Math.sqrt(Math.max(0, r * r - (y + 5) * (y + 5))); ctx.fillRect(Math.round(cx - w / 2), Math.round(cy + y), Math.round(w), 10); } };
  disc(240, '#4a1636'); disc(205, '#17172f'); disc(160, '#5a1c42'); disc(110, '#2a0e22');
  // its eye: red, slit, staring down
  const o = 0.3 + 0.7 * charge;
  for (let y = -40; y < 40; y += 4) { const v = (y + 2) / 40; if (Math.abs(v) > o) continue; const w = 90 * Math.sqrt(1 - v * v); R(-w, y, w * 2, 4, '#ffe6ea'); }
  for (let y = -34; y < 34; y += 4) { if (Math.abs((y + 2) / 40) > o) continue; const w = Math.sqrt(Math.max(0, 34 * 34 - (y + 2) * (y + 2))); R(-w, y, w * 2, 4, Math.abs(y) < 14 ? '#ff3a52' : '#a01028'); }
  R(-4, -30 * o, 8, 60 * o, '#12020a');
  // the clamps gripping it from the corners, with their chains
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (let k = 0; k < 7; k++) R(sx * (300 - k * 22) - 14, sy * (290 - k * 20) - 14, 28, 28, k % 2 ? dark : plate);
    R(sx * 158 - 30, sy * 150 - 30, 60, 60, edge);
  }
  // the barrel deck and the barrels, pointing down
  R(-380, 300, 760, 60, dark); R(-380, 300, 760, 6, edge);
  NAITO_BARRELS.forEach(([x, L], i) => {
    R(x - 26, 360, 52, 40, plate); // breech housing
    R(x - 16, 400, 32, L - 40, '#2c2634'); // tube
    R(x - 16, 400, 6, L - 40, edge);
    for (let k = 0; k < 5; k++) {
      const y = 430 + k * (L - 90) / 4, lit = charge * 5 > k;
      R(x - 22, y, 44, 12, lit ? '#ff3a8a' : plate); // accelerator rings, lighting in turn
    }
    R(x - 24, 360 + L, 48, 22, plate); // muzzle
    if (charge > 0) { const g = charge * (0.6 + 0.4 * Math.sin(time * 20 + i)); R(x - 14, 360 + L + 16, 28, 20 + 40 * g, `rgba(255,80,160,${g})`); R(x - 6, 360 + L + 20, 12, 30 + 70 * g, `rgba(255,230,245,${g})`); }
  });
  // warning lights along the frame
  for (let i = 0; i < 12; i++) if (((time * 3 | 0) + i) % 4 === 0) R(-330 + i * 58, -322, 8, 8, red);
}

class NaitoStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    const sc = game.satellite.center();
    this.sat = { x: sc.x, y: sc.y };
    this.focus = { x: this.tx, y: this.ground - 200 };
    this.cut = 0; // the half-width deleted so far
    this.beam = 0;
    this.mist = [];
    game.cam.ceil = this.sat.y - NAITO_SKY - 2000;
    game.cam.follow(this.focus);
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, f = this.focus, N = NAITO;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    if (t > N.TO_MAIA && t <= N.UP) { // over to MAIA
      const u = ease((t - N.TO_MAIA) / (N.UP - N.TO_MAIA));
      f.x = lerp(this.tx, this.sat.x, u); f.y = lerp(this.ground - 200, this.sat.y + 60, u);
    }
    if (t > N.UP && t <= N.FADE) { // and straight up, past the fleet and the belt, into the dark
      const u = Math.pow((t - N.UP) / (N.FADE - N.UP), 1.6);
      f.x = this.sat.x; f.y = lerp(this.sat.y + 60, this.sat.y - NAITO_SKY, u);
      g.ascent = Math.min(1, (t - N.UP) / 20); g.ascentDir = 1;
    }
    if (t === N.FADE) g.ascent = 0;
    if (t === N.JUP) g.ui.notice('A signal from the Great Red Spot.');
    if (t === N.SAT) g.ui.notice('Naito MAIA Containment Satellite.');
    if (t === N.ORDERS) { g.ui.notice('Annihilation orders received.'); g.events.push('Annihilation orders received.'); g.sfx.satPrep(); }
    if (t === N.CUT) g.sfx.satFire();
    if (t === N.DIVE) { // back down to the battlefield, the whole of it
      cam.zmin = 0.36; cam.wide = 700;
      cam.setZoom(0.36);
      f.x = WORLD_W / 2; f.y = this.ground - 4000;
    }
    if (t > N.DIVE && t <= N.HIT) {
      const u = ease((t - N.DIVE) / (N.HIT - N.DIVE));
      f.x = WORLD_W / 2; f.y = lerp(this.ground - 4000, WORLD_BOTTOM * 0.45, u);
      g.ascent = 1 - u; g.ascentDir = -1;
    }
    if (t === N.HIT) { g.ascent = 0; this.beam = 1; g.screenFlash = Math.max(g.screenFlash || 0, 0.5); g.terrain.voidOwner = this.owner; }
    // the deletion: no blast, just gone, the cut widening over a few frames
    if (t > N.HIT && t <= N.HIT + N.ERASE) {
      const r = this.cfg.r * ((t - N.HIT) / N.ERASE);
      g.terrain.erase(this.tx - r, this.tx + r);
      for (const l of g.bg.layers || []) for (let x = Math.max(0, Math.floor(this.tx - r)); x <= Math.min(WORLD_W - 1, this.tx + r); x++) l.height[x] = VOID_Y; // the background too
      this.cut = r;
      for (const c of g.crates) if (c.alive && Math.abs(c.x - this.tx) < r) c.alive = false;
      g.shake = Math.max(g.shake, 6);
    }
    if (t === N.HIT + N.ERASE) {
      g.events.push('The ground is gone.');
      for (let i = 0; i < 40; i++) { // molten flecks off the lips
        const side = i % 2 ? 1 : -1, x = this.tx + side * (this.cut + 4);
        const a = -Math.PI / 2 + side * (0.2 + rng.next() * 0.6), sp = 1 + rng.next() * 4;
        g.drops.push(new AcidDrop(g, this.owner, x, g.terrain.hAt(x) - 4, Math.cos(a) * sp, Math.sin(a) * sp, 6, true));
      }
    }
    if (t > N.HIT + N.ERASE) {
      this.beam = Math.max(0, this.beam - 1 / 90);
      if (t % 2 === 0 && this.beam > 0) { // thinning to mist
        g.particles.add({ x: this.tx + (Math.random() * 2 - 1) * this.cut, y: lerp(cam.y, this.ground, Math.random()), vx: (Math.random() - 0.5) * 0.6, vy: -0.2 - Math.random() * 0.4, g: 0, drag: 0.99, life: 1.5 + Math.random(), size: 30 + Math.random() * 50, color: Math.random() < 0.5 ? [230, 220, 255] : [255, 200, 230] });
      }
    }
    if (t > N.HIT + 90 && t <= N.HIT + 130) cam.setZoom(lerp(0.36, this.zoom0, ease((t - N.HIT - 90) / 40)));
    if (t === N.HIT + 90) f.x = this.tx, f.y = this.ground - 200;
    cam.follow(f);
    if (t <= N.HIT + 90) cam.snap();
    if (t >= N.END) { cam.zmin = 0; cam.wide = 0; cam.ceil = -1000; g.ascent = 0; g.ascentDir = 1; return false; }
    return true;
  }

  // in the world: the fleet and the belt passed on the way up, and the beam over the cut
  draw(ctx) {
    const time = this.game.time, x = this.sat.x;
    const fy = this.sat.y - NAITO_SKY * 0.45, by = this.sat.y - NAITO_SKY * 0.8;
    drawBattlecruiser(ctx, Math.round(x + 480), Math.round(fy), -1, time);
    drawBattlecruiser(ctx, Math.round(x - 420), Math.round(fy + 300), 1, time + 1);
    drawFrigate(ctx, Math.round(x + 60), Math.round(fy - 220), time, false);
    for (let i = 0; i < 14; i++) {
      const R = 20 + hash2(i, 3) * 70;
      ctx.fillStyle = i % 3 ? '#5a5048' : '#6e645a';
      const rx = x + (hash2(i, 7) - 0.5) * 2200, ry = by + (hash2(i, 9) - 0.5) * 900;
      for (let y = -R; y < R; y += 10) { const w = 2 * Math.sqrt(R * R - (y + 5) * (y + 5)) * (0.8 + 0.2 * hash2(i, y)); ctx.fillRect(Math.round(rx - w / 2), Math.round(ry + y), Math.round(w), 10); }
    }
    if (this.beam > 0) {
      const cam = this.game.cam, w = Math.max(this.cut, this.cfg.r * 0.2) * (0.6 + 0.4 * this.beam);
      ctx.fillStyle = `rgba(255,120,190,${0.25 * this.beam})`; ctx.fillRect(Math.round(this.tx - w * 1.15), cam.y - 100, Math.round(w * 2.3), this.ground - cam.y + 300);
      ctx.fillStyle = `rgba(255,236,250,${0.55 * this.beam})`; ctx.fillRect(Math.round(this.tx - w * 0.7), cam.y - 100, Math.round(w * 1.4), this.ground - cam.y + 300);
    }
  }

  // over everything, in screen units (W x H): the scenes out past the belt
  drawScreen(ctx) {
    const t = this.t, N = NAITO, time = this.game.time;
    if (t < N.SPACE || t > N.DIVE + 10) return;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const black = (a) => { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); };
    if (t < N.JUP) { black(clamp((t - N.SPACE) / (N.FADE - N.SPACE), 0, 1)); return; }
    const stars = (tint) => { for (let i = 0; i < 90; i++) { ctx.fillStyle = tint; ctx.fillRect(Math.round(hash2(i, 1) * W), Math.round(hash2(i, 2) * H), 2, 2); } };
    ctx.imageSmoothingEnabled = false;
    if (t < N.SAT) {
      // Jupiter, bigger than the screen, the view drifting up off it and bleeding to red
      const rise = ease((t - N.RISE) / (N.RED - N.RISE)) * 500;
      ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, W, H);
      stars('rgba(255,255,255,0.7)');
      const S = 900, jx = -380, jy = -120 + rise;
      ctx.drawImage(jupiterCanvas(), jx, jy, S, S);
      const spx = jx + JUP_SPOT[0] * S, spy = jy + JUP_SPOT[1] * S;
      if (t > N.STIR) { // something coming up out of the spot
        const u = ease((t - N.STIR) / (N.RISE - N.STIR));
        ctx.fillStyle = `rgba(20,8,16,${u})`; ctx.fillRect(Math.round(spx - 4 - 8 * u), Math.round(spy - 30 * u - 4), Math.round(8 + 16 * u), Math.round(8 + 10 * u));
        ctx.fillStyle = `rgba(255,60,90,${u * (0.5 + 0.5 * Math.sin(time * 8))})`; ctx.fillRect(Math.round(spx - 2), Math.round(spy - 30 * u - 2), 4, 4);
      }
      if (t < N.JUP + 16) black(1 - (t - N.JUP) / 16);
      if (t > N.RISE) { ctx.fillStyle = `rgba(120,0,16,${ease((t - N.RISE) / (N.RED - N.RISE))})`; ctx.fillRect(0, 0, W, H); }
      return;
    }
    if (t < N.CUT) {
      // the red: the Naito MAIA sliding down from above, then charging
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2a0008'); g.addColorStop(1, '#6a0014');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars('rgba(255,140,150,0.5)');
      const u = ease((t - N.SAT) / (N.ORDERS - N.SAT));
      const charge = clamp((t - N.CHARGE) / (N.CUT - N.CHARGE - 8), 0, 1);
      const shake = charge > 0.6 ? (Math.random() - 0.5) * 8 * charge : 0;
      ctx.save();
      ctx.translate(W / 2 + shake, 0);
      ctx.scale(0.62, 0.62);
      drawNaito(ctx, 0, lerp(-1500, 300, u), charge, time);
      ctx.restore();
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
      if (t > N.SAT + 20) { ctx.fillStyle = `rgba(255,200,205,${clamp((t - N.SAT - 20) / 20, 0, 1)})`; ctx.fillText('NAITO MAIA  //  CONTAINMENT SATELLITE', 24, H - 40); }
      if (t > N.ORDERS) {
        ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = (time * 4 | 0) % 2 ? '#ff4060' : '#ffd0d8';
        ctx.fillText('ANNIHILATION ORDERS RECEIVED', W / 2, H / 2 + 200 * 0 + 20);
      }
      if (t < N.SAT + 10) { ctx.fillStyle = `rgba(120,0,16,${1 - (t - N.SAT) / 10})`; ctx.fillRect(0, 0, W, H); }
      if (charge > 0.95) { ctx.fillStyle = 'rgba(255,230,240,0.8)'; ctx.fillRect(0, 0, W, H); }
      return;
    }
    // cut: Jupiter from further off, the beam leaving the spot
    ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, W, H);
    stars('rgba(255,255,255,0.7)');
    const S = 360, jx = 70, jy = 110;
    ctx.drawImage(jupiterCanvas(), jx, jy, S, S);
    const spx = jx + JUP_SPOT[0] * S, spy = jy + JUP_SPOT[1] * S;
    const u = ease((t - N.CUT) / 24);
    for (let i = 0; i < 40; i++) { // a beam toward us, widening as it comes
      const k = i / 40 * u, bx = lerp(spx, W + 200, k), by = lerp(spy, H + 120, k), w = 4 + 120 * k * k;
      ctx.fillStyle = `rgba(255,90,170,${0.6})`; ctx.fillRect(Math.round(bx - w), Math.round(by - w), Math.round(w * 2), Math.round(w * 2));
      ctx.fillStyle = 'rgba(255,240,250,0.8)'; ctx.fillRect(Math.round(bx - w * 0.4), Math.round(by - w * 0.4), Math.round(w * 0.8), Math.round(w * 0.8));
    }
    if (t > N.DIVE - 14) black(clamp((t - N.DIVE + 14) / 14, 0, 1)); // and out, to the dive
    if (t > N.DIVE) { ctx.fillStyle = `rgba(0,0,0,${1 - (t - N.DIVE) / 10})`; ctx.fillRect(0, 0, W, H); }
  }
}

// ------------------------------------------------------------------------- G.W. battery
// G.W. Tiger's Ragnarök: the shell is a marker. The camera whips sideways off the edge of the map
// to her platoon (four G.W. Tiger SPGs in the original Artillery box art, and a Karl-Gerät 60cm
// siege mortar), which ripple-fires two rounds a gun, then the mortar; it whips back to the mark as
// the shells rain in across the area, and the Karl's round lands last with an earthquake.
const BATTERY = { OUT: 34, FIRE: 44, KARL: 112, BACK: 128, BACK_END: 160, LAND: 166, KARL_LAND: 250, END: 324 };
const BATTERY_OFF = 1100; // how far past the edge of the map the guns sit
const BATTERY_SCALE = 4.2; // tanks are a lot bigger than the girls
const BATTERY_GUNS = [-1060, -820, -580, -340]; // the G.W.s, from the Karl outward (x, before facing)
const BATTERY_MID = 560; // the middle of the platoon, from the Karl
// more batteries dug in along the background ridges (layer index, parallax scale, count): the
// whole line is firing. Each of their rounds lands too, at half a G.W. round's damage.
const BATTERY_BACK = [[2, 0.55, 7], [2, 0.36, 9]]; // the nearest ridge hides the rest; two depths along it

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
    const land = (dmg, r, spread) => this.rounds.push({
      x: clamp(this.tx + (rng.next() * 2 - 1) * spread, 4, WORLD_W - 4), at: BATTERY.LAND + Math.round(rng.next() * (BATTERY.KARL_LAND - BATTERY.LAND - 16)), dmg, r, done: false });
    for (let i = 0; i < BATTERY_GUNS.length * 2; i++) land(cfg.dmg, cfg.r, cfg.spread);
    // the guns on the background ridges: positions in each layer's own coordinates, past its edge
    this.back = [];
    const layers = game.bg.layers || [];
    for (const [li, sc, n] of BATTERY_BACK) {
      const l = layers[li];
      if (!l) continue;
      for (let i = 0; i < n; i++) {
        const fire = BATTERY.FIRE + Math.round(rng.next() * (BATTERY.KARL - BATTERY.FIRE));
        this.back.push({ li, sc, x: this.edge + this.side * (180 + i * (1500 / n) + sc * 200 + rng.next() * 60), fire: [fire, fire + 26], recoil: 0, flash: 0 });
        land(cfg.dmg * 0.5, cfg.r * 0.8, cfg.spread * 1.5);
      }
    }
    game.cam.wide = BATTERY_OFF + 2200;
    game.cam.follow(this.focus);
    game.ui.notice('G.W. battery, fire for effect.');
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus, px = f.x;
    const view = { x: this.bx + this.face * BATTERY_MID, y: this.by - 260 }; // the middle of the platoon
    if (t <= BATTERY.OUT) { // whip out to the guns
      const u = ease(t / BATTERY.OUT);
      f.x = lerp(this.tx, view.x, u); f.y = lerp(this.ground - 160, view.y, u);
      cam.setZoom(lerp(this.zoom0, 0.6, u));
    }
    // ripple fire: two rounds a gun, the autoloader's second close behind, then the mortar
    this.guns.forEach((gun, i) => {
      if (t === BATTERY.FIRE + i * 6 || t === BATTERY.FIRE + 30 + i * 6) this.fire(gun, false);
    });
    if (t === BATTERY.KARL) this.fire(this.karl, true);
    for (const b of this.back) if (b.fire.includes(t)) { b.recoil = 1; b.flash = 1; if (t % 3 === 0) g.sfx.explosion(18); }
    if (t > BATTERY.BACK && t <= BATTERY.BACK_END) { // and whip back to the mark
      const u = ease((t - BATTERY.BACK) / (BATTERY.BACK_END - BATTERY.BACK));
      f.x = lerp(view.x, this.tx, u); f.y = lerp(view.y, this.ground - 200, u);
      cam.setZoom(lerp(0.6, Math.min(this.zoom0, 0.6), u));
    }
    for (const r of this.rounds) {
      if (r.done || t < r.at) continue;
      r.done = true;
      const y = g.terrain.hAt(r.x);
      g.explode(r.x, y, { dmg: r.dmg, dmgR: r.r, explR: 30, from: { x: this.face, y: -2 } }, this.owner, 'shell');
      g.shake = Math.max(g.shake, 14);
    }
    if (t === BATTERY.KARL_LAND) {
      const k = this.cfg.karl, y = g.terrain.hAt(this.tx); // the floor of whatever craters are there by now
      g.explode(this.tx, y, { dmg: k.dmg, dmgR: k.r, explR: k.explR, visR: 320, from: { x: this.face, y: -3 } }, this.owner, 'shell');
      g.quake(this.tx, y, k.quake, this.owner);
      g.shake = Math.max(g.shake, 36);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.6);
      g.sfx.explosion(70);
    }
    for (const gun of [...this.guns, this.karl, ...this.back]) { gun.recoil = Math.max(0, gun.recoil - 0.06); gun.flash = Math.max(0, gun.flash - 0.15); }
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
  muzzle(gun, karl, gx = gun.x, gy = this.by, S = BATTERY_SCALE) {
    const v = this.aim(karl), piv = karl ? [0, -24] : [-9, -18];
    const d = (karl ? 50 : 34) - gun.recoil * 6;
    return { x: gx + this.face * piv[0] * S + v.x * d * S, y: gy + piv[1] * S + v.y * d * S };
  }

  // one gun (a G.W. or the Karl) at ground point gx, gy and scale S, in the palette pal
  drawGun(ctx, gun, karl, gx, gy, S, pal) {
    const face = this.face;
    const box = (c, lx, ty, w, h) => {
      ctx.fillStyle = c;
      const left = face > 0 ? gx + lx * S : gx - (lx + w) * S;
      ctx.fillRect(Math.round(left), Math.round(gy + ty * S), Math.ceil(w * S), Math.ceil(h * S));
    };
    if (karl) drawKarl(box, pal); else drawGWSPG(box, pal);
    const v = this.aim(karl), piv = karl ? [0, -24] : [-9, -18];
    const px = gx + face * piv[0] * S, py = gy + piv[1] * S;
    const n = karl ? 6 : 8, step = karl ? 7 : 4.5, size = karl ? 13 : 4;
    ctx.fillStyle = pal.deep;
    for (let i = 0; i < n; i++) {
      const d = 6 + i * step - gun.recoil * 6;
      sq(ctx, px + v.x * d * S, py + v.y * d * S, (i === n - 1 ? (karl ? 16 : 6.5) : size) * S);
    }
    if (!karl) drawGWMount(box, pal);
    if (gun.flash > 0) {
      const m = this.muzzle(gun, karl, gx, gy, S);
      ctx.fillStyle = `rgba(255,236,170,${gun.flash})`;
      sq(ctx, m.x + v.x * 10 * S, m.y + v.y * 10 * S, (karl ? 30 : 16) * S * gun.flash);
      ctx.fillStyle = `rgba(255,160,60,${gun.flash * 0.8})`;
      sq(ctx, m.x + v.x * 18 * S, m.y + v.y * 18 * S, (karl ? 20 : 10) * S * gun.flash);
    }
  }

  draw(ctx) {
    const g = this.game, t = this.t, S = BATTERY_SCALE, face = this.face, time = g.time;
    // the background ridges run on past the edge of the map, with more batteries dug in along them
    const layers = g.bg.layers || [];
    for (const li of [...new Set(BATTERY_BACK.map((b) => b[0]))]) {
      const l = layers[li];
      if (!l) continue;
      const ox = g.cam.x * (1 - l.parallax), ly = l.height[this.side < 0 ? 0 : WORLD_W - 1];
      const e0 = this.edge + ox; // where that layer's own ridge line ends on screen
      ctx.fillStyle = l.color;
      ctx.fillRect(this.side < 0 ? e0 - 4000 : e0, ly, 4000, WORLD_BOTTOM - ly + 400);
      const [r0, g0, b0] = (l.color.match(/\d+/g) || [60, 60, 60]).map(Number);
      const tone = (k) => `rgb(${Math.round(r0 * k)},${Math.round(g0 * k)},${Math.round(b0 * k)})`;
      const bpal = { hull: tone(0.8), light: tone(0.95), dark: tone(0.65), deep: tone(0.5), track: tone(0.45), wheel: tone(0.7), metal: tone(0.7), lamp: tone(1.1) };
      for (const b of this.back.filter((q) => q.li === li).sort((p, q) => p.sc - q.sc)) this.drawGun(ctx, b, false, b.x + ox, ly + 2, S * b.sc, bpal);
    }
    // the ground out past the edge of the map, where the guns are dug in
    const x0 = this.side < 0 ? this.edge - 3200 : this.edge, x1 = this.side < 0 ? this.edge : this.edge + 3200;
    const T = g.terrain;
    ctx.fillStyle = T.color; ctx.fillRect(x0, this.by, x1 - x0, WORLD_BOTTOM - this.by + 400);
    if (T.cap) { ctx.fillStyle = T.cap; ctx.fillRect(x0, this.by, x1 - x0, 8); }
    const pal = {
      hull: this.owner.color, light: shade(this.owner.color, 0.3), dark: shade(this.owner.color, -0.25), deep: shade(this.owner.color, -0.5),
      track: '#2b2d33', wheel: '#6b6f78', metal: '#8a8fa0', lamp: '#fff3c0',
    };
    this.drawGun(ctx, this.karl, true, this.karl.x, this.by, S, pal);
    for (const gun of this.guns) this.drawGun(ctx, gun, false, gun.x, this.by, S, pal);
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
