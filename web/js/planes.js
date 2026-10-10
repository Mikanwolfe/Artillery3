'use strict';
// Planes (Sengoku Inc.; the weapons are in weapons.js, kind 'air'). The gun is a laser designator.
// A plane weapon has a fixed set of squads (air.squads), its autoloader rounds (Tank.wing): each
// dot of a turn takes the next one. A squad on her deck takes off (along a flight deck, or
// straight up on its lift fan: VTOL, rearming a turn or two longer) and flies over the dot's strike zone; a squad
// already out (hovering over an earlier zone) is redirected to it. Either way it attacks there and
// then, and the turn waits for it (AirStrike). So one squad is one zone a turn, and a squad shot
// down is one zone fewer until it has rearmed. Anything in the zone (airZone) is found and hit
// fairly accurately, a target outside it is safe. A plane carries a loadout of passes
// (AIR_PASSES: bombers several, torpedo jets two, fighters many), one a dot; between them it
// loops back up and hovers over its zone, where anyone can shoot it. Loadout spent, it flies home
// and the squad rearms for air.reload of her turns. A squad whose owner is destroyed flies off.
// Shooting planes down pays nothing.
// Flight: planes are steered, not moved along curves. Each has a speed (thrust and brakes, a dive
// gains speed and a climb loses it) and turns no faster than its pull allows at that speed, so a
// fast plane turns wide: a dive bomber climbs away first, rolls over into its dive, pulls out
// past the mark and loops back up to its hover. Slow, on its lift fan, it can pivot and hover.
// Jets throughout, bar the starter's propeller dive bomber.

const PLANE_S = 1.35; // drawing scale (the boxes below are in unscaled units)
const PLANE_HW = 22; // hitbox half-width
const PLANE_HH = 16;
const PLANE_STAGGER = 14; // frames between take-offs
const PLANE_HOVER = 420; // how high a squad waits over the ground near its mark (above the short-range AA)
const PLANE_GAP = 44; // between planes in a squad's line
const AIR_ANGLE = { dive: 80, heavy: 75, fortress: 86, fighter: 50, rocket: 40, torpedo: 25 }; // where it waits and attacks from: degrees over the horizon
const TORPEDO_SPEED = 7;
const TORPEDO_RUN = 760; // how far a torpedo runs before it goes off anyway
const DIVE_KIN = 6; // a dive-released bomb's kinetic multiplier (it leaves the plane at the dive's speed)
// a plane's loadout: how many dots it attacks on before it flies home to rearm
const FIGHTER_REACH = 0.7; // how far beyond the zone a fighter goes after aircraft (of the zone + 300)
const AIR_PASSES = { dive: 3, torpedo: 2, fighter: 6, rocket: 2, heavy: 1, fortress: 2 };
const BOMB_GUIDE = { arm: 2, burn: 120, seek: 4, apex: false, turn: 1.6, range: 90, cone: 120, lift: 0, brake: false }; // a dive bomb's fins: a nudge, not a seeker
// the strike zone a dot marks: a squad attacks what is in it, and nothing outside
function airZone(w) { return w.fleet ? 200 : w.air.type === 'fortress' ? 160 : clamp(w.dmgR + 30, 70, 150); } // (a fortress walks its stick across a wide one)

// flight, by type: cruise and top speed (px/frame), its speed in an attack dive (dive brakes out),
// thrust and brakes (px/frame²), and pull (how hard it can turn, px/frame² sideways: its turn
// radius is speed² / pull)
const FLIGHT = {
  dive: { cruise: 10, top: 16, dive: 12, thrust: 0.3, brake: 0.5, pull: 1.5 },
  torpedo: { cruise: 10, top: 14, dive: 11, thrust: 0.28, brake: 0.45, pull: 1.0 },
  fighter: { cruise: 12, top: 17, dive: 14, thrust: 0.38, brake: 0.5, pull: 1.6 },
  rocket: { cruise: 11, top: 15, dive: 12, thrust: 0.3, brake: 0.45, pull: 1.2 },
  heavy: { cruise: 9, top: 14, dive: 11, thrust: 0.22, brake: 0.45, pull: 1.0 },
  fortress: { cruise: 7, top: 10, dive: 8, thrust: 0.16, brake: 0.3, pull: 0.55 },
};
const AIR_GRAV = 0.1; // along the flight path: a dive gains speed, a climb loses it
// the drawn plane trails the flight model on a damped spring (it matches the model's velocity and
// is pulled onto its position), so turns read as a heavy airframe swinging round, not a pivot
const AIR_SPRING = 0.03, AIR_DAMP = 0.24;
const AIR_PIVOT = 0.13; // rad/frame: the fastest any plane turns (slow, on its lift fan)
const AIR_CLEAR = 70; // how far it keeps off the ground ahead (unless it is meant to be low)

// how a type looks: body colours, length, the NXi stripe
const PLANE_LOOK = {
  prop: { body: [62, 88, 58], belly: [176, 176, 160], len: 30 },
  dive: { body: [92, 104, 120], belly: [178, 184, 194], len: 32 },
  torpedo: { body: [84, 98, 90], belly: [176, 182, 176], len: 36 },
  fighter: { body: [150, 156, 166], belly: [204, 208, 214], len: 30 },
  rocket: { body: [104, 112, 96], belly: [186, 190, 178], len: 32 },
  heavy: { body: [42, 52, 84], belly: [92, 104, 138], len: 46, stripe: [90, 216, 200] },
  fortress: { body: [118, 112, 92], belly: [168, 160, 136], len: 56 },
};

class Plane {
  constructor(game, group, i, kind, delay) {
    this.isPlane = true;
    this.game = game;
    this.group = group;
    this.owner = group.owner;
    this.w = group.w;
    this.kind = kind; // dive | torpedo | fighter | rocket | heavy | fortress
    this.prop = group.w.id === 'zui0'; // the starter is the one propeller plane
    this.hp = this.maxHp = group.hp;
    this.armour = this.maxArmour = group.armour || 0; // (a fortress: it shrugs off a whole hit, like a girl's armour)
    this.hw = PLANE_HW; this.hh = PLANE_HH;
    this.alive = true;
    this.i = i;
    this.delay = delay;
    this.state = 'wait';
    this.t = 0;
    this.vx = 0; this.vy = 0;
    this.sp = 0; // speed along its heading
    this.hd = 0; // heading (radians, y down)
    this.ang = 0; // drawn rotation
    this.lvl = 0;
    this.passes = AIR_PASSES[kind] || 1; // attacks left before it goes home
    this.flash = 0;
    this.dir = group.dir;
    this.face = this.dir || 1; // which way it is drawn upright (it only rolls over once level)
    this.nav = null;
    this.x = group.from.x; this.y = group.from.y;
    this.snap = true; // (the sprite jumps to it: see follow)
  }

  get name() { return `${this.owner.name}'s ${shortName(this.w)}`; }
  get fl() { return FLIGHT[this.kind] || FLIGHT.dive; }
  // shootable while it is in the sky over the map (not before take-off, nor while out of sight)
  get targetable() { return this.alive && this.state !== 'wait' && this.state !== 'out'; }
  center() { return { x: this.sx ?? this.x, y: (this.sy ?? this.y) - this.hh / 2 }; } // (where it is drawn: what you see is what you hit)

  // fly to a point (or wherever to() says each frame): o.v the speed to hold, o.arrive to slow to a
  // stop on it, o.r how close counts (going past it counts too), o.clear how far to keep off the
  // ground ahead (0: not at all, for a dive). then() on arrival.
  go(to, o, then) {
    this.nav = { to: typeof to === 'function' ? to : () => to, v: o.v, arrive: !!o.arrive, r: o.r === undefined ? 40 : o.r, clear: o.clear === undefined ? AIR_CLEAR : o.clear, then };
    if (this.sp < 1.5) { // from a hover: it pivots on its lift fan to face the way
      const T = this.nav.to();
      this.hd = Math.atan2(T.y - this.y, T.x - this.x);
      if (Math.abs(Math.cos(this.hd)) > 0.3) this.face = Math.sign(Math.cos(this.hd));
    }
  }

  steer() {
    const N = this.nav, F = this.fl, g = this.game, T = N.to();
    const dx = T.x - this.x, dy = T.y - this.y, d = Math.hypot(dx, dy);
    let want = Math.min(N.v || F.cruise, F.top);
    if (N.arrive) want = Math.min(want, Math.sqrt(2 * F.brake * 0.6 * Math.max(0, d - 6)) + 0.5);
    this.sp = clamp(this.sp + clamp(want - this.sp, -F.brake, F.thrust) + AIR_GRAV * Math.sin(this.hd), 0.4, F.top * 1.2);
    let aim = Math.atan2(dy, dx);
    if (N.clear > 0) { // pull up if the ground ahead is too close
      const look = Math.min(16, 4 + this.sp) * this.sp * 0.8;
      const lx = this.x + Math.cos(this.hd) * look, ly = this.y + Math.sin(this.hd) * look;
      const gy = Math.min(g.terrain.hAt(clamp(lx, 0, WORLD_W - 1)), g.terrain.hAt(clamp(this.x, 0, WORLD_W - 1)));
      if (ly > gy - N.clear || this.y > gy - N.clear * 0.6) aim = Math.cos(this.hd) >= 0 ? -0.7 : Math.PI + 0.7;
    }
    const rate = Math.min(AIR_PIVOT, F.pull / Math.max(this.sp, 1));
    this.hd = wrapA(this.hd + clamp(wrapA(aim - this.hd), -rate, rate));
    this.vx = Math.cos(this.hd) * this.sp; this.vy = Math.sin(this.hd) * this.sp;
    this.x += this.vx; this.y += this.vy;
    // there, or going past it (anywhere inside its turning circle: it would only orbit the point)
    const pass = N.arrive ? N.r * 2.5 : Math.max(N.r * 2.5, (this.sp * this.sp) / F.pull * 1.3);
    if (N.r > 0 && (d < N.r || (d < pass && dx * this.vx + dy * this.vy < 0))) {
      this.nav = null;
      if (N.then) N.then();
    }
  }

  update() {
    const g = this.game, G = this.group;
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
    if (!this.alive) return;
    switch (this.state) {
      case 'wait':
        if (--this.delay <= 0) this.takeOff();
        break;
      case 'launch':
        if (!G.deck && !this.nav) { // VTOL: straight up on the lift fan, then away
          this.vx = 0; this.vy = -Math.min(3, 0.5 + this.t * 0.1);
          this.y += this.vy;
          if (this.t % 3 === 0) g.particles.add({ x: this.x + (Math.random() - 0.5) * 8, y: this.y + 8, vx: (Math.random() - 0.5) * 2, vy: 1.5, g: 0, drag: 0.9, life: 0.4, size: 4 + Math.random() * 4, color: [210, 210, 214] });
          if (this.t > 30) {
            this.sp = 2; this.hd = -Math.PI / 2;
            this.state = 'inbound'; this.toSlot(); // (straight over to its zone)
          }
        }
        break;
      case 'out': // out of sight: it comes back in from high up behind its approach line
        if (this.t > 20) this.comeIn();
        break;
      case 'hover': {
        const s = G.slot(this.i);
        if (dist(s.x, s.y, this.x, this.y) > 80) { this.state = 'inbound'; this.toSlot(); break; } // its zone moved: fly there
        this.x += (s.x - this.x) * 0.1;
        this.y += (s.y + Math.sin(this.t / 22 + this.i * 1.7) * 4 - this.y) * 0.1;
        this.vx = this.vy = 0; this.sp = 0;
        this.dir = Math.sign(G.mark.x - this.x) || G.side;
        break;
      }
      case 'attack':
        if (this.attack) this.attack(this);
        break;
    }
    if (this.nav) this.steer();
    if (this.state === 'leave' && !this.nav) this.alive = false; // home (not shot down)
    if (this.state === 'wait' || this.state === 'out') this.snap = true;
    this.follow();
    this.orient();
  }

  // drawn along its heading; it stays upright-side the same way through a loop, and rolls over
  // only once it has been flying level the other way for a moment
  follow() {
    if (this.snap || this.sx === undefined) { this.sx = this.x; this.sy = this.y; this.svx = this.vx; this.svy = this.vy; this.snap = false; return; }
    this.svx += (this.x - this.sx) * AIR_SPRING + (this.vx - this.svx) * AIR_DAMP;
    this.svy += (this.y - this.sy) * AIR_SPRING + (this.vy - this.svy) * AIR_DAMP;
    this.sx += this.svx; this.sy += this.svy;
  }

  orient() {
    const sv = Math.hypot(this.svx, this.svy), flying = this.nav && this.sp > 1.2 && sv > 1;
    const hd = flying ? Math.atan2(this.svy, this.svx) : this.hd; // (the way the sprite is actually going)
    if (flying) {
      const c = Math.cos(hd);
      if (Math.abs(c) > 0.8 && Math.sign(c) !== this.face) { if (++this.lvl > 12) { this.face = Math.sign(c); this.lvl = 0; } } else this.lvl = 0;
    } else if (this.state === 'hover') this.face = this.dir || this.face;
    const want = flying ? wrapA(this.face > 0 ? hd : hd - Math.PI) : 0;
    this.ang = wrapA(this.ang + wrapA(want - this.ang) * 0.2);
  }

  takeOff() {
    const G = this.group, F = this.from || G.from;
    this.state = 'launch'; this.t = 0; this.x = F.x; this.y = F.y; this.snap = true; this.dir = this.launchDir || this.dir; this.face = this.dir;
    if (this.i % 3 === 0) this.game.sfx.click();
    if (!G.deck) return; // (VTOL: see update)
    const d = this.dir;
    this.sp = 1.5; this.hd = d > 0 ? 0 : Math.PI;
    this.go({ x: F.x + d * 260, y: F.y - 40 }, { v: this.fl.cruise, r: 50, clear: 0 }, () => {
      if (!this.w.fleet) { this.state = 'inbound'; this.toSlot(); return; } // off her deck and over to its zone
      this.go({ x: F.x + d * 800, y: Math.max(G.ceil - 160, F.y - 1000) }, { v: this.fl.cruise, r: 120 }, () => this.goOut()); // (a fleet's: up and away, out of sight)
    });
  }

  goOut() { this.state = 'out'; this.t = 0; this.nav = null; }

  comeIn() {
    const s = this.group.slot(this.i), ax = this.group.side;
    this.state = 'inbound'; this.t = 0;
    this.x = s.x - ax * 760; this.y = s.y - 620; this.snap = true;
    this.hd = Math.atan2(s.y - this.y, s.x - this.x); this.sp = this.fl.cruise; this.face = ax;
    this.toSlot();
  }

  // to its place over its zone (wherever that is by now), and hover there
  toSlot() {
    const G = this.group;
    this.go(() => G.slot(this.i), { arrive: true, r: 22 }, () => { this.state = 'hover'; this.t = 0; this.sp = 0; });
  }

  // its ordnance is away: the pass is done (the strike can move on) while it flies its way out
  passDone() {
    if (this.strikeDone) return;
    this.passes--;
    this.strikeDone = true;
    this.attack = null;
    this.state = 'inbound';
  }

  // the way out of a pass flown: round to its zone again, or (loadout spent) home
  rejoin() {
    this.passDone();
    if (this.passes > 0) this.toSlot();
    else this.goHome();
  }

  // to her to rearm (it lands and is gone); with her gone, away off the map
  goHome() {
    const o = this.owner;
    if (!o.alive || this.w.fleet) { this.leave(); return; } // (a fleet's planes go back out to sea)
    this.state = 'leave'; this.attack = null;
    this.go(() => ({ x: o.x, y: o.y - TANK_H }), { arrive: true, r: 30 });
  }

  leave() {
    const d = this.w.fleet && this.launchDir ? -this.launchDir : this.face || 1; // (a fleet's: back out to sea)
    this.state = 'leave'; this.attack = null;
    this.go({ x: this.x + d * 1400, y: this.group.ceil - 400 }, { v: this.fl.top, r: 150 });
  }

  draw(ctx) {
    if (!this.alive || this.state === 'wait' || this.state === 'out') return;
    const L = PLANE_LOOK[this.prop ? 'prop' : this.kind] || PLANE_LOOK.dive, f = this.face || 1, S = PLANE_S;
    const len = L.len, half = len / 2;
    ctx.save();
    ctx.translate(Math.round(this.sx), Math.round(this.sy - 8));
    ctx.rotate(this.ang);
    const box = (lx, ty, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(f > 0 ? lx * S : -(lx + w) * S), Math.round(ty * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S))); };
    const c = (v, k = 1) => rgb(v.map((u) => clamp(u * k, 0, 255)));
    const hot = this.flash > 0.3, spin = (this.t >> 1) % 2;
    if (this.prop) { // the starter: a propeller dive bomber with fixed gear
      box(-half, -9, 4, 9, c(L.body, 0.85));
      box(-half - 2, -2, 10, 2, c(L.body, 0.8));
      box(-half, -3, len, 4, hot ? '#ffffff' : c(L.body));
      box(-half + 2, 1, len - 4, 3, hot ? '#ffffff' : c(L.belly));
      box(half - 4, -3, 4, 6, c(L.body, 0.6));
      box(2, -6, 8, 3, 'rgb(168,214,236)');
      box(-6, 0, 18, 2, c(L.body, 0.7));
      box(4, 4, 2, 3, 'rgb(40,40,44)'); // fixed gear
      box(half, -6 + (spin ? 0 : 2), 1, spin ? 12 : 8, 'rgba(60,60,64,0.7)'); // the propeller disc
    } else if (this.kind === 'fortress') { // a big straight-winged bomber: four engines, a glazed nose, a tail turret
      box(-half + 2, -14, 6, 4, c(L.body, 0.85)); // the tall fin
      box(-half + 1, -10, 8, 5, c(L.body, 0.85));
      box(-half - 4, 0, 14, 2, c(L.body, 0.75)); // stabiliser
      box(-half, -4, len - 4, 7, hot ? '#ffffff' : c(L.body)); // fuselage
      box(-half + 3, 3, len - 10, 2, hot ? '#ffffff' : c(L.belly));
      box(half - 4, -3, 5, 5, 'rgb(168,214,236)'); // glazed nose
      box(half - 14, -7, 7, 3, 'rgb(168,214,236)'); // cockpit
      box(-half - 3, -3, 3, 4, 'rgb(168,214,236)'); // tail turret
      box(-10, 0, 26, 2, c(L.body, 0.7)); // the wing, straight
      for (const ex of [-6, 2, 10, 16]) { box(ex, 2, 4, 3, c(L.body, 0.6)); box(ex + 4, 2 + (spin ? 0 : 1), 1, spin ? 4 : 2, 'rgba(60,60,64,0.7)'); } // nacelles and props
      box(-2, -6, 4, 2, 'rgb(60,62,70)'); // dorsal turret
    } else { // a jet: pointed nose, canopy, swept wing, twin fins, intake and tailpipe
      box(-half + 2, -10, 4, 2, c(L.body, 0.8)); // the fins, raked back
      box(-half + 1, -8, 5, 3, c(L.body, 0.85));
      box(-half, -5, 6, 3, c(L.body, 0.85));
      box(-half - 3, 0, 10, 2, c(L.body, 0.75)); // stabiliser
      box(-half, -3, len - 4, 5, hot ? '#ffffff' : c(L.body)); // fuselage
      box(-half + 3, 2, len - 10, 2, hot ? '#ffffff' : c(L.belly));
      box(half - 4, -2, 4, 3, c(L.body, 1.05)); // the nose, tapering
      box(half, -1, 4, 2, c(L.body, 1.1));
      box(half + 4, 0, 2, 1, c(L.body, 1.2));
      box(half - 13, -6, 9, 3, 'rgb(168,214,236)'); // canopy
      box(half - 12, -6, 3, 1, 'rgb(230,246,255)');
      box(half - 17, 1, 5, 2, 'rgb(40,42,48)'); // intake
      box(-4, 0, 14, 2, c(L.body, 0.7)); // the wing, swept back in steps
      box(-8, 2, 12, 1, c(L.body, 0.65));
      box(-11, 3, 7, 1, c(L.body, 0.6));
      box(-half - 3, -2, 3, 3, 'rgb(255,170,90)'); // tailpipe
      if (this.t % 4 < 2) box(-half - 7, -1, 4, 1, 'rgba(255,220,160,0.8)');
    }
    box(-half + 1, -7, 3, 3, this.owner.color); // her colour on the fin and the wing root
    box(0, 0, 4, 2, this.owner.color);
    if (L.stripe) box(-half + 4, -1, len - 12, 1, rgb(L.stripe)); // NXi aurora stripe
    // the lift fan in the middle of the fuselage (a fortress has two): a ring under the wing, blades flickering
    for (const fx of this.kind === 'fortress' ? [-14, 8] : [-5]) {
      box(fx, 3, 10, 2, 'rgb(40,42,48)');
      for (let k = 0; k < 4; k++) if ((k + spin) % 2) box(fx + 1 + k * 2, 3, 1, 2, 'rgb(150,152,160)');
      if (this.state === 'hover' || (this.state === 'launch' && !this.group.deck)) box(fx, 5, 10, 3 + spin * 2, `rgba(200,230,255,${0.25 + 0.15 * spin})`);
    }
    // what it carries until it lets go
    if (this.ord > 0 || this.state !== 'attack') {
      if (this.kind === 'torpedo') box(-10, 4, 18, 2, 'rgb(60,62,70)');
      else if (this.kind === 'rocket') { box(-6, 4, 5, 2, 'rgb(214,216,202)'); box(4, 4, 5, 2, 'rgb(214,216,202)'); }
      else if (this.kind === 'heavy') box(-6, 4, 14, 4, 'rgb(36,40,60)');
      else if (this.kind === 'fortress') box(-6, 3, 10, 2, 'rgb(46,46,52)');
      else if (this.kind !== 'fighter') box(-3, 4, 7, 3, 'rgb(46,46,52)');
    }
    ctx.restore();
    if (this.targetable) { // its health (and a fortress's armour) under every plane in the sky
      const x = Math.round(this.sx), y = Math.round(this.sy + 12), bw = this.kind === 'fortress' || this.kind === 'heavy' ? 40 : 28;
      ctx.fillStyle = 'rgba(14,12,22,0.75)'; ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, 6);
      ctx.fillStyle = this.owner.color; ctx.fillRect(x - bw / 2, y, Math.round(bw * clamp(this.hp / this.maxHp, 0, 1)), 4);
      if (this.armour > 0) { ctx.fillStyle = '#c8d2e4'; ctx.fillRect(x - bw / 2, y, Math.round(bw * clamp(this.armour / this.maxArmour, 0, 1)), 4); } // (armour over health: it goes first)
    }
  }
}

// A torpedo: drops off a low-flying plane and runs along the ground, through dips and over rises,
// until it touches something (a vehicle, a hostile on the ground, a wall too steep to climb) or
// runs out, and goes off.
class Torpedo {
  constructor(game, owner, def, x, dir) {
    this.game = game; this.owner = owner; this.def = def;
    this.x = x; this.dir = dir; this.run = 0;
    this.y = game.terrain.hAt(clamp(x, 0, WORLD_W - 1)) - 4;
    this.w = def; // (for AA: torpedoes are too low to engage, see aaInterceptable)
  }

  update() {
    const g = this.game;
    for (let s = 0; s < 2; s++) {
      const nx = this.x + this.dir * TORPEDO_SPEED / 2;
      if (nx < 0 || nx >= WORLD_W) return false;
      const gy = g.terrain.hAt(nx);
      if (gy < this.y - 10) return this.blow(); // into a wall
      this.x = nx; this.y = gy - 4; this.run += TORPEDO_SPEED / 2;
      for (const t of g.targets()) {
        if (!t.alive || t === this.owner || t.isSat || t.isPlane || (t.isMob && t.flying)) continue;
        if (Math.abs(t.x - this.x) < (t.hw || TANK_W / 2) && Math.abs(t.y - this.y) < 30) return this.blow();
      }
    }
    if (this.run > TORPEDO_RUN) return this.blow();
    if (Math.random() < 0.5) g.particles.add({ x: this.x - this.dir * 10, y: this.y - 2, vx: -this.dir * 0.5, vy: -0.4, g: 0, drag: 0.95, life: 0.6, size: 3 + Math.random() * 3, color: [230, 236, 240] });
    return true;
  }

  blow() {
    this.game.explode(this.x, this.y, { ...this.def, from: { x: -this.dir, y: 0 } }, this.owner, 'shell');
    return false;
  }

  draw(ctx) {
    ctx.fillStyle = 'rgb(56,58,66)';
    ctx.fillRect(Math.round(this.x - (this.dir > 0 ? 14 : 0)), Math.round(this.y - 3), 14, 3);
    ctx.fillStyle = 'rgb(200,60,50)';
    ctx.fillRect(Math.round(this.x + (this.dir > 0 ? -1 : 0)), Math.round(this.y - 3), 2, 3);
  }
}

// A sortie: the squad a dot sent flies to its zone and attacks it there and then, one plane after
// another PLANE_STAGGER apart as they reach their places over it. It holds the turn until each
// plane has let its ordnance go (the camera rides with the squad, then goes to the zone).
class AirStrike {
  constructor(game, groups) {
    this.game = game; this.groups = groups; this.t = 0; this.next = 0;
    this.queue = [];
    for (const G of groups) { G.striking = true; for (const p of G.planes) if (p.alive && p.state !== 'attack' && p.state !== 'leave') { p.strikeDone = false; this.queue.push(p); } }
    this.focus = { x: groups[0].mark.x, y: groups[0].mark.y - 160 };
    this.struck = false;
  }

  update() {
    const g = this.game;
    this.t++;
    for (const p of this.queue) if (p.alive && !p.strikeDone && !p.attack && p.state === 'hover' && this.t >= this.next) {
      startAttack(g, p);
      this.next = this.t + PLANE_STAGGER;
      this.struck = true;
      this.focus = { x: p.group.mark.x, y: p.group.mark.y - 160 };
    }
    if (!this.struck) { const c = squadCentre(this.groups[0]); if (c) this.focus = { x: (c.x + this.groups[0].mark.x) / 2, y: c.y + 60 }; } // (riding along on the way in)
    g.cam.follow(this.focus);
    const on = this.queue.some((p) => p.alive && !p.strikeDone) && this.t < 60 * 30;
    if (!on) for (const G of this.groups) G.striking = false;
    return on;
  }
  draw() {}
}

// where a squad is: the middle of its planes in the sky
function squadCentre(G) {
  const P = G.planes.filter((p) => p.alive && p.targetable);
  if (!P.length) return null;
  return { x: P.reduce((s, p) => s + p.x, 0) / P.length, y: P.reduce((s, p) => s + p.y, 0) / P.length };
}

// what a plane's ordnance does, as a projectile's weapon (dmg is per bomb, rocket or burst)
function planeOrd(G, extra = {}) {
  const w = G.w;
  return { id: w.id + '_ord', name: w.name, kind: 'shell', ord: true, jet: !!(w.air && w.air.jet), dmg: w.dmg * G.mult, dmgR: w.dmgR, explR: w.explR,
    salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: w.rarity, maxCharge: 10, drift: 0.25, ...extra };
}

// what a plane goes for in its zone: the nearest rival to the middle of it, else a hostile on the
// ground; nothing outside the zone
function zoneLock(g, p, m, Z) {
  // a dot up in the sky by MAIA (it hit her): MAIA it is
  const sat = g.satellite;
  if (sat && sat.alive && m.y < g.terrain.hAt(clamp(m.x, 0, WORLD_W - 1)) - 120 && Math.abs(sat.center().x - m.x) < Z + 60) return sat;
  let lock = null, best = Infinity;
  for (const e of g.targets()) {
    if (!e.alive || e === p.owner || e.isSat || e.isPlane || (e.isMob && e.flying)) continue;
    const d = Math.abs(e.x - m.x);
    if (d > Z) continue;
    const s = d + (e.isMob ? Z : 0); // (rivals first)
    if (s < best) { best = s; lock = e; }
  }
  return lock;
}

// MAIA, up in the sky, whatever the plane: a straight run in at her, its ordnance fired at her core
// from close in (bombs can't fall up), then down and away and back round to its hover
function satRun(g, p, sat) {
  const G = p.group, F = p.fl, R = 230;
  let shots = clamp(p.ord, 1, 4), k = 0;
  const near = () => { const c = sat.center(), dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1; return { x: c.x + (dx / d) * R, y: c.y + (dy / d) * R }; };
  p.go(near, { v: F.cruise, r: 40, clear: 40 }, () => {
    p.attack = () => {
      if (k++ % 6) return;
      if (!sat.alive) shots = 0;
      else {
        const c = sat.center(), tx = c.x - p.sx, ty = c.y - p.sy, d = Math.hypot(tx, ty) || 1;
        g.projectiles.push(new Projectile(g, { ...planeOrd(G), kind: 'rocket', dmgR: Math.max(G.w.dmgR, 80), visR: G.w.dmgR }, p.owner, p.sx, p.sy, (tx / d) * 14, (ty / d) * 14, p.i === 0));
        g.sfx.click();
        shots--;
      }
      if (shots <= 0) { p.passDone(); p.go({ x: p.x + Math.cos(p.hd) * 260, y: p.y + 180 }, { v: F.cruise, r: 90 }, () => p.rejoin()); }
    };
  });
}

// a plane's attack, by type: up and away first to pick up height, in along its approach line,
// ordnance off, then out and round (a loop, mostly) to its hover again (rejoin)
function startAttack(g, p) {
  const G = p.group, m = G.mark, side = G.side, w = G.w, F = p.fl, Z = airZone(w);
  p.state = 'attack';
  p.t = 0;
  p.attack = null;
  p.ord = w.fleet ? (p.kind === 'fighter' ? 6 : 1) : w.air.ord;
  const lock = (p.lock = zoneLock(g, p, m, Z));
  if (lock && lock.isSat) { satRun(g, p, lock); return; }
  // fairly sharp on something in the zone, looser on an empty one; the squad spreads a little
  const n = G.planes.length, off = p.i - (n - 1) / 2;
  const jit = (rng.next() - 0.5) * (lock ? 8 + w.disp * 6 : 24 + w.disp * 30) + off * (lock ? 5 : 14);
  const gx = clamp((lock ? lock.x : m.x) + jit, 4, WORLD_W - 4), gy = g.terrain.hAt(gx);
  const ground = (x) => g.terrain.hAt(clamp(x, 0, WORLD_W - 1));
  const a = rad(AIR_ANGLE[p.kind] || 60), ax = Math.cos(a) * side, ay = Math.sin(a);
  const at = (r) => ({ x: gx - ax * r, y: gy - ay * r }); // a point r back up its line from the mark
  // first it climbs on its fan and engine, slowing at the top, so it can tip over into its run
  const climb = (up) => ({ x: p.x + side * 20, y: Math.max(G.ceil + 40, p.y - up) });
  const up = { v: 5, r: 30 };
  const loopUp = () => ({ x: gx + side * 120, y: Math.max(G.ceil + 60, G.hoverY - 140) }); // over the top of its loop
  if (p.kind === 'dive' || p.kind === 'heavy') {
    // over into a steep dive down the line; bombs off at the bottom at the dive's speed (kinetic),
    // then it pulls out past the mark and loops back up
    const heavy = p.kind === 'heavy';
    let drop = -1;
    const top = at(heavy ? 760 : 720), rel = heavy ? 300 : 260;
    let diving = false;
    p.go({ x: top.x, y: Math.max(G.ceil + 40, top.y) }, up, () => { diving = true; p.go({ x: gx, y: gy }, { v: F.dive, r: 0, clear: 0 }); });
    p.attack = () => {
      if (diving && drop < 0 && gy - p.y < rel) { // low enough: let go, and pull out past the mark
        drop = 0;
        const px = clamp(gx + side * 300, 10, WORLD_W - 10);
        p.go({ x: px, y: Math.min(gy, ground(px)) - 150 }, { v: F.cruise, r: 90 }, () => p.go(loopUp(), { v: F.cruise, r: 90 }, () => p.rejoin()));
      }
      if (drop < 0 || p.ord <= 0) return;
      if (drop++ % 5) return;
      p.ord--;
      const sp = Math.min(16, p.sp);
      const guide = heavy ? { arm: 2, burn: 300, seek: 4, apex: false, turn: 5, range: Z, cone: 180, lift: 0.4, brake: false } : BOMB_GUIDE;
      const b = new Projectile(g, planeOrd(G, { kin: DIVE_KIN, guide, visR: w.dmgR * 2.2 }), p.owner, p.sx, p.sy + 6, Math.cos(p.hd) * sp, Math.sin(p.hd) * sp, p.i === 0);
      b.launch = Math.PI / 2;
      b.prefer = 'rival'; b.wseed = rng.int(0, 1e9);
      g.projectiles.push(b);
      g.sfx.click();
      if (p.ord <= 0) p.passDone();
    };
  } else if (p.kind === 'torpedo') {
    // down to skimming height well short of the mark, a level run in, the torpedo off 230 short,
    // then a climbing turn away and round
    const x1 = clamp(gx - side * 560, 10, WORLD_W - 10), x2 = clamp(gx - side * 230, 10, WORLD_W - 10);
    p.go(climb(100), up, () => p.go({ x: x1, y: ground(x1) - 80 }, { v: F.dive, r: 60, clear: 0 },
      () => p.go({ x: x2, y: ground(x2) - 30 }, { v: F.cruise, r: 34, clear: 16 }, () => {
        if (p.ord > 0) { p.ord--; g.projectiles.push(new Torpedo(g, p.owner, planeOrd(G), p.sx, side)); g.sfx.click(); }
        p.passDone();
        const px = clamp(gx + side * 260, 10, WORLD_W - 10);
        p.go({ x: px, y: ground(px) - 260 }, { v: F.top, r: 90 }, () => p.rejoin());
      })));
  } else if (p.kind === 'rocket') {
    // a shallow dive at the mark, rockets off one after another from 420 out, pull up and round
    let fire = -1, diving = false;
    p.go(climb(160), up, () => { diving = true; p.go({ x: gx, y: gy }, { v: F.dive, r: 0, clear: 0 }); });
    p.attack = () => {
      if (!diving) return;
      if (fire < 0) { if (dist(p.x, p.y, gx, gy) < 380) fire = 0; else return; }
      if (p.ord <= 0 || fire++ % 6) return;
      p.ord--;
      const tx = gx - p.x, ty = gy - 10 - p.y, d = Math.hypot(tx, ty) || 1;
      const r = new Projectile(g, { ...planeOrd(G), kind: 'rocket', guide: w.guide }, p.owner, p.sx, p.sy + 6, (tx / d) * 13, (ty / d) * 13, p.i === 0);
      r.launch = Math.PI / 3;
      g.projectiles.push(r);
      g.sfx.click();
      if (p.ord <= 0) {
        p.passDone();
        p.go({ x: p.x + side * 280, y: p.y - 10 }, { v: F.cruise, r: 80 }, () => p.go(loopUp(), { v: F.cruise, r: 90 }, () => p.rejoin()));
      }
    };
  } else if (p.kind === 'fortress') {
    // a level bomber: back out along the run, then straight across the zone at altitude, a stick
    // of bombs walked across it (thrown ahead by its speed), and round again
    const y = Math.max(G.ceil + 60, Math.min(p.y, G.hoverY) - 30);
    const fall = Math.sqrt((2 * Math.max(60, gy - y)) / GRAV), lead = F.cruise * fall;
    const span = Z, n = Math.max(1, p.ord);
    const xs = Array.from({ length: n }, (_, k) => gx - side * lead + side * (-span + ((k + 0.5) * 2 * span) / n));
    p.go({ x: gx - side * (lead + span + 420), y }, { v: F.cruise, r: 90 }, () => p.go({ x: gx + side * (span + 520 - lead), y }, { v: F.cruise, r: 90 }, () => p.rejoin()));
    let k = 0, run = false;
    p.attack = () => {
      if (!run) { run = p.nav && side * (p.nav.to().x - p.x) > 0 && Math.sign(p.vx) === side; return; }
      if (k < n && side * (p.x - xs[k]) >= 0) {
        k++; p.ord--;
        const b = new Projectile(g, planeOrd(G), p.owner, p.sx, p.sy + 8, p.vx, Math.max(0, p.vy), p.i === 0);
        b.launch = Math.PI / 2;
        g.projectiles.push(b);
        g.sfx.click();
        if (k >= n) p.passDone();
      }
    };
  } else { // fighter: aircraft over the zone first (it turns after them), else a strafing run
    const air = g.aaAircraft(p.owner).filter((e) => e !== p && e.alive && Math.abs(e.center().x - m.x) < (Z + 300) * FIGHTER_REACH && (!e.isPlane || e.owner !== p.owner));
    const gunDmg = w.dmg * G.mult * (w.fleet ? 0.15 : 1); // a fighter's burst (a fleet's are a fraction of its bombs)
    let k = 0, strafe = false, diving = false, prey = null;
    p.prey = null; // (a new pass: free to pick again)
    const away = () => { p.passDone(); p.go({ x: p.x + Math.cos(p.hd) * 300, y: p.y - 160 }, { v: F.cruise, r: 90 }, () => p.rejoin()); };
    p.attack = () => {
      k++;
      if (!strafe) {
        // one aircraft a pass: its own (one a squadmate isn't already after, if there is one), and
        // once that is down, the pass is over, however many more there are
        if (prey && !prey.alive) { away(); return; }
        const taken = (e) => p.group.planes.some((o) => o !== p && o.alive && o.prey === e);
        const e = prey || air.find((e) => e.alive && !taken(e)) || air.find((e) => e.alive);
        if (e && p.ord > 0 && k < 360) { // dogfight: chase it at its turn rate, guns when it is in front
          if (e !== prey) { prey = p.prey = e; p.go(() => e.center(), { v: F.top, r: 0, clear: 40 }); }
          const q = e.center(), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
          if (k % 4 === 0 && d < 320 && Math.abs(wrapA(Math.atan2(dy, dx) - p.hd)) < 0.35) {
            p.ord--;
            g.lasers.push(new Laser(p.sx, p.sy, q.x, q.y, '#ffe8a0', 2, 6));
            if (rng.next() < 0.85) g.damage(e, gunDmg * 3, p.owner, { aa: true, fighter: true });
            // a fighter jumped by fighters fights back: the dogfight costs both sides
            if (e.isPlane && e.alive && e.kind === 'fighter' && e.t - (e.shotBack || -99) >= 8) {
              e.shotBack = e.t;
              const E = e.group, back = E.w.dmg * E.mult * (E.w.fleet ? 0.15 : 1) * 3;
              g.lasers.push(new Laser(e.sx, e.sy, p.sx, p.sy, '#ffe8a0', 2, 6));
              if (rng.next() < 0.6) g.damage(p, back * 0.7, e.owner, { aa: true, fighter: true }); // (jumped: it gets fewer and worse shots off)
            }
          }
          return;
        }
        if (prey || p.ord <= 0) { away(); return; } // (it fought: that was its pass)
        strafe = true; // up, over, and down at the mark, guns going, pulling out low past it
        p.go(climb(140), up, () => { diving = true; p.go({ x: gx, y: gy - 30 }, { v: F.dive, r: 0, clear: 0 }); });
      }
      if (diving && (gy - p.y < 140 || dist(p.x, p.y, gx, gy) < 150)) {
        diving = false;
        p.passDone();
        const s2 = clamp(gx + side * 320, 10, WORLD_W - 10);
        p.go({ x: s2, y: ground(s2) - 200 }, { v: F.cruise, r: 90 }, () => p.go(loopUp(), { v: F.cruise, r: 90 }, () => p.rejoin()));
        return;
      }
      // guns in bursts at the mark while it is in front of the nose and in range
      const tx = gx + (rng.next() - 0.5) * 40 - p.x, ty = gy - 8 - p.y, d = Math.hypot(tx, ty) || 1;
      if (diving && k % 4 === 0 && p.ord > 0 && d < 380 && Math.abs(wrapA(Math.atan2(ty, tx) - p.hd)) < 0.6) {
        p.ord--;
        g.projectiles.push(new Projectile(g, { ...planeOrd(G), kind: 'gun', drift: 0.1, dmg: gunDmg }, p.owner, p.sx, p.sy + 4, (tx / d) * 16, (ty / d) * 16, false));
      }
    };
  }
}

Object.assign(Game.prototype, {
  // the dot has landed: it takes her next squad of this weapon. One on deck takes off; with none
  // left on deck, the one out longest on its orders is redirected to it
  launchSquad(p) {
    const t = p.owner, w = p.w, A = w.air, sq = t.wing(w);
    const mark = { x: clamp(p.x, 20, WORLD_W - 20), y: Math.min(p.y, this.terrain.hAt(clamp(p.x, 0, WORLD_W - 1))) };
    const q = sq.find((q) => !q.tasked && q.state === 'deck') || sq.filter((q) => !q.tasked && q.state === 'out').sort((a, b) => a.orders - b.orders)[0];
    if (!q) return null;
    const G0 = q.state === 'out' && this.airGroups.find((G) => G.squad === q);
    q.tasked = true;
    q.orders = this.airOrders = (this.airOrders || 0) + 1;
    const muzzle = t.muzzle();
    this.lasers.push(new Laser(muzzle.x, muzzle.y, p.x, p.y, '#ff3a4a', 2, 26));
    if (G0) { // redirected: it flies over and strikes there (hover, see Plane.update)
      G0.mark = mark;
      G0.side = t.x <= mark.x ? 1 : -1;
      this.events.push(`${t.name} redirects a squad.`);
      this.projectiles.push(new AirStrike(this, [G0]));
      return G0;
    }
    q.state = 'out';
    const deck = hasTrait(t, 'flightdeck') || (t.upgrades && t.upgrades.deck > 0);
    const n = A.planes + (hasTrait(t, 'flightdeck') ? 1 : 0);
    const G = this.makeGroup(t, w, mark, { deck, kinds: Array(n).fill(A.type) });
    G.squad = q;
    this.particles.text(mark.x, mark.y - 30, `${n} ${A.type === 'fighter' ? 'fighters' : 'planes'} inbound`, '#ffd0d4');
    this.events.push(`${t.name} calls a squad of ${n} onto the mark.`);
    this.projectiles.push(new AirStrike(this, [G])); // (the turn waits for it to strike)
    return G;
  },

  // a group of planes for one mark: where they hover, which side they come in from, when they hit
  makeGroup(owner, w, mark, o) {
    const ceil = Math.min(-300, this.cam.ceil === undefined ? -600 : this.cam.ceil + 100);
    let top = Infinity;
    for (let dx = -160; dx <= 160; dx += 20) top = Math.min(top, this.terrain.hAt(clamp(mark.x + dx, 0, WORLD_W - 1)));
    const side = owner.x <= mark.x ? 1 : -1; // they come in from the owner's side (torpedoes run away from her)
    const G = {
      owner, w, mark, side, ceil, deck: o.deck, mult: 1, hp: o.hp || w.air.hp, armour: w.air.armour || 0,
      planes: [],
      hoverY: Math.max(ceil + 120, top - PLANE_HOVER),
      dir: owner.facing || 1,
      from: o.from || { x: owner.x, y: owner.y - TANK_H * 0.8 },
    };
    // each waits back along its approach line: dive bombers nearly overhead, low attackers far out
    // and shallow; a squad in a line across it, a fleet in rows by type
    const byKind = {};
    o.kinds.forEach((k, i) => { (byKind[k] || (byKind[k] = [])).push(i); });
    // (from wherever its mark is now: it can be redirected)
    G.slot = (i) => {
      const mk = G.mark, sd = G.side;
      if (G.topAt !== mk.x) { G.topAt = mk.x; G.top = Infinity; for (let dx = -160; dx <= 160; dx += 20) G.top = Math.min(G.top, this.terrain.hAt(clamp(mk.x + dx, 0, WORLD_W - 1))); G.hoverY = Math.max(ceil + 120, G.top - PLANE_HOVER); }
      const kind = o.kinds[i], list = byKind[kind], k = list.indexOf(i), n2 = list.length;
      const a = rad(AIR_ANGLE[kind] || 60), R = clamp(PLANE_HOVER / Math.sin(a), 420, 1000);
      const row = Math.floor(k / 8), m = Math.min(8, n2 - row * 8), kk = k % 8;
      const x = clamp(mk.x - sd * Math.cos(a) * R + (kk - (m - 1) / 2) * PLANE_GAP * (kind === 'fortress' ? 1.6 : 1), 20, WORLD_W - 20);
      let y = Math.min(mk.y, G.top) - Math.sin(a) * R - row * 34 - (kk % 2) * 14;
      y = Math.max(ceil + 120, Math.min(y, this.terrain.hAt(x) - 170)); // clear of the ground under it
      return { x, y };
    };
    o.kinds.forEach((kind, i) => {
      const pl = new Plane(this, G, i, kind, i * (o.stagger || PLANE_STAGGER) + (o.wait || 0));
      if (o.place) o.place(pl, i);
      G.planes.push(pl);
      this.planes.push(pl);
    });
    this.airGroups.push(G);
    return G;
  },

  stepPlanes() {
    if (!this.planes) return;
    for (const p of this.planes) p.update();
    this.planes = this.planes.filter((p) => p.alive || p.falling);
    this.airGroups = this.airGroups.filter((G) => {
      const q = G.squad;
      if (!G.owner.alive && !G.abandoned) { // her planes go: those not up yet stay down, the rest fly off
        G.abandoned = true;
        for (const p of G.planes) if (p.alive && (p.state === 'wait' || p.state === 'out')) p.alive = false; else if (p.alive && p.state !== 'attack') p.leave();
      }
      if (G.planes.some((p) => p.alive)) {
        if (q && q.state === 'out' && G.planes.every((p) => !p.alive || p.state === 'leave')) q.state = 'home'; // loadout spent: no more orders
        return true;
      }
      // all home (or shot down): its squad rearms, and is back on her deck after its turns
      if (q && (q.state === 'out' || q.state === 'home')) { q.state = 'rearm'; q.turns = reloadOf(G.w) + (G.deck ? 0 : vtolRearm(G.w)); } // (VTOL squads take longer)
      return false;
    });
  },

  // her squads out over a zone and free to take orders (not sent this turn, not striking, not
  // already on their way home): of weapon w, or of any plane weapon
  recallable(t, w) {
    return (this.airGroups || []).filter((G) => G.owner === t && (!w || G.w === w) && G.squad && G.squad.state === 'out' && !G.squad.tasked && !G.striking && G.planes.some((p) => p.alive));
  },

  // Recall (X): her squads fly home now, loadouts unspent, rather than wait over their zones to be
  // shot at; they rearm as if they had flown their passes. Doesn't use up the turn.
  recallSquads(t, w) {
    const L = this.recallable(t, w);
    if (!L.length) { this.sfx.deny(); return false; }
    for (const G of L) {
      G.squad.state = 'home';
      for (const p of G.planes) {
        if (!p.alive) continue;
        if (p.state === 'wait' || p.state === 'out') p.alive = false; // (never got up)
        else p.goHome();
      }
      const c = squadCentre(G);
      if (c) this.particles.text(c.x, c.y - 30, 'RECALLED', '#ffd0d4');
    }
    this.sfx.click();
    this.events.push(`${t.name} recalls ${L.length > 1 ? `${L.length} squads` : 'a squad'}.`);
    return true;
  },

  // a CPU brings its squads home unless one can be sure of something this turn: a rival it would
  // finish off, or a hostile with a bounty on it
  cpuRecall(t) {
    for (const G of this.recallable(t)) {
      const live = G.planes.filter((p) => p.alive && p.passes > 0);
      const strike = live.reduce((s, p) => s + G.w.dmg * G.mult * (G.w.fleet ? 1 : G.w.air.ord || 1), 0) * 0.6; // (what it can count on landing)
      const kill = this.tanks.some((x) => x.alive && x !== t && x.hp + x.armour <= strike);
      const prize = (this.mobs || []).some((m) => m.alive && m.bounty > 0 && m.hp + (m.armour || 0) <= strike);
      if (!kill && !prize) this.recallSquads(t, G.w);
    }
  },

  damagePlane(p, amt, owner, def, hit) {
    if (!p.alive || p.owner === owner) return;
    if (def && (def.kind === 'flak' || def.airburst)) { amt *= FLAK_MOB_MULT; if (hit) hit.flak = true; }
    // the same hit popup as any other hit (a burst with no shot behind it, like AA's, is scored on how
    // much of the plane it took)
    hit = hit || { q: clamp(amt / (p.maxHp || 1), 0, 1), alt: 0, kin: 0, front: 1, aa: !!(def && def.aa) };
    if (p.drill && this.range) { this.drillHit(p, amt, hit); return; } // (the Codex's AA drill: tallied, not destroyed)
    p.flash = 1;
    if (p.armour > 0) { // a fortress's armour takes a whole hit, however big, like a girl's
      const a = Math.min(amt, p.armour);
      p.armour -= a;
      this.hitPopup(p.sx, p.sy - 26, a, { ...hit, armour: true }, p);
      return;
    }
    p.hp -= amt;
    this.hitPopup(p.sx, p.sy - 26, amt, hit, p);
    if (p.hp > 0) return;
    p.alive = false; // (no bounty: they're somebody's planes)
    const c = p.center();
    this.particles.explosion(c.x, c.y, 50, 'shell');
    for (let i = 0; i < 8; i++) this.particles.add({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, g: 0.25, drag: 0.98, life: 1.2 + Math.random(), size: 3 + Math.random() * 4, color: i % 2 ? [60, 60, 64] : [255, 160, 80] });
    this.sfx.explosion(14);
    this.events.push(`${owner ? owner.name : 'Something'} shot down one of ${p.owner.name}'s planes.`);
  },

  // the zones: a strip on the ground under each waiting squad, in its owner's colour, so whoever
  // is in it knows to move
  drawPlanes(ctx) {
    if (!this.planes) return;
    for (const G of this.airGroups) {
      if (G.striking || !G.planes.some((p) => p.alive && (p.state === 'hover' || p.state === 'inbound'))) continue;
      const m = G.mark, r = airZone(G.w), a = 0.55 + 0.3 * Math.sin(this.time * 4);
      const gy = this.terrain.hAt(clamp(m.x, 0, WORLD_W - 1));
      ctx.fillStyle = G.owner.color;
      ctx.globalAlpha = a;
      for (let k = -8; k <= 8; k++) { // the strike zone along the ground
        const x = m.x + (k / 8) * r;
        sq(ctx, x, this.terrain.hAt(clamp(x, 0, WORLD_W - 1)) - 3, Math.abs(k) === 8 ? 10 : 5);
      }
      const c = squadCentre(G); // and a dotted line from the squad down to the mark
      if (c) { const d = dist(c.x, c.y, m.x, gy); for (let u = 40; u < d - 20; u += 22) sq(ctx, lerp(c.x, m.x, u / d), lerp(c.y, gy, u / d), 3); }
      ctx.fillStyle = '#ffffff';
      sq(ctx, m.x, gy - 3, 4);
      ctx.globalAlpha = 1;
    }
    for (const p of this.planes) p.draw(ctx);
    this.drawAA(ctx);
  },

  // HUD over each waiting squad: its badge, then a pip a pass it has left (like an autoloader's rounds)
  drawPlaneLabels(ctx, cam) {
    if (!this.airGroups) return;
    ctx.textAlign = 'center';
    for (const G of this.airGroups) {
      const live = G.planes.filter((p) => p.alive && p.state === 'hover');
      if (!live.length || G.striking) continue;
      const passes = Math.max(...live.map((p) => p.passes));
      const c = squadCentre(G), rc = RARITY[G.w.rarity].ui;
      ctx.font = `11px ${HUD_FONT}`;
      const w = 22 + 4 + passes * 10;
      const x = Math.round(cam.sx(c.x) - w / 2), y = Math.round(cam.sy(c.y - 40) - 44);
      ctx.fillStyle = HUD.plate; ctx.fillRect(x, y, 22, 20);
      ctx.fillStyle = rc;
      ctx.fillRect(x, y, 22, 1); ctx.fillRect(x, y + 19, 22, 1); ctx.fillRect(x, y, 1, 20); ctx.fillRect(x + 21, y, 1, 20);
      ctx.fillText(badgeText(G.w), x + 11, y + 14);
      ctx.fillStyle = G.owner.color; ctx.fillRect(x, y + 21, 22, 2); // (whose)
      for (let i = 0; i < passes; i++) { ctx.fillStyle = HUD.accent; ctx.fillRect(x + 26 + i * 10, y + 7, 7, 7); }
    }
  },
});

// ------------------------------------------------------------------------------ the fleet
// Zuihou's Parallel Night (the Kidō Butai): her dot is for the carriers off the coast. The camera whips out to sea past
// the edge of the map behind her: three carriers turn into the wind and launch their whole air
// wing (dive bombers, torpedo bombers, fighters), which climbs away, comes back over the mark and
// hovers there in a great formation. It strikes two of her turns later, if anything is left of it.
const KIDO = { OUT: 46, LAUNCH: 56, BACK: 230, BACK_END: 272, END: 640 };
const KIDO_OFF = 2600; // the nearest carrier, past the edge of the map
const KIDO_COAST = 1100; // where the land past the edge meets the sea
const KIDO_SPAN = 9000; // how far out the sea is drawn
const KIDO_GAP = 760;

class FleetStrike {
  constructor(game, owner, at, w, q) {
    this.game = game; this.owner = owner; this.w = w; this.t = 0;
    const side = (this.side = owner.x <= at.x ? -1 : 1); // the sea is behind her
    this.edge = side < 0 ? 0 : WORLD_W;
    this.coast = game.terrain.hAt(clamp(this.edge, 2, WORLD_W - 2));
    this.seaY = Math.max(this.coast + 60, WORLD_BOTTOM * 0.62);
    const F = w.fleet;
    this.ships = Array.from({ length: F.carriers }, (_, k) => ({ x: this.edge + side * (KIDO_OFF + k * KIDO_GAP), len: 620 - k * 60, bob: k * 1.7 }));
    const kinds = [];
    for (let i = 0; i < Math.max(F.dive, F.torpedo, F.fighter); i++) for (const [k, n] of [['fighter', F.fighter], ['dive', F.dive], ['torpedo', F.torpedo]]) if (i < n) kinds.push(k);
    const mark = { x: clamp(at.x, 20, WORLD_W - 20), y: Math.min(at.y, game.terrain.hAt(clamp(at.x, 0, WORLD_W - 1))) };
    this.group = game.makeGroup(owner, w, mark, {
      deck: true, kinds, hp: w.air.hp, wait: KIDO.LAUNCH, stagger: 6,
      place: (pl, i) => {
        const s = this.ships[i % this.ships.length];
        pl.from = { x: s.x + side * s.len * 0.38, y: this.seaY - 62 }; // the carrier's stern
        pl.launchDir = -side; // toward the land
        pl.x = pl.from.x; pl.y = pl.from.y;
      },
    });
    q = q || owner.wing(w)[0];
    q.state = 'out'; q.tasked = true; // (the fleet is her one squad of it)
    q.orders = game.airOrders = (game.airOrders || 0) + 1;
    this.group.squad = q;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: mark.x, y: mark.y - 160 };
    this.view = { x: this.ships[1 % this.ships.length].x, y: this.seaY - 300 };
    game.cam.wide = KIDO_OFF + KIDO_GAP * F.carriers + 900;
    game.cam.wideSide = side; // (only out to sea: past the far edge there is nothing)
    game.cam.follow(this.focus);
    game.ui.notice('Parallel Night: the carriers turn into the wind.');
    game.events.push(`${owner.name} calls the Parallel Night: ${kinds.length} aircraft are coming.`);
    this.whip = 0;
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, f = this.focus, px = f.x, v = this.view, m = this.group.mark;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    if (t <= KIDO.OUT) { // out to sea
      const u = ease(t / KIDO.OUT);
      f.x = lerp(m.x, v.x, u); f.y = lerp(m.y - 160, v.y, u);
      cam.setZoom(lerp(this.zoom0, 0.6, Math.min(1, u * 1.5)));
    }
    if (t > KIDO.BACK && t <= KIDO.BACK_END) { // and back to the mark as they climb away
      const u = ease((t - KIDO.BACK) / (KIDO.BACK_END - KIDO.BACK));
      f.x = lerp(v.x, m.x, u); f.y = lerp(v.y, this.group.hoverY + 120, u);
      cam.setZoom(lerp(0.6, Math.min(this.zoom0, 0.75), u));
    }
    cam.follow(f);
    if (t <= KIDO.BACK_END) cam.snap();
    this.whip = Math.abs(f.x - px);
    if (t >= KIDO.BACK_END + 20) { cam.wide = 0; cam.wideSide = 0; g.projectiles.push(new AirStrike(g, [this.group])); return false; } // (and the air wing flies on in to strike)
    return true;
  }

  // the sea past the edge of the map, drawn over the far hills (which end a little past the edge):
  // open sky fading in beyond the edge, the land running down to a beach well out from it, the sea,
  // and the carriers steaming into the wind far out (under the terrain and the planes)
  drawMid(ctx) {
    const g = this.game, side = this.side, e = this.edge, time = g.time, cam = g.cam;
    const out = (d) => e + side * d; // d past the edge, out to sea
    const strip = (d0, d1, y0, y1) => ctx.fillRect(Math.round(Math.min(out(d0), out(d1))), Math.round(y0), Math.round(Math.abs(d1 - d0)), Math.round(y1 - y0));
    const top = Math.min(cam.y, this.seaY - 2000) - 200, bottom = WORLD_BOTTOM + 600;
    const sky = g.bg.biome.sky, grad = ctx.createLinearGradient(0, cam.y, 0, cam.y + cam.h);
    grad.addColorStop(0, rgb(sky[0])); grad.addColorStop(1, rgb(sky[1]));
    ctx.fillStyle = grad;
    for (let k = 0; k < 12; k++) { ctx.globalAlpha = (k + 1) / 12; strip(k * 50, k * 50 + 50, top, this.seaY + 2); }
    ctx.globalAlpha = 1;
    strip(600, KIDO_SPAN, top, this.seaY + 2);
    // the sea, then the land easing down from the map's edge to the beach and on down under the
    // water as the sea bed (seen side on, like the map's own ground)
    ctx.fillStyle = 'rgb(34,62,92)';
    strip(0, KIDO_SPAN, this.seaY, bottom);
    ctx.fillStyle = g.terrain.color;
    ctx.beginPath();
    ctx.moveTo(out(0), this.coast);
    for (let k = 1; k <= 24; k++) { const u = k / 24; ctx.lineTo(out(u * KIDO_COAST), lerp(this.coast, this.seaY, u * u * (3 - 2 * u))); }
    ctx.lineTo(out(KIDO_COAST + 900), this.seaY + 420);
    ctx.lineTo(out(KIDO_COAST + 900), bottom); ctx.lineTo(out(0), bottom); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgb(214,200,160)'; strip(KIDO_COAST - 150, KIDO_COAST + 20, this.seaY - 3, this.seaY + 6); // the beach
    ctx.fillStyle = 'rgb(58,96,128)';
    for (let k = 0; k < 80; k++) { // swell
      const d = KIDO_COAST + 400 + ((k * 137 + time * 30) % (KIDO_SPAN - KIDO_COAST - 400)), y = this.seaY + 6 + (k % 7) * 18;
      ctx.fillRect(Math.round(out(d)), Math.round(y), 40 + (k % 5) * 12, 3);
    }
    for (const s of this.ships) {
      const y = this.seaY + Math.sin(time * 0.9 + s.bob) * 2, L = s.len, x = s.x;
      const box = (lx, ty, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + lx), Math.round(y + ty), Math.round(w), Math.round(h)); };
      box(side > 0 ? L / 2 : -L / 2 - 240, 2, 240, 6, 'rgba(220,234,244,0.6)'); // the wake
      box(-L / 2, -40, L, 40, 'rgb(66,70,78)'); // hull
      box(-L / 2 + 24, -10, L - 48, 10, 'rgb(48,52,58)');
      box(-L / 2 - 18, -56, L + 36, 16, 'rgb(150,124,84)'); // the flight deck, overhanging, with its white lines
      for (let k = -5; k <= 5; k++) box(k * L / 12, -50, 18, 3, 'rgb(236,236,230)');
      box(-side * L * 0.36 - 9, -55, 18, 14, 'rgb(200,40,40)'); // the red sun at the bow end
      box(L * 0.1, -100, 44, 44, 'rgb(80,84,92)'); // the island
      box(L * 0.1 + 16, -136, 10, 36, 'rgb(80,84,92)');
      box(L * 0.1 - 14, -82, 16, 26, 'rgb(60,62,68)'); // the funnel
      for (let k = 0; k < 4; k++) box(-L * 0.3 + k * L * 0.12, -64, 26, 8, 'rgb(70,96,70)'); // aircraft ranged on deck
      if ((time * 3 | 0) % 2) box(L * 0.1 + 19, -140, 4, 4, '#ff5a4a');
    }
  }

  draw(ctx) {
    const g = this.game, time = g.time;
    if (this.whip > 30) { // speed lines while the camera whips across
      const cam = g.cam, a = clamp((this.whip - 30) / 90, 0, 0.75);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      for (let i = 0; i < 30; i++) {
        const u = (i * 0.618034) % 1, vv = (i * 0.381966 + 0.17) % 1;
        const x = cam.x + ((u * 1.4 + time * 3.1 * (0.6 + vv)) % 1.4 - 0.2) * cam.w;
        ctx.fillRect(Math.round(x), Math.round(cam.y + vv * cam.h), Math.round(cam.w * (0.2 + 0.3 * vv)), Math.max(2, Math.round(3 / cam.zoom)));
      }
    }
  }

  drawScreen(ctx) {
    const t = this.t;
    if (t < KIDO.OUT - 6 || t > KIDO.BACK + 6) return;
    const a = Math.min(1, (t - KIDO.OUT + 6) / 10, (KIDO.BACK + 6 - t) / 8);
    const y = Math.round(H * 0.17), n = this.group.planes.length;
    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(20,20,26,${0.6 * a})`; ctx.fillRect(W / 2 - 220, y - 22, 440, 46);
    ctx.fillStyle = `rgba(255,230,200,${a})`;
    ctx.fillText(`SENGOKU KIDŌ BUTAI  ·  ${this.ships.length} CARRIERS`, W / 2, y - 2);
    ctx.fillStyle = `rgba(220,220,230,${a})`; ctx.font = '11px monospace';
    ctx.fillText(`${n} AIRCRAFT  ·  STRIKE INBOUND`, W / 2, y + 15);
  }
}
