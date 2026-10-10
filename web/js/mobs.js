'use strict';
// Hostile mobs (events on): they belong to nobody, attack the players once per turn cycle, and pay a
// bounty to whoever destroys them. All are targets for shells, blasts and CPUs.
//   Drone     Hatsuyuki bomber (named after A3's shelved AI project): flies up to MOB_MOVE toward the
//             nearest vehicle each cycle and, within BOMB_REACH of it, tosses a bomb onto it.
//   Gunner    a drone with a gun: closes in the same way, then fires a three-round burst if it has a
//             clear line of sight within GUNNER_RANGE.
//   Turret    an emplacement built into the ground: lobs a shell at the nearest vehicle every cycle.
//   FPV       a small kamikaze quad: comes in high, and spends its first cycle flying FPV_ENTER in
//             from the edge (or climbing, mid-map) without attacking, so nobody by the edge is
//             caught by one the moment it appears. Then each cycle it flies up to FPV_MOVE: over
//             its vehicle, and down onto it from the sky, blowing up when it gets there. Shoot it first.
//   Carrier   a heavy drone with a drone tank slung under it: flies to a drop zone near the players
//             and lets it down on a parachute, then bombs like a drone.
//   Drone tank a tracked Hatsuyuki vehicle: drives in from the edge of the map (or is airdropped),
//             and every cycle drives up to TANK_MOVE to a firing spot and lobs a shell, like a
//             player with one gun. Armour soaks whole hits, as a girl's does.
//   Android   the drone tanks' final form, late on: a Hatsuyuki android girl with heavy armour and
//             a three-round salvo.
//   Mothership the boss: drifts high above the map, launches drones, rains bombs on the leaders, and
//             every third cycle fires a heavy beam.
// Every hostile acts on every hostile turn (once a turn cycle). They arrive in waves: drones from
// round 2, and reinforcements once a round has gone on, more of them and better ones every cycle
// (gunners, then FPVs, then carriers and drone tanks, then the android), so players who are hard to
// hit still get hunted down.

const MOB_MOVE = 320; // most a drone can fly in one cycle (world units)
const MOB_SPEED = 7; // per frame while moving
const GUNNER_RANGE = 720;
const MOB_CAP = 12; // most flying hostiles alive at once
const GROUND_CAP = 4;
const BOMB_REACH = 260; // a bomber lets go within this much of its vehicle (sideways), throwing the bomb // most drone tanks (and androids) at once
const FPV_MOVE = 900; // how far a kamikaze dives in one cycle
const FPV_ENTER = 700; // how far in from the edge it flies on its first cycle (no attack)
const FPV_HIGH = 320; // how far over the hover height it comes in, and dives from
const TANK_MOVE = 150; // how far a drone tank drives in one cycle (the android: 1.5x)
const PARACHUTE_VY = 2.2; // an airdropped tank's descent speed
const FLAK_MOB_MULT = 2; // flak does double damage to mobs
const MOB_BOUNTY_SCALE = 1; // (bounties are shared by the damage each player did: payMobBounty)
const DRONE_SHIELDED = new Set(['drone', 'gunner', 'carrier', 'fpv', 'mothership']);
const SHIELD_RESIST = 0.5; // what share of a flak or fighter hit tells on a drone's shielding
const MOB_PAD = 16, MOB_PAD_SHIP = 20; // (see Mob: a flying hostile's proximity margin)
const SHIP_AA = [[-96, -58], [-44, -66], [8, -70], [58, -66], [104, -58]]; // the mothership's AA mounts, from its anchor
const SHIP_ESCORTS = 3; // support drones arriving with it (+1 every three stages, to 5)
const DRONE_FIELD_BACK = 330; // how far it arcs back at a fighter that is attacking it
const DRONE_FIELD = 150, DRONE_FIELD_DMG = 14, DRONE_FIELD_STAGE = 1; // every flying hostile's static discharge field: reaches a fighter on its gun run, and zaps it (+1 a stage, to stage 8)

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
      mothership: { name: 'Mothership Shirayuki', hp: 1500 + 300 * stage, hw: 142, hh: 88, bounty: 4000 + 600 * stage },
      fpv: { name: 'FPV kamikaze', hp: 25 + 8 * stage, hw: 12, hh: 10, bounty: 150 + 40 * stage },
      carrier: { name: 'Hatsuyuki carrier', hp: 90 + 25 * stage, hw: 30, hh: 20, bounty: 350 + 70 * stage },
      dtank: { name: 'Hatsuyuki drone tank', hp: 70 + 25 * stage, armour: 30 + 12 * stage, hw: 22, hh: 20, bounty: 450 + 80 * stage },
      aatank: { name: 'Hatsuyuki AA tank', hp: 80 + 22 * stage, armour: 20 + 10 * stage, hw: 22, hh: 20, bounty: 500 + 80 * stage },
      android: { name: 'Hatsuyuki android', hp: 260 + 50 * stage, armour: 160 + 30 * stage, hw: 14, hh: 42, bounty: 2500 + 300 * stage },
    }[kind];
    Object.assign(this, S);
    this.bounty = Math.round(this.bounty * MOB_BOUNTY_SCALE); // (rivals pay their share now: hostiles a little less)
    this.maxHp = this.hp;
    this.maxArmour = this.armour;
    // better drones (from stage 4) carry a little shielding, which shrugs off flak and fighters'
    // guns; it grows a stage at a time and levels off by stage 8
    const sh = clamp(stage - 3, 0, 5);
    this.shield = this.maxShield = DRONE_SHIELDED.has(kind) ? (kind === 'mothership' ? 80 : 8) * sh : 0;
    // the AA tank's mount: flak at the players' planes while shots play out (aa.js), levelling off by stage 8
    if (kind === 'aatank') this.aaMount = { id: 'mob_aa', role: 'air', range: 340, rof: 8, dmg: 16 + 2 * Math.min(stage, 8), acc: 0.7, pk: 0.04, perTurn: 4, splash: 0 };
    // the mothership's AA: five radar-laid flak mounts along its deck, firing from whichever is nearest
    if (kind === 'mothership') {
      this.aaMount = { id: 'ship_aa', role: 'air', range: 430, rof: 5, dmg: 22 + 3 * Math.min(stage, 8), acc: 0.75, pk: 0.05, perTurn: 10, splash: 0 };
      this.aaPoints = SHIP_AA.map(([lx, ly]) => ({ lx, ly, ang: -Math.PI / 2, kick: 0 }));
    }
    // a proximity margin: a shell coming within this of a flying hostile's body counts as a hit,
    // and bursts there (so it does less than one dead on it: blasts measure to the body)
    this.pad = Mob.GROUND.has(kind) ? 0 : kind === 'mothership' ? MOB_PAD_SHIP : MOB_PAD;
    this.facing = -1;
    this.vy = 0;
    this.aim = { x: 1, y: 0 };
    this.cycles = 0;
  }

  get flying() { return !Mob.GROUND.has(this.kind); }
  get mover() { return this.kind === 'dtank' || this.kind === 'aatank' || this.kind === 'android'; } // drives and fires like a player
  center() { return { x: this.x, y: this.y - this.hh / 2 }; }

  update(game) {
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
    this.aaKick = Math.max(0, (this.aaKick || 0) - 0.15);
    if (this.aaPoints) for (const a of this.aaPoints) a.kick = Math.max(0, a.kick - 0.15);
    if (!this.alive) return;
    if (this.kind === 'turret') { this.y = game.terrain.hAt(this.x); return; }
    if (this.mover) {
      const gx = clamp(this.x, 0, WORLD_W - 1);
      if (this.drop) { // on its parachute
        this.vy = Math.min(PARACHUTE_VY, this.vy + 0.08);
        this.y += this.vy;
        if (this.y >= game.terrain.hAt(gx)) { this.y = game.terrain.hAt(gx); this.drop = false; this.vy = 0; game.particles.puff(this.x, this.y); game.sfx.thud(); }
        return;
      }
      if (this.dest) {
        const dx = this.dest.x - this.x;
        if (Math.abs(dx) > 0.5) this.facing = Math.sign(dx);
        this.x += clamp(dx, -2.4, 2.4);
        this.walking = Math.abs(dx) > 0.5;
      } else this.walking = false;
      this.y = game.terrain.hAt(clamp(this.x, 0, WORLD_W - 1));
      this.tilt = (this.tilt || 0) + (groundSlope(game.terrain, clamp(this.x, 1, WORLD_W - 2)) - (this.tilt || 0)) * 0.2;
      return;
    }
    if (this.kind === 'fpv') {
      if (this.dest) {
        const dx = this.dest.x - this.x, dy = this.dest.y - this.y, d = Math.hypot(dx, dy);
        const s = Math.min(d, 15);
        if (d > 0.5) { this.x += (dx / d) * s; this.y += (dy / d) * s; this.aim = { x: dx / d, y: dy / d }; }
        else if (this.path && this.path.length) this.dest = this.path.shift(); // (over it: now down)
      } else this.y += Math.sin(this.t / 20) * 0.4;
      // a quad tips into its direction of travel: nose down to go, level to hover
      const want = this.dest && !this.arrived() ? clamp(this.aim.x * 0.55 + Math.max(0, this.aim.y) * 0.2 * Math.sign(this.aim.x || 1), -0.75, 0.75) : 0;
      this.pitch = (this.pitch || 0) + (want - (this.pitch || 0)) * 0.15;
      return;
    }
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

  arrived() {
    if (this.drop) return false;
    if (this.kind === 'fpv') return !this.dest || (dist(this.x, this.y, this.dest.x, this.dest.y) < 4 && !(this.path && this.path.length));
    return !this.dest || Math.abs(this.dest.x - this.x) < (this.kind === 'mothership' ? 4 : 3);
  }

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
    } else if (this.kind === 'fpv') {
      // a racing quad seen side on: a prop at each end, the battery strapped on top in the middle, the
      // charge slung underneath, a camera at the nose; it pitches into its dive
      const cy = y - 8;
      ctx.save();
      ctx.translate(x, cy);
      ctx.rotate(this.pitch || 0);
      const f = Math.sign(this.aim.x) || 1;
      ctx.fillStyle = c('#2a2a32'); ctx.fillRect(-15, -1, 30, 3); // carbon frame
      ctx.fillStyle = c('#4a4a56'); ctx.fillRect(-15, -4, 4, 3); ctx.fillRect(11, -4, 4, 3); // motors
      const blur = (this.t >> 1) % 2;
      ctx.fillStyle = 'rgba(210,210,224,0.75)'; // two props, spinning
      ctx.fillRect(-21 + blur * 2, -6, 12 - blur * 4, 2);
      ctx.fillRect(9 + blur * 2, -6, 12 - blur * 4, 2);
      ctx.fillStyle = c('#1c1c22'); ctx.fillRect(-6, -7, 12, 6); // battery pack
      ctx.fillStyle = c('#f2c45a'); ctx.fillRect(-5, -6, 4, 4); // its label
      ctx.fillStyle = blink ? '#ff3a3a' : '#7a2020'; ctx.fillRect(3, -6, 2, 2); // charge LED
      ctx.fillStyle = c('#6a5a3a'); ctx.fillRect(-5, 2, 10, 5); // the explosive charge underneath
      ctx.fillStyle = c('#c8402a'); ctx.fillRect(-1, 2, 2, 5); // its det cord
      ctx.fillStyle = c('#101014'); ctx.fillRect(f > 0 ? 13 : -17, 0, 4, 3); // camera at the nose
      ctx.restore();
      if (this.dest && !this.arrived()) { // motion streaks while it dives
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 1; i <= 3; i++) sq(ctx, x - this.aim.x * i * 10, cy - this.aim.y * i * 10, 4 - i);
      }
    } else if (this.kind === 'carrier') {
      // a heavy lifter: long body, four rotors, and its drone tank slung underneath
      const cy = y - 12;
      ctx.fillStyle = c('#34343e');
      ctx.fillRect(x - 24, cy - 6, 48, 12);
      ctx.fillStyle = c('#5a5a6a');
      ctx.fillRect(x - 36, cy - 4, 12, 3);
      ctx.fillRect(x + 24, cy - 4, 12, 3);
      const blade = (this.t >> 2) % 2 ? 18 : 10;
      ctx.fillStyle = 'rgba(200,200,214,0.8)';
      for (const ox of [-34, -18, 18, 34]) ctx.fillRect(x + ox - blade / 2, cy - 8, blade, 2);
      ctx.fillStyle = blink ? 'rgb(255,120,200)' : 'rgb(160,60,120)';
      ctx.fillRect(x - 2, cy - 2, 4, 4);
      if (this.cargo) {
        ctx.fillStyle = c('#20202a');
        ctx.fillRect(x - 1, cy + 6, 2, 8); // the sling
        Mob.drawTankBody(ctx, x, cy + 30, 0.8, c, blink, { x: this.facing, y: 0 }, this.facing);
      }
    } else if (this.kind === 'dtank' || this.kind === 'aatank') {
      if (this.drop) this.drawChute(ctx, x, y - 26);
      // sat on the slope: turned to lie along it (a shear made it look italic)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.drop ? 0 : clamp(Math.atan(this.tilt || 0), -0.5, 0.5));
      ctx.translate(-x, -y);
      Mob.drawTankBody(ctx, x, y, 1, c, blink, this.aim, this.facing, this.walking ? this.t : 0);
      if (this.kind === 'aatank') { // a twin flak mount on the turret, on whatever it last fired at
        const a = this.aaAng === undefined ? -Math.PI / 2 + this.facing * 0.5 : this.aaAng;
        ctx.save(); ctx.translate(x - this.facing * 4, y - 24); ctx.rotate(a);
        ctx.fillStyle = c('#4a4a56'); ctx.fillRect(-4, -5, 8, 10);
        ctx.fillStyle = c('#24242c'); ctx.fillRect(3 - (this.aaKick || 0) * 3, -4, 18, 3); ctx.fillRect(3 - (this.aaKick || 0) * 3, 1, 18, 3);
        ctx.restore();
        ctx.fillStyle = blink ? 'rgb(120,220,255)' : 'rgb(50,110,140)'; ctx.fillRect(x - 2, y - 30, 4, 3); // (its radar)
      }
      ctx.restore();
    } else if (this.kind === 'android') {
      if (this.drop) this.drawChute(ctx, x, y - 50);
      this.drawAndroid(ctx, x, y);
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

  // a parachute canopy and its lines over an airdropped unit
  drawChute(ctx, x, y) {
    ctx.fillStyle = '#e8e4f0';
    ctx.fillRect(x - 30, y - 34, 60, 8);
    ctx.fillRect(x - 24, y - 40, 48, 6);
    ctx.fillStyle = '#ff78c8';
    ctx.fillRect(x - 6, y - 40, 12, 14);
    ctx.fillStyle = 'rgba(40,40,50,0.8)';
    for (let i = 0; i <= 6; i++) sq(ctx, lerp(x - 28, x - 4, i / 6), lerp(y - 26, y, i / 6), 2);
    for (let i = 0; i <= 6; i++) sq(ctx, lerp(x + 28, x + 4, i / 6), lerp(y - 26, y, i / 6), 2);
  }

  // a Hatsuyuki drone tank: tracks, a low hull, a little turret with a pink sensor, a barrel of squares
  static drawTankBody(ctx, x, y, s, c, blink, aim, facing, roll = 0) {
    const R = (lx, ty, w, h) => ctx.fillRect(Math.round(x + (facing < 0 ? -lx - w : lx) * s), Math.round(y + ty * s), Math.round(w * s), Math.round(h * s));
    ctx.fillStyle = c('#24242c'); R(-22, -8, 44, 8); // tracks
    ctx.fillStyle = c('#4a4a56');
    for (let i = 0; i < 5; i++) R(-19 + i * 9 + ((roll >> 2) % 2) * 2, -6, 4, 4); // road wheels
    ctx.fillStyle = c('#3c3c48'); R(-20, -16, 40, 8); // hull
    ctx.fillStyle = c('#5a5a6a'); R(-20, -16, 40, 2);
    ctx.fillStyle = c('#34343e'); R(-10, -24, 18, 8); // turret
    ctx.fillStyle = blink ? 'rgb(255,120,200)' : 'rgb(160,60,120)'; R(4, -22, 3, 3);
    ctx.fillStyle = c('#2a2a32');
    const px = x + facing * 2 * s, py = y - 20 * s;
    const ax = Math.abs(aim.x) > 0.01 ? Math.sign(aim.x) * Math.max(0.3, Math.abs(aim.x)) : facing;
    for (let i = 1; i <= 5; i++) sq(ctx, px + ax * (4 + i * 4) * s, py + aim.y * (4 + i * 4) * s, 4 * s);
  }

  // the android: a turret girl (girls.js 'android') in Hatsuyuki black, with a long gun
  drawAndroid(ctx, x, y) {
    const o = { id: 'android', x, y, facing: this.facing, color: '#ff3a8a', state: this.hp < this.maxHp * 0.5 ? 'damaged' : 'ok', t: this.t / 60, walking: this.walking, flash: this.flash, pose: this.pose || 'idle', poseT: this.pose ? (this.t - this.poseAt) / 60 : 0 };
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(GIRL_SCALE, GIRL_SCALE);
    ctx.translate(-x, -y);
    drawGirl(ctx, o);
    const a = GIRL_ART.android;
    const v = { x: this.aim.x || this.facing, y: this.aim.y || -0.6 };
    const L = Math.hypot(v.x, v.y) || 1;
    drawGun(ctx, WEAPON_BY_ID.gwt290 || WEAPONS[0], { x: x + a.pivot[0] * this.facing, y: y + a.pivot[1] }, { x: v.x / L, y: v.y / L }, this.facing, 0, '#3a1a2a', this.t / 60, 0);
    drawGirlMount(ctx, o);
    ctx.restore();
  }

  // the mothership: an automated destroyer, bow to the left. No bridge, nobody aboard: a flat
  // armoured deckhouse with sensor domes and antenna masts, a turret fore and aft, five flak mounts
  // along the deck that track their targets, the glowing core in its side, the drone bay
  // underneath, and engines at the stern
  drawShip(ctx, x, y, c, blink) {
    const P = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([lx, ly], k) => ctx[k ? 'lineTo' : 'moveTo'](x + lx, y + ly)); ctx.closePath(); ctx.fill(); };
    const R = (lx, ly, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + lx, y + ly, w, h); };
    const HULL = c('#3e3a52'), DARK = c('#2a2638'), DECK = c('#4c4864'), EDGE = c('#6a6488');
    // hull: the bow raked forward and rising, a flat run aft, the keel sweeping up to the stem
    P([[-150, -60], [-110, -52], [132, -52], [140, -34], [132, -14], [-60, -8], [-118, -22]], HULL);
    P([[-118, -22], [-60, -8], [132, -14], [136, -22], [-104, -26]], DARK);
    P([[-150, -60], [-110, -52], [132, -52], [132, -50], [-110, -50], [-148, -58]], EDGE); // the deck edge
    for (let i = -80; i <= 110; i += 24) R(i, -46, 3, 26, DARK); // armour seams
    // the deckhouse: low and flat, with sensor domes and antenna masts instead of a bridge
    R(-70, -64, 150, 12, DECK);
    R(-50, -72, 96, 8, DECK);
    R(-50, -72, 96, 2, EDGE);
    R(-30, -80, 14, 8, EDGE); R(-28, -84, 10, 4, EDGE); // radome
    R(20, -80, 14, 8, EDGE); R(22, -84, 10, 4, EDGE);
    R(-6, -92, 2, 20, EDGE); R(-12, -88, 14, 2, EDGE); // antenna masts
    R(46, -90, 2, 18, EDGE); R(42, -84, 10, 2, EDGE);
    R(-6, -94, 2, 2, blink ? '#ff5aa0' : '#7a2a52'); R(46, -92, 2, 2, blink ? '#7a2a52' : '#ff5aa0');
    // a turret fore and aft
    R(-112, -60, 22, 8, DECK); R(-108, -64, 12, 4, EDGE); R(-136, -59, 24, 2, DARK); R(-136, -55, 24, 2, DARK);
    R(100, -60, 22, 8, DECK); R(104, -64, 12, 4, EDGE); R(122, -59, 22, 2, DARK);
    // the flak mounts: a little twin-barrel turret each, on its target
    for (const a of this.aaPoints || []) {
      R(a.lx - 5, a.ly + 2, 10, 5, DARK);
      ctx.save(); ctx.translate(x + a.lx, y + a.ly); ctx.rotate(a.ang);
      ctx.fillStyle = c('#1c1a26'); ctx.fillRect(2 - a.kick * 3, -3, 12, 2); ctx.fillRect(2 - a.kick * 3, 1, 12, 2);
      ctx.restore();
      R(a.lx - 3, a.ly - 2, 6, 5, EDGE);
    }
    // the glowing core, set into the hull's side
    const pulse = 0.6 + 0.4 * Math.sin(this.t / 10);
    ctx.fillStyle = `rgba(255,120,200,${pulse})`;
    ctx.fillRect(x - 12, y - 44, 24, 14);
    ctx.fillStyle = '#ffe0f0';
    ctx.fillRect(x - 5, y - 40, 10, 6);
    // the drone bay underneath
    R(-50, -12, 100, 8, DARK);
    ctx.fillStyle = blink ? 'rgb(255,120,200)' : 'rgb(190,70,150)';
    ctx.fillRect(x - 40, y - 6, 80, 3);
    // engines at the stern, flickering
    R(132, -48, 14, 12, DARK); R(132, -30, 14, 12, DARK);
    ctx.fillStyle = `rgba(255,180,90,${0.5 + Math.random() * 0.4})`;
    ctx.fillRect(x + 146, y - 45, 5 + Math.random() * 6, 6);
    ctx.fillRect(x + 146, y - 27, 5 + Math.random() * 6, 6);
    ctx.fillStyle = blink ? '#ff5a46' : '#7a2a22';
    ctx.fillRect(x - 146, y - 60, 4, 3);
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
    const top = { turret: 40, android: 70, dtank: 40, aatank: 46, carrier: 40, fpv: 26 }[this.kind] || 34;
    const arm = this.maxArmour > 0 || this.shield > 0;
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(Math.round(sx - 26), Math.round(sy - top - 8 - (arm ? 6 : 0)), 52, 8 + (arm ? 6 : 0));
    if (arm) { // armour (or a drone's shielding, in blue) over health
      ctx.fillStyle = this.shield > 0 ? '#9ae0ff' : '#c3b0ff';
      ctx.fillRect(Math.round(sx - 24), Math.round(sy - top - 12), Math.round(48 * clamp(this.shield > 0 ? this.shield / this.maxShield : this.armour / this.maxArmour, 0, 1)), 4);
    }
    ctx.fillStyle = HUD.hot;
    ctx.fillRect(Math.round(sx - 24), Math.round(sy - top - 6), Math.round(48 * clamp(this.hp / this.maxHp, 0, 1)), 4);
    if (this.kind === 'android') {
      ctx.font = `11px ${HUD_FONT}`;
      ctx.textAlign = 'center';
      plateText(ctx, 'HATSUYUKI ANDROID', Math.round(sx), Math.round(sy - top - 18), '#ff78c8');
    }
  }
}

// projectile definitions for mob attacks (scaled by stage)
function mobWeapon(kind, st) {
  const base = { kind: 'shell', salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: 1, maxCharge: 60 };
  if (kind === 'bomb') return { ...base, id: 'mobbomb', name: 'Drone bomb', dmg: 35 + 12 * st, dmgR: 70, explR: 8 };
  if (kind === 'bullet') return { ...base, id: 'mobgun', name: 'Drone gun', dmg: 14 + 5 * st, dmgR: 30, explR: 2 };
  if (kind === 'battery') return { ...base, id: 'mobshell', name: 'Battery shell', dmg: 20 + 8 * st, dmgR: 80, explR: 10 };
  if (kind === 'fpv') return { ...base, id: 'mobfpv', name: 'FPV charge', dmg: 50 + 12 * st, dmgR: 70, explR: 9 };
  if (kind === 'tankshell') return { ...base, id: 'mobtank', name: 'Drone tank shell', dmg: 24 + 8 * st, dmgR: 70, explR: 9 };
  if (kind === 'android') return { ...base, id: 'mobandroid', name: 'Android salvo', dmg: 30 + 7 * st, dmgR: 75, explR: 10 };
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
    if (terrain.giants && terrain.giants.length && terrain.giantAt(x, y)) return false;
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
  // q: its quality (the stage its health, armour and damage scale with); reinforcements come in better
  addMob(kind, x, q = this.stage()) {
    const st = clamp(Math.round(q), 1, 12); // (a long round keeps getting worse, up to a point)
    const y = Mob.GROUND.has(kind) ? this.terrain.hAt(clamp(x, 0, WORLD_W - 1)) : kind === 'mothership' ? Mob.shipY(this.terrain) : Mob.hoverY(this.terrain, x) - (kind === 'fpv' ? FPV_HIGH : 0);
    const m = new Mob(kind, x, y, st);
    if (kind === 'fpv') m.entering = true; // (see planMobs: in first, then the attack)
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

  // a hostile takes a hit: tally how much of it each player has taken off (shield, armour and
  // health alike), and when it goes down its bounty is shared out by those tallies
  damageMob(m, amt, owner, def, hit) {
    if (!m.alive) return;
    const left = () => Math.max(0, m.hp) + m.armour + (m.shield || 0), before = left();
    this.damageMobRaw(m, amt, owner, def, hit);
    const took = before - left();
    if (owner && !owner.isMob && took > 0) (m.dmgBy || (m.dmgBy = new Map())).set(owner, (m.dmgBy.get(owner) || 0) + took);
    if (!m.alive) this.payMobBounty(m, owner);
  },

  // its bounty, to each player in proportion to how much of it she took off (do 30% of the work,
  // get 30% of the bounty; what the hazards and its own kind did pays nobody)
  payMobBounty(m, killer) {
    const pool = m.maxHp + m.maxArmour + (m.maxShield || 0) || 1;
    const shares = [];
    for (const [t, d] of m.dmgBy || []) {
      const cut = Math.round(m.bounty * Math.min(1, d / pool));
      if (cut <= 0) continue;
      t.money += cut + this.cpuCredit(t, cut);
      t.mobCash = (t.mobCash || 0) + cut;
      shares.push(`${t.name} ¢${cut}`);
      if (t.isCpu && t === killer && Math.random() < 0.6) this.banter(t, 'hit_big');
    }
    const c = m.center();
    if (shares.length) {
      this.particles.text(c.x, c.y - 40, shares.length > 1 ? `¢${m.bounty} shared` : `+${shares[0].replace(/^.* ¢/, '¢')}`, '#ffd84a', true);
      this.events.push(`The ${m.name} is down${killer && !killer.isMob ? ` (${killer.name})` : ''}: its ¢${m.bounty} bounty goes ${shares.join(', ')}.`);
      this.ui.notice(`The ${m.name} is down! ${shares.join(' · ')}`);
    } else this.events.push(`The ${m.name} was destroyed.`);
  },

  damageMobRaw(m, amt, owner, def, hit) {
    const flakish = def && (def.kind === 'flak' || def.airburst), guns = def && (def.fighter || (def.ord && def.kind === 'gun'));
    if (m.shield > 0) { // its shielding takes the hit first, and flak and fighters' guns barely dent it
      const resist = flakish || guns ? SHIELD_RESIST : 1;
      const soak = Math.min(m.shield, amt * resist);
      m.shield -= soak;
      amt -= soak / resist;
      m.flash = 1;
      this.hitPopup(m.x, m.y - m.hh - 20, soak, { q: clamp(soak / (m.maxShield || 1), 0, 1), alt: 0, kin: 0, front: 1, shieldHit: true }, m);
      if (amt <= 0.5) return;
    }
    if (flakish) { amt *= FLAK_MOB_MULT; if (hit) hit.flak = true; }
    if (m.armour > 0) m.armour = Math.max(0, m.armour - amt); // armour soaks the whole hit (A3)
    else m.hp -= amt;
    m.flash = 1;
    if (m.kind === 'android') { m.pose = 'hit'; m.poseAt = m.t; }
    if (hit) this.hitPopup(m.x, m.y - m.hh - 20, amt, hit, m);
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
      m.victim = m.kind === 'turret' || m.kind === 'mothership' ? rng.pick(victims) : near[0];
      if (m.kind === 'fpv') {
        m.path = [];
        if (m.entering) { // its first cycle: in from the edge (toward the middle), high up; no attack yet
          const ex = clamp(m.x + clamp(WORLD_W / 2 - m.x, -FPV_ENTER, FPV_ENTER), 60, WORLD_W - 60);
          m.dest = { x: ex, y: Mob.hoverY(this.terrain, ex) - FPV_HIGH };
          continue;
        }
        // over its vehicle, then straight down onto it, as far as it gets this cycle
        const c = m.victim.center(), top = { x: c.x, y: Math.min(c.y - FPV_HIGH * 0.8, m.y) };
        const over = Math.abs(m.x - c.x) < 90 && m.y < c.y - 150; // already above it: just dive
        const legs = over ? [c] : [top, c];
        let left = FPV_MOVE, at = { x: m.x, y: m.y };
        for (const L of legs) {
          const d = dist(at.x, at.y, L.x, L.y);
          if (left <= 0) break;
          const k = Math.min(1, left / (d || 1));
          m.path.push({ x: at.x + (L.x - at.x) * k, y: at.y + (L.y - at.y) * k });
          left -= d; at = L;
        }
        m.dest = m.path.shift();
      } else if (m.mover) { // a firing spot 380-650 from its vehicle, on the near side
        const want = m.victim.x + Math.sign(m.x - m.victim.x || 1) * (m.kind === 'android' ? 420 : 520);
        const reach = TANK_MOVE * (m.kind === 'android' ? 1.5 : 1);
        m.dest = { x: clamp(m.x + clamp(want - m.x, -reach, reach), 40, WORLD_W - 40) };
        if (this.terrain.voidAt && this.terrain.voidAt(m.dest.x)) m.dest.x = m.x; // never into the void
      } else if (m.kind === 'carrier' && m.cargo) { // to a drop zone near the vehicle (but not on it)
        const side = Math.sign(m.x - m.victim.x || 1);
        m.dest = { x: clamp(m.x + clamp(m.victim.x + side * 450 - m.x, -MOB_MOVE * 1.5, MOB_MOVE * 1.5), 60, WORLD_W - 60) };
      } else if (m.kind === 'drone' || m.kind === 'gunner' || m.kind === 'carrier') {
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
    let shots = 0;
    const live = this.mobs.filter((m) => m.alive);
    for (const m of live) {
      const st = m.stage; // each hostile hits as hard as the wave it came in with
      if (m.kind === 'carrier' && m.cargo) { // let the drone tank down on its parachute
        const u = this.addMob(m.cargo, m.x, m.stage);
        u.y = m.y + 20; u.drop = true; u.facing = m.facing;
        m.cargo = null;
        this.events.push(`A carrier drops a ${u.name.toLowerCase()}.`);
        this.ui.notice(`Airdrop: a ${u.name.toLowerCase()} is coming down.`);
        continue;
      }
      const v = m.victim;
      if (!v || !v.alive) continue;
      const vc = v.center();
      if (m.kind === 'fpv') {
        if (m.entering) { m.entering = false; continue; } // (it has only just come in)
        const c = m.center();
        if (dist(c.x, c.y, vc.x, vc.y) > 46) continue; // not there yet: next cycle
        m.alive = false; // it is the warhead
        this.explode(c.x, c.y, mobWeapon('fpv', st), m, 'shell');
        this.events.push(`An FPV kamikaze hits ${v.name}.`);
        shots++;
      } else if (m.mover) { // a firing solution like a turret's, from wherever it drove to
        const n = m.kind === 'android' ? 3 : 1;
        const s = mobSolve(this, m, v, m.kind === 'android' ? 0.03 : 0.05);
        m.aim = { x: Math.sign(s.vx) * 0.7, y: -0.7 };
        m.facing = Math.sign(s.vx) || m.facing;
        for (let i = 0; i < n; i++) {
          const p = new Projectile(this, mobWeapon(m.kind === 'android' ? 'android' : 'tankshell', st), m, s.x, s.y, s.vx * (1 + (i ? rng.range(-0.04, 0.04) : 0)), s.vy * (1 + (i ? rng.range(-0.04, 0.04) : 0)), false);
          p.delay = i * 9;
          this.projectiles.push(p);
          shots++;
        }
        this.particles.muzzle(s.x, s.y, { x: Math.sign(s.vx), y: -0.7 });
        if (m.kind === 'android') { m.pose = 'fire'; m.poseAt = m.t; }
      } else if (m.kind === 'drone' || (m.kind === 'carrier' && !m.cargo)) {
        if (Math.abs(m.x - v.x) < BOMB_REACH) { // tossed forward so it falls on the vehicle
          const fall = Math.max(40, vc.y - m.y);
          const tFall = Math.sqrt((2 * fall) / GRAV);
          const vx = clamp((v.x - m.x) / tFall, -9, 9);
          this.projectiles.push(new Projectile(this, mobWeapon('bomb', st), m, m.x, m.y + 2, vx, 1, false));
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

  // reinforcements: once a round has gone `reinforceAt` cycles, a wave joins every cycle, bigger and
  // better as it drags on. Quality q = the stage plus 0.6 a cycle: gunners from q 3, FPV kamikazes
  // from 3.5, carriers with drone tanks (and tanks driving in from the edge) from 4.5, and from 8 the
  // drone tanks' final form, the android (one at a time).
  reinforce(cycles) {
    if (!this.reinforceAt || cycles < this.reinforceAt) return;
    const over = cycles - this.reinforceAt;
    const q = this.stage() + 0.6 * over;
    const flyers = this.mobs.filter((m) => m.alive && m.flying && m.kind !== 'mothership').length;
    const ground = this.mobs.filter((m) => m.alive && m.mover).length + this.mobs.filter((m) => m.alive && m.cargo).length;
    const n = Math.min(MOB_CAP - flyers, 1 + Math.floor(over / 1.5));
    const names = [];
    const edge = () => (rng.chance(0.5) ? 60 : WORLD_W - 60) + rng.range(-30, 30);
    let groundRoom = GROUND_CAP - ground;
    for (let i = 0; i < n; i++) {
      const r = rng.next();
      let kind = 'drone';
      if (q >= 4.5 && groundRoom > 0 && r < 0.3) kind = 'carrier';
      else if (q >= 3.5 && r < 0.55) kind = 'fpv';
      else if (q >= 3 && r < 0.8) kind = 'gunner';
      const m = this.addMob(kind, edge(), q);
      if (kind === 'carrier') { m.cargo = q >= 8 && !this.mobs.some((x) => x.alive && (x.kind === 'android' || x.cargo === 'android')) ? 'android' : 'dtank'; groundRoom--; }
      names.push(kind === 'carrier' ? `a carrier with a ${m.cargo === 'android' ? 'android' : 'drone tank'}` : kind === 'fpv' ? 'an FPV kamikaze' : `a ${kind}`);
    }
    // and from 4.5 a drone tank sometimes drives on from the edge of the map
    if (q >= 4.5 && groundRoom > 0 && rng.chance(0.4)) {
      const left = rng.chance(0.5);
      // (an AA tank instead, half the time, once anyone has planes: it hunts squads, not girls)
      const air = q >= 5.5 && this.tanks.some((t) => t.alive && t.weapons.some((id) => WEAPON_BY_ID[id].air)) && !this.mobs.some((x) => x.alive && x.kind === 'aatank');
      const kind = q >= 8 && !this.mobs.some((x) => x.alive && (x.kind === 'android' || x.cargo === 'android')) ? 'android' : air && rng.chance(0.35) ? 'aatank' : 'dtank';
      const m = this.addMob(kind, left ? -30 : WORLD_W + 30, q);
      m.facing = left ? 1 : -1;
      names.push(`a ${{ android: 'android', aatank: 'AA tank', dtank: 'drone tank' }[m.kind]} from the ${left ? 'west' : 'east'}`);
    }
    if (names.length) {
      this.ui.notice(`Incoming: ${names.join(', ')}.`);
      this.events.push(`Hostile reinforcements: ${names.join(', ')}.`);
    }
  },
});
Mob.GROUND = new Set(['turret', 'dtank', 'aatank', 'android']);
