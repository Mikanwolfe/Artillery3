'use strict';
// Planes (Sengoku Inc.; the weapons are in weapons.js, kind 'air'). The gun is a laser designator:
// where its dot lands, a squad takes off from her (along a flight deck, or straight up on its lift
// fan: VTOL, 30% softer), climbs out of sight, comes back in at an angle and hovers over the mark.
// There it waits, and anyone can shoot it (shells, flak, AA mounts) for a round of turns. At the
// start of its owner's next turn (a strike fleet: the one after) the squad attacks, then flies off.
// A squad whose owner is destroyed stays on as a hazard and strikes anyway. Shooting planes down pays nothing.
// Planes fly Bézier paths at a speed that eases in and out, and bank to their heading (they turn,
// unlike the rest of the world's boxes: an exception, like the FPV). Jets throughout, bar the
// starter's propeller dive bomber; each has a lift fan in the middle of the fuselage to hover on.
// Each type waits off to one side of its mark on its own approach line and attacks along it:
// dive bombers almost overhead (80°), low attackers far out and shallow (25°).

const PLANE_S = 1.35; // drawing scale (the boxes below are in unscaled units)
const PLANE_HW = 22; // hitbox half-width
const PLANE_HH = 16;
const PLANE_STAGGER = 14; // frames between take-offs
const PLANE_HOVER = 280; // how high a squad waits over the ground near its mark (above the short-range AA)
const PLANE_GAP = 44; // between planes in a squad's line
const AIR_ANGLE = { dive: 80, heavy: 75, fighter: 50, rocket: 40, torpedo: 25 }; // approach angle over the horizon, by type
const TORPEDO_SPEED = 7;
const TORPEDO_RUN = 760; // how far a torpedo runs before it goes off anyway
const DIVE_KIN = 6;
// a plane's loadout: how many of her turns it attacks on before it flies home to rearm
const AIR_PASSES = { dive: 3, torpedo: 1, fighter: 6, rocket: 2, heavy: 1 };
// how far from its mark a plane's seeker looks for something to attack when the strike starts
// (rivals first, then hostiles), like a rocket's; out of reach, it hits the mark
const AIR_SEEK = { dive: 240, torpedo: 300, fighter: 300, rocket: 280, heavy: 260 };
const BOMB_GUIDE = { arm: 2, burn: 120, seek: 999, apex: false, turn: 1.6, range: 90, cone: 120, lift: 0, brake: false }; // a dive bomb's fins: a nudge, not a seeker // a dive-released bomb's kinetic multiplier (it leaves the plane at the dive's speed)

// how a type looks: body colours, length, the NXi stripe
const PLANE_LOOK = {
  prop: { body: [62, 88, 58], belly: [176, 176, 160], len: 30 },
  dive: { body: [92, 104, 120], belly: [178, 184, 194], len: 32 },
  torpedo: { body: [84, 98, 90], belly: [176, 182, 176], len: 36 },
  fighter: { body: [150, 156, 166], belly: [204, 208, 214], len: 30 },
  rocket: { body: [104, 112, 96], belly: [186, 190, 178], len: 32 },
  heavy: { body: [42, 52, 84], belly: [92, 104, 138], len: 46, stripe: [90, 216, 200] },
};

// a point on a cubic Bézier, and its derivative
const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
const bezD = (a, b, c, d, t) => { const u = 1 - t; return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c); };

class Plane {
  constructor(game, group, i, kind, delay) {
    this.isPlane = true;
    this.game = game;
    this.group = group;
    this.owner = group.owner;
    this.w = group.w;
    this.kind = kind; // dive | torpedo | fighter | rocket | heavy
    this.prop = group.w.id === 'zui0'; // the starter is the one propeller plane
    this.hp = this.maxHp = group.hp;
    this.armour = 0;
    this.hw = PLANE_HW; this.hh = PLANE_HH;
    this.alive = true;
    this.i = i;
    this.delay = delay;
    this.state = 'wait';
    this.t = 0;
    this.vx = 0; this.vy = 0;
    this.ang = 0; // bank: the heading's angle below the horizon
    this.passes = group.w.fleet ? 1 : AIR_PASSES[kind] || 1; // attacks left before it goes home
    this.flash = 0;
    this.dir = group.dir;
    this.x = group.from.x; this.y = group.from.y;
  }

  get name() { return `${this.owner.name}'s ${shortName(this.w)}`; }
  // shootable while it is in the sky over the map (not before take-off, nor while out of sight)
  get targetable() { return this.alive && this.state !== 'wait' && this.state !== 'out'; }
  center() { return { x: this.x, y: this.y - this.hh / 2 }; }

  // fly a cubic Bézier from where it is, easing from speed v0 to v1; then() at the end
  fly(p1, p2, p3, v0, v1, then) { this.path = { x: [this.x, p1.x, p2.x, p3.x], y: [this.y, p1.y, p2.y, p3.y], s: 0, v0, v1, then }; }

  stepPath() {
    const P = this.path;
    const sp = lerp(P.v0, P.v1, P.s);
    const L = Math.hypot(bezD(...P.x, P.s), bezD(...P.y, P.s)) || 1;
    P.s = Math.min(1, P.s + sp / L);
    const nx = bez(...P.x, P.s), ny = bez(...P.y, P.s);
    this.vx = nx - this.x; this.vy = ny - this.y;
    this.x = nx; this.y = ny;
    if (P.s >= 1) { this.path = null; if (P.then) P.then(); }
  }

  update() {
    const g = this.game, G = this.group;
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
    if (!this.alive) return;
    switch (this.state) {
      case 'wait':
        if (--this.delay <= 0) {
          const F = this.from || G.from;
          this.state = 'launch'; this.t = 0; this.x = F.x; this.y = F.y; this.dir = this.launchDir || this.dir;
          if (this.i % 3 === 0) g.sfx.click();
          const d = this.dir, top = G.ceil - 120;
          if (G.deck) this.fly({ x: F.x + d * 140, y: F.y }, { x: F.x + d * 380, y: F.y - 220 }, { x: F.x + d * 700, y: top }, 2, 13, () => { this.state = 'out'; this.t = 0; });
        }
        break;
      case 'launch':
        if (!G.deck && !this.path) { // VTOL: straight up on the lift fan, then away
          this.vx = 0; this.vy = -Math.min(3, 0.5 + this.t * 0.1);
          this.y += this.vy;
          if (this.t % 3 === 0) g.particles.add({ x: this.x + (Math.random() - 0.5) * 8, y: this.y + 8, vx: (Math.random() - 0.5) * 2, vy: 1.5, g: 0, drag: 0.9, life: 0.4, size: 4 + Math.random() * 4, color: [210, 210, 214] });
          if (this.t > 30) { const d = this.dir; this.fly({ x: this.x + d * 60, y: this.y - 140 }, { x: this.x + d * 300, y: this.y - 460 }, { x: this.x + d * 640, y: G.ceil - 120 }, 3, 13, () => { this.state = 'out'; this.t = 0; }); }
        }
        break;
      case 'out': // out of sight: it comes back in from high up behind its approach line
        if (this.t > 20) {
          const s = G.slot(this.i), ax = G.side;
          this.state = 'inbound'; this.t = 0;
          this.x = s.x - ax * 760; this.y = s.y - 620;
          this.fly({ x: this.x + ax * 320, y: this.y + 140 }, { x: s.x - ax * 260, y: s.y - 30 }, s, 13, 2.5, () => { this.state = 'hover'; this.t = 0; this.dir = Math.sign(G.mark.x - s.x) || ax; });
        }
        break;
      case 'hover': {
        const s = G.slot(this.i);
        this.x += (s.x - this.x) * 0.1;
        this.y += (s.y + Math.sin(this.t / 22 + this.i * 1.7) * 4 - this.y) * 0.1;
        this.vx = this.vy = 0;
        break;
      }
      case 'attack':
        if (this.attack) this.attack(this);
        break;
    }
    if (this.path) this.stepPath();
    if (this.state === 'leave' && !this.path) this.alive = false; // home (not shot down)
    // bank to the heading; level out to hover
    const moving = Math.abs(this.vx) + Math.abs(this.vy) > 0.4;
    if (moving && Math.abs(this.vx) > 0.3) this.dir = Math.sign(this.vx);
    const want = moving ? clamp(Math.atan2(this.vy, Math.abs(this.vx)), -1.45, 1.45) : 0;
    this.ang += (want - this.ang) * 0.25;
  }

  // a pass done: back round to wait over its target for her next turn, or (loadout spent) home
  endPass() {
    this.passes--;
    this.strikeDone = true;
    this.attack = null;
    if (this.passes > 0) {
      const G = this.group, s = G.slot(this.i), h = Math.hypot(this.vx, this.vy) || 6;
      this.state = 'inbound';
      this.fly({ x: this.x + this.vx * 10, y: this.y + this.vy * 10 - 60 }, { x: s.x - G.side * 200, y: s.y - 160 }, s, h, 2.5, () => { this.state = 'hover'; this.t = 0; this.dir = Math.sign(G.mark.x - s.x) || G.side; });
    } else this.goHome();
  }

  // to her deck to rearm (it lands and is gone); with her gone, away off the map
  goHome() {
    const o = this.owner;
    if (!o.alive) { this.leave(); return; }
    const d = Math.sign(o.x - this.x) || 1, h = Math.hypot(this.vx, this.vy) || 6;
    this.state = 'leave'; this.attack = null;
    this.fly({ x: this.x + this.vx * 10, y: this.y + this.vy * 10 - 120 }, { x: o.x - d * 260, y: o.y - 320 }, { x: o.x, y: o.y - TANK_H }, Math.max(h, 10), 6);
  }

  // off it goes: up and away out of sight
  leave() {
    const d = this.dir || 1;
    this.state = 'leave'; this.attack = null;
    this.fly({ x: this.x + d * 160 + this.vx * 6, y: this.y + this.vy * 6 }, { x: this.x + d * 420, y: this.y - 240 }, { x: this.x + d * 760, y: this.group.ceil - 260 }, Math.max(6, Math.hypot(this.vx, this.vy)), 13);
  }

  draw(ctx) {
    if (!this.alive || this.state === 'wait' || this.state === 'out') return;
    const L = PLANE_LOOK[this.prop ? 'prop' : this.kind] || PLANE_LOOK.dive, f = this.dir || 1, S = PLANE_S;
    const len = L.len, half = len / 2;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y - 8));
    ctx.rotate(f > 0 ? this.ang : -this.ang);
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
    // the lift fan in the middle of the fuselage: a ring under the wing, blades flickering
    box(-5, 3, 10, 2, 'rgb(40,42,48)');
    for (let k = 0; k < 4; k++) if ((k + spin) % 2) box(-4 + k * 2, 3, 1, 2, 'rgb(150,152,160)');
    if (this.state === 'hover' || (this.state === 'launch' && !this.group.deck)) box(-5, 5, 10, 3 + spin * 2, `rgba(200,230,255,${0.25 + 0.15 * spin})`);
    // what it carries until it lets go
    if (this.ord > 0 || this.state !== 'attack') {
      if (this.kind === 'torpedo') box(-10, 4, 18, 2, 'rgb(60,62,70)');
      else if (this.kind === 'rocket') { box(-6, 4, 5, 2, 'rgb(214,216,202)'); box(4, 4, 5, 2, 'rgb(214,216,202)'); }
      else if (this.kind === 'heavy') box(-6, 4, 14, 4, 'rgb(36,40,60)');
      else if (this.kind !== 'fighter') box(-3, 4, 7, 3, 'rgb(46,46,52)');
    }
    ctx.restore();
    if (this.hp < this.maxHp) { // health under a damaged plane
      const x = Math.round(this.x), y = Math.round(this.y - 8);
      ctx.fillStyle = 'rgba(14,12,22,0.7)'; ctx.fillRect(x - 16, y + 16, 32, 4);
      ctx.fillStyle = this.owner.color; ctx.fillRect(x - 16, y + 16, Math.round(32 * clamp(this.hp / this.maxHp, 0, 1)), 4);
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

// The attack, at the start of its owner's turn: one plane after another, PLANE_STAGGER apart
// (any still on their way in join when they arrive).
class AirStrike {
  constructor(game, groups) {
    this.game = game; this.groups = groups; this.t = 0;
    this.queue = [];
    for (const G of groups) {
      // it pursues its target: the one it locked last time if still alive, else the nearest rival
      // near where it was (rivals first, then hostiles)
      if (!(G.target && G.target.alive)) {
        let best = null, bd = 420;
        for (const e of game.targets()) {
          if (!e.alive || e === G.owner || e.isSat || e.isPlane || (e.isMob && e.flying)) continue;
          const d = Math.abs(e.x - G.mark.x) + (e.isMob ? 200 : 0);
          if (d < bd) { bd = d; best = e; }
        }
        G.target = best;
      }
      if (G.target) G.mark = { x: G.target.x, y: G.target.y };
      for (const p of G.planes) if (p.alive && p.state !== 'attack' && p.state !== 'leave') { p.strikeDone = false; this.queue.push(p); } // (any still on the way join when they arrive)
    }
    this.queue.forEach((p, i) => { p.go = i * PLANE_STAGGER; });
    this.focus = { x: groups[0].mark.x, y: groups[0].mark.y - 160 };
    this.game = game;
  }

  update() {
    const g = this.game;
    this.t++;
    for (const p of this.queue) if (p.alive && !p.strikeDone && p.state === 'hover' && this.t >= p.go) startAttack(g, p);
    g.cam.follow(this.focus);
    return this.queue.some((p) => p.alive && !p.strikeDone) && this.t < 60 * 16;
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

// a plane's attack run along its approach line, by type; each ends with it flying off
function startAttack(g, p) {
  const G = p.group, m = G.mark, side = G.side;
  p.state = 'attack';
  p.t = 0;
  p.ord = G.w.fleet ? (p.kind === 'fighter' ? 6 : 1) : G.w.air.ord;
  const gunDmg = G.w.dmg * G.mult * (G.w.fleet ? 0.15 : 1); // a fighter's burst (a fleet's are a fraction of its bombs)
  // the seeker: the nearest rival within reach of the mark (else a hostile), where it is now
  const reach = (G.w.air.seek || AIR_SEEK[p.kind] || 240);
  let lock = null, best = Infinity;
  for (const e of g.targets()) {
    if (!e.alive || e === p.owner || e.isSat || e.isPlane || (e.isMob && e.flying && p.kind !== 'fighter')) continue;
    const d = Math.abs(e.x - m.x) + (e.isMob ? reach * 0.5 : 0); // (rivals first)
    if (Math.abs(e.x - m.x) < reach && d < best) { best = d; lock = e; }
  }
  p.lock = lock;
  const aim = lock ? lock.x : m.x;
  const jit = (rng.next() - 0.5) * (G.w.disp * 14 + (lock ? 10 : 30)) + (p.i - (G.planes.length - 1) / 2) * (lock ? 6 : 10);
  const gx = clamp(aim + jit, 4, WORLD_W - 4), gy = g.terrain.hAt(gx);
  const a = rad(AIR_ANGLE[p.kind] || 60), ax = Math.cos(a) * side, ay = Math.sin(a); // the approach line, toward the mark
  const at = (r) => ({ x: gx - ax * r, y: gy - ay * r }); // a point r back up the line from the mark
  const heading = () => { const sp = Math.hypot(p.vx, p.vy) || 1; return { x: p.vx / sp, y: p.vy / sp, sp }; };
  if (p.kind === 'dive' || p.kind === 'heavy') {
    // roll in and dive down the line, letting go at the bottom at the dive's speed (kinetic), then pull out
    const heavy = p.kind === 'heavy';
    const rel = at(heavy ? 230 : 190);
    let drop = -1;
    p.fly({ x: p.x + side * 50, y: p.y - 70 }, at(heavy ? 420 : 360), rel, 5, heavy ? 18 : 22, () => {
      drop = 0;
      const h = heading();
      p.fly({ x: p.x + h.x * 120, y: p.y + h.y * 120 }, { x: p.x + side * 260, y: p.y + 10 }, { x: p.x + side * 520, y: p.y - 180 }, h.sp, 12, () => p.endPass());
    });
    p.attack = () => {
      if (drop < 0 || p.ord <= 0) return;
      if (drop++ % 5) return;
      p.ord--;
      const h = heading(), sp = Math.min(22, h.sp);
      const guide = heavy ? { arm: 2, burn: 300, seek: 999, apex: false, turn: 5, range: G.w.air.seek || 220, cone: 180, lift: 0.4, brake: false } : BOMB_GUIDE;
      const b = new Projectile(g, planeOrd(G, { kin: DIVE_KIN, ...(guide ? { guide, visR: G.w.dmgR * 2.2 } : {}) }), p.owner, p.x, p.y + 6, h.x * sp, h.y * sp, p.i === 0);
      b.launch = Math.PI / 2;
      b.prefer = 'rival'; b.wseed = rng.int(0, 1e9);
      g.projectiles.push(b);
      g.sfx.click();
    };
  } else if (p.kind === 'torpedo') {
    // a long shallow descent down the line to skimming height, the torpedo off 220 short, then away
    const low = { x: clamp(gx - side * 220, 10, WORLD_W - 10) };
    low.y = g.terrain.hAt(low.x) - 34;
    p.fly(at(520), { x: low.x - side * 180, y: low.y - 10 }, low, 8, 12, () => {
      if (p.ord > 0) { p.ord--; g.projectiles.push(new Torpedo(g, p.owner, planeOrd(G), p.x, side)); g.sfx.click(); }
      p.fly({ x: p.x + side * 140, y: p.y - 6 }, { x: p.x + side * 320, y: p.y - 120 }, { x: p.x + side * 600, y: p.y - 420 }, 12, 12, () => p.endPass());
    });
    p.attack = () => {};
  } else if (p.kind === 'rocket') {
    // down the line to firing range, rockets off along the heading, then a climbing break
    let fire = -1;
    p.fly({ x: p.x + side * 40, y: p.y - 30 }, at(420), at(260), 6, 14, () => {
      fire = 0;
      const h = heading();
      p.fly({ x: p.x + h.x * 140, y: p.y + h.y * 140 }, { x: p.x + side * 260, y: p.y - 40 }, { x: p.x + side * 560, y: p.y - 300 }, h.sp, 12, () => p.endPass());
    });
    p.attack = () => {
      if (fire < 0 || p.ord <= 0 || fire++ % 6) return;
      p.ord--;
      const h = heading();
      const r = new Projectile(g, { ...planeOrd(G), kind: 'rocket', guide: G.w.guide }, p.owner, p.x, p.y + 6, h.x * 9, h.y * 9, p.i === 0);
      r.launch = Math.PI / 3;
      g.projectiles.push(r);
      g.sfx.click();
    };
  } else { // fighter: aircraft near the mark first (it turns after them), else a strafing run down the line
    const air = g.aaAircraft(p.owner).filter((e) => e !== p && e.alive && Math.abs(e.center().x - m.x) < 520 && (!e.isPlane || e.owner !== p.owner));
    let k = 0, strafing = false;
    p.attack = () => {
      k++;
      const prey = air.find((e) => e.alive);
      if (prey && !strafing) { // dogfight: steer onto it at a turn rate, guns in bursts
        const q = prey.center();
        const sp = 11, cur = Math.atan2(p.vy || 0.01, p.vx || p.dir), want = Math.atan2(q.y - 30 - p.y, q.x - p.x);
        let d = want - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const h = cur + clamp(d, -0.12, 0.12);
        p.vx = Math.cos(h) * sp; p.vy = Math.sin(h) * sp; p.x += p.vx; p.y += p.vy;
        if (k % 4 === 0 && p.ord > 0 && dist(p.x, p.y, q.x, q.y) < 300) {
          p.ord--;
          g.lasers.push(new Laser(p.x, p.y, q.x, q.y, '#ffe8a0', 2, 6));
          if (rng.next() < 0.85) g.damage(prey, gunDmg * 3, p.owner, { aa: true });
        }
        if (p.ord <= 0 || k > 240) p.endPass();
        return;
      }
      if (!strafing) { // down the line and along the ground past the mark
        strafing = true;
        const s0 = at(300), s1 = { x: clamp(gx + side * 280, 10, WORLD_W - 10) };
        s1.y = g.terrain.hAt(s1.x) - 80;
        p.fly(s0, { x: gx - side * 120, y: gy - 90 }, s1, 9, 12, () => p.endPass());
      }
      if (k % 4 === 0 && p.ord > 0 && Math.abs(p.x - m.x) < 240 && p.path) {
        p.ord--;
        const h = heading();
        g.projectiles.push(new Projectile(g, { ...planeOrd(G), kind: 'gun', drift: 0.1, dmg: gunDmg }, p.owner, p.x, p.y + 4, h.x * 14, Math.max(4, h.y * 14 + 6), false));
      }
    };
  }
}

Object.assign(Game.prototype, {
  // the dot has landed: a squad takes off from the shooter
  launchSquad(p) {
    const t = p.owner, w = p.w, A = w.air;
    const deck = hasTrait(t, 'flightdeck') || (t.upgrades && t.upgrades.deck > 0);
    const n = A.planes + (hasTrait(t, 'flightdeck') ? 1 : 0);
    const mark = { x: clamp(p.x, 20, WORLD_W - 20), y: Math.min(p.y, this.terrain.hAt(clamp(p.x, 0, WORLD_W - 1))) };
    const G = this.makeGroup(t, w, mark, { deck, kinds: Array(n).fill(A.type), delay: A.delay || 1 });
    const muzzle = t.muzzle();
    this.lasers.push(new Laser(muzzle.x, muzzle.y, p.x, p.y, '#ff3a4a', 2, 26));
    this.particles.text(mark.x, mark.y - 30, `${n} ${A.type === 'fighter' ? 'fighters' : 'planes'} inbound`, '#ffd0d4');
    this.events.push(`${t.name} calls a squad of ${n} onto the mark.`);
    // (the squad flies out in the background: the turn moves on as soon as the dot is down)
    return G;
  },

  // a group of planes for one mark: where they hover, which side they come in from, when they hit
  makeGroup(owner, w, mark, o) {
    const ceil = Math.min(-300, this.cam.ceil === undefined ? -600 : this.cam.ceil + 100);
    let top = Infinity;
    for (let dx = -160; dx <= 160; dx += 20) top = Math.min(top, this.terrain.hAt(clamp(mark.x + dx, 0, WORLD_W - 1)));
    const side = owner.x <= mark.x ? 1 : -1; // they come in from the owner's side (torpedoes run away from her)
    const n = o.kinds.length;
    const G = {
      owner, w, mark, side, ceil, deck: o.deck, mult: o.deck ? 1 : VTOL_MULT, hp: o.hp || w.air.hp,
      due: (owner.turnsTaken || 0) + o.delay, delay: o.delay, planes: [],
      dueTurn: (this.turnCount || 0) + Math.max(1, this.tanks.filter((x) => x.alive).length) * o.delay, // (if she's gone by then: about when her turn would have come)
      hoverY: Math.max(ceil + 120, top - PLANE_HOVER),
      dir: owner.facing || 1,
      from: o.from || { x: owner.x, y: owner.y - TANK_H * 0.8 },
    };
    // each waits back along its approach line: dive bombers nearly overhead, low attackers far out
    // and shallow; a squad in a line across it, a fleet in rows by type
    const byKind = {};
    o.kinds.forEach((k, i) => { (byKind[k] || (byKind[k] = [])).push(i); });
    G.slot = (i) => {
      const kind = o.kinds[i], list = byKind[kind], k = list.indexOf(i), n2 = list.length;
      const a = rad(AIR_ANGLE[kind] || 60), R = clamp(PLANE_HOVER / Math.sin(a), 300, 680);
      const row = Math.floor(k / 8), m = Math.min(8, n2 - row * 8), kk = k % 8;
      const x = clamp(mark.x - side * Math.cos(a) * R + (kk - (m - 1) / 2) * PLANE_GAP, 20, WORLD_W - 20);
      let y = Math.min(mark.y, top) - Math.sin(a) * R - row * 34 - (kk % 2) * 14;
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
      if (G.planes.some((p) => p.alive)) return true;
      // all home (or shot down): the weapon rearms for its turns
      const o = G.owner;
      o.deployed[G.w.id] = false;
      if (o.alive) o.reload[G.w.id] = reloadOf(G.w) + 1;
      return false;
    });
  },

  // start of a turn: squads whose owner is gone turn for home; this owner's due squads strike.
  // Returns true if a strike took the turn over (finishShot hands it back to her).
  startStrikes(t) {
    // a squad whose girl is gone stays on as a hazard and strikes about when her turn would have come
    const due = this.airGroups.filter((G) => !G.striking && (G.owner.alive ? G.owner === t && (t.turnsTaken || 0) >= G.due : this.turnCount >= G.dueTurn)
      && G.planes.some((p) => p.alive && p.state !== 'attack' && p.state !== 'leave'));
    if (!due.length) return false;
    this.phase = 'resolve';
    this.strikeResolve = true;
    this.resolveSteps = 0;
    this.quiet = 0;
    this.salvo = null;
    this.report = { shooter: t, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
    this.projectiles.push(new AirStrike(this, due));
    for (const G of due) { G.striking = true; G.struck = true; }
    const who = [...new Set(due.map((G) => G.owner.name))].join(' and ');
    this.events.push(`${who}'s planes attack.`);
    this.ui.notice(`${who}'s squadron attacks!`);
    this.ui.turn(t);
    return true;
  },

  damagePlane(p, amt, owner, def, hit) {
    if (!p.alive || p.owner === owner) return;
    if (def && (def.kind === 'flak' || def.airburst)) { amt *= FLAK_MOB_MULT; if (hit) hit.flak = true; }
    p.hp -= amt;
    p.flash = 1;
    if (hit) this.hitPopup(p.x, p.y - 26, amt, hit, p);
    else this.particles.text(p.x, p.y - 26, String(Math.round(amt)), '#ffffff');
    if (p.hp > 0) return;
    p.alive = false; // (no bounty: they're somebody's planes)
    const c = p.center();
    this.particles.explosion(c.x, c.y, 50, 'shell');
    for (let i = 0; i < 8; i++) this.particles.add({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, g: 0.25, drag: 0.98, life: 1.2 + Math.random(), size: 3 + Math.random() * 4, color: i % 2 ? [60, 60, 64] : [255, 160, 80] });
    this.sfx.explosion(14);
    this.events.push(`${owner ? owner.name : 'Something'} shot down one of ${p.owner.name}'s planes.`);
  },

  // the marks: a ring on the ground under each waiting squad, in its owner's colour, so its
  // target knows to move
  drawPlanes(ctx) {
    if (!this.planes) return;
    for (const G of this.airGroups) {
      if (G.striking || !G.planes.some((p) => p.alive && (p.state === 'hover' || p.state === 'inbound'))) continue;
      const m = G.mark, r = Math.max(50, G.w.dmgR), a = 0.55 + 0.3 * Math.sin(this.time * 4);
      const gy = this.terrain.hAt(clamp(m.x, 0, WORLD_W - 1));
      ctx.fillStyle = G.owner.color;
      ctx.globalAlpha = a;
      for (let k = -8; k <= 8; k++) { // the strike zone along the ground
        const x = m.x + (k / 8) * r;
        sq(ctx, x, this.terrain.hAt(clamp(x, 0, WORLD_W - 1)) - 3, Math.abs(k) === 8 ? 10 : 5);
      }
      const c = squadCentre(G); // and a dotted line from the squad down its approach to the mark
      if (c) { const d = dist(c.x, c.y, m.x, gy); for (let u = 40; u < d - 20; u += 22) sq(ctx, lerp(c.x, m.x, u / d), lerp(c.y, gy, u / d), 3); }
      ctx.fillStyle = '#ffffff';
      sq(ctx, m.x, gy - 3, 4);
      ctx.globalAlpha = 1;
    }
    for (const p of this.planes) p.draw(ctx);
    this.drawAA(ctx);
  },

  // HUD: what each waiting squad is and when it hits
  drawPlaneLabels(ctx, cam) {
    if (!this.airGroups) return;
    ctx.font = `11px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    for (const G of this.airGroups) {
      const live = G.planes.filter((p) => p.alive && p.state === 'hover');
      if (!live.length || G.striking) continue;
      const left = Math.max(0, G.due - (G.owner.turnsTaken || 0));
      const passes = Math.max(...live.map((p) => p.passes));
      const txt = `${G.owner.name} · ${live.length} plane${live.length > 1 ? 's' : ''} · ${passes} pass${passes > 1 ? 'es' : ''} left · ${left <= 1 ? 'strikes next turn' : `strikes in ${left} turns`}`;
      const c = squadCentre(G);
      const x = Math.round(cam.sx(c.x)), y = Math.round(cam.sy(c.y - 40) - 30);
      const w = ctx.measureText(txt).width + 12;
      ctx.fillStyle = 'rgba(14,12,22,0.72)'; ctx.fillRect(x - w / 2, y - 11, w, 15);
      ctx.fillStyle = G.owner.color; ctx.fillRect(x - w / 2, y - 11, 3, 15);
      ctx.fillStyle = '#e8e4f4'; ctx.fillText(txt, x, y);
    }
  },
});

// ------------------------------------------------------------------------------ the fleet
// Zuihou's Kidō Butai: her dot is for the carriers off the coast. The camera whips out to sea past
// the edge of the map behind her: three carriers turn into the wind and launch their whole air
// wing (dive bombers, torpedo bombers, fighters), which climbs away, comes back over the mark and
// hovers there in a great formation. It strikes two of her turns later, if anything is left of it.
const KIDO = { OUT: 46, LAUNCH: 56, BACK: 230, BACK_END: 272, END: 640 };
const KIDO_OFF = 1500; // the nearest carrier, past the edge of the map
const KIDO_GAP = 760;

class FleetStrike {
  constructor(game, owner, at, w) {
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
      deck: true, kinds, delay: w.air.delay || 2, hp: w.air.hp, wait: KIDO.LAUNCH, stagger: 6,
      place: (pl, i) => {
        const s = this.ships[i % this.ships.length];
        pl.from = { x: s.x + side * s.len * 0.38, y: this.seaY - 62 }; // the carrier's stern
        pl.launchDir = -side; // toward the land
        pl.x = pl.from.x; pl.y = pl.from.y;
      },
    });
    this.zoom0 = game.cam.zoom;
    this.focus = { x: mark.x, y: mark.y - 160 };
    this.view = { x: this.ships[1 % this.ships.length].x, y: this.seaY - 300 };
    game.cam.wide = KIDO_OFF + KIDO_GAP * F.carriers + 900;
    game.cam.follow(this.focus);
    game.ui.notice('Kidō Butai: the carriers turn into the wind.');
    game.events.push(`${owner.name} calls the Kidō Butai: ${kinds.length} aircraft are coming.`);
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
    if (t >= KIDO.BACK_END + 20) { cam.wide = 0; return false; } // (the air wing flies on in while play goes on)
    return true;
  }

  // the sea past the edge of the map, the coast, and the carriers steaming into the wind (behind
  // everything, so the planes take off over them)
  drawBack(ctx) {
    const g = this.game, side = this.side, e = this.edge, time = g.time;
    const x0 = side < 0 ? e - 6000 : e, x1 = side < 0 ? e : e + 6000;
    ctx.fillStyle = g.terrain.color;
    ctx.fillRect(side < 0 ? e - 160 : e, this.coast, 160, this.seaY - this.coast + 10); // the cliff down to the sea
    ctx.fillStyle = 'rgb(34,62,92)';
    ctx.fillRect(x0, this.seaY, x1 - x0, WORLD_BOTTOM + 400 - this.seaY);
    ctx.fillStyle = 'rgb(58,96,128)';
    for (let k = 0; k < 60; k++) { // swell
      const x = x0 + ((k * 137 + time * 30) % (x1 - x0)), y = this.seaY + 6 + (k % 7) * 18;
      ctx.fillRect(Math.round(x), Math.round(y), 40 + (k % 5) * 12, 3);
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
    ctx.fillText(`${n} AIRCRAFT  ·  STRIKE IN ${this.group.delay} TURNS`, W / 2, y + 15);
  }
}
