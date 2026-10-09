'use strict';
// Planes (Sengoku Inc.; the weapons are in weapons.js, kind 'air'). The gun is a laser designator:
// where its dot lands, a squad takes off from her (along a flight deck, or straight up on its lift
// fan: VTOL, 30% softer), climbs out of sight, comes back in at an angle and hovers over the mark.
// There it waits, and anyone can shoot it (shells, flak, AA mounts) for a round of turns. At the
// start of its owner's next turn (a strike fleet: the one after) the squad attacks, then flies off.
// A squad whose owner is destroyed turns for home. Shooting planes down pays nothing.
// Planes are side-on airframes with a lift fan in the middle of the fuselage, built of boxes.

const PLANE_S = 1.35; // drawing scale (the boxes below are in unscaled units)
const PLANE_HW = 22; // hitbox half-width
const PLANE_HH = 16;
const PLANE_SPEED = 9; // cruise, world units a frame
const PLANE_STAGGER = 14; // frames between take-offs
const PLANE_HOVER = 280; // hover height over the highest ground near the mark (above the short-range AA)
const PLANE_GAP = 44; // between planes in a squad's line
const AIR_LAUNCH_MAX = 60 * 9; // a launch never holds the turn longer than this
const TORPEDO_SPEED = 7;
const TORPEDO_RUN = 760; // how far a torpedo runs before it goes off anyway

// how a type looks: body colours, size, ordnance under it, jet or prop
const PLANE_LOOK = {
  dive: { body: [62, 88, 58], belly: [176, 176, 160], len: 30 },
  torpedo: { body: [70, 96, 70], belly: [180, 180, 166], len: 34 },
  fighter: { body: [196, 194, 174], belly: [214, 212, 196], len: 26 },
  rocket: { body: [88, 104, 80], belly: [190, 190, 176], len: 30 },
  heavy: { body: [42, 52, 84], belly: [92, 104, 138], len: 38, stripe: [90, 216, 200] },
};

class Plane {
  constructor(game, group, i, kind, delay) {
    this.isPlane = true;
    this.game = game;
    this.group = group;
    this.owner = group.owner;
    this.w = group.w;
    this.kind = kind; // dive | torpedo | fighter | rocket | heavy
    this.jet = !!(group.w.air && group.w.air.jet) || kind === 'heavy';
    this.hp = this.maxHp = group.hp;
    this.armour = 0;
    this.hw = PLANE_HW; this.hh = PLANE_HH;
    this.alive = true;
    this.i = i;
    this.delay = delay;
    this.state = 'wait';
    this.t = 0;
    this.vx = 0; this.vy = 0;
    this.flash = 0;
    this.dir = group.dir;
    this.x = group.from.x; this.y = group.from.y;
  }

  get name() { return `${this.owner.name}'s ${this.w.name.replace(/^.*'(.*)'.*$/, '$1')}`; }
  // shootable while it is in the sky over the map (not before take-off, nor while out of sight)
  get targetable() { return this.alive && this.state !== 'wait' && this.state !== 'out'; }
  center() { return { x: this.x, y: this.y - this.hh / 2 }; }

  update() {
    const g = this.game, G = this.group;
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
    if (!this.alive) return;
    const goTo = (x, y, sp) => {
      const dx = x - this.x, dy = y - this.y, d = Math.hypot(dx, dy);
      if (d < sp) { this.x = x; this.y = y; this.vx = this.vy = 0; return true; }
      this.vx = (dx / d) * sp; this.vy = (dy / d) * sp;
      this.x += this.vx; this.y += this.vy;
      if (Math.abs(dx) > 2) this.dir = Math.sign(dx);
      return false;
    };
    switch (this.state) {
      case 'wait':
        if (--this.delay <= 0) { const F = this.from || G.from; this.state = 'launch'; this.t = 0; this.x = F.x; this.y = F.y; this.dir = this.launchDir || this.dir; if (this.i % 3 === 0) g.sfx.click(); }
        break;
      case 'launch':
        if (G.deck) { // along the deck, then up
          this.vx = this.dir * Math.min(7, 1 + this.t * 0.4);
          this.vy = this.t < 14 ? 0 : -Math.min(6, (this.t - 14) * 0.5);
        } else { // VTOL: straight up on the lift fan, then away
          this.vx = this.t < 30 ? 0 : this.dir * Math.min(6, (this.t - 30) * 0.3);
          this.vy = -Math.min(3.5, 0.6 + this.t * 0.12);
          if (this.t % 3 === 0) g.particles.add({ x: this.x + (Math.random() - 0.5) * 8, y: this.y + 6, vx: (Math.random() - 0.5) * 2, vy: 1.5, g: 0, drag: 0.9, life: 0.4, size: 4 + Math.random() * 4, color: [210, 210, 214] });
        }
        this.x += this.vx; this.y += this.vy;
        if (this.t > 34) { this.state = 'climb'; this.t = 0; }
        break;
      case 'climb':
        this.vx = this.dir * 7; this.vy = -9;
        this.x += this.vx; this.y += this.vy;
        if (this.y < G.ceil) { this.state = 'out'; this.t = 0; }
        break;
      case 'out': // out of sight: it comes back in from high up, at an angle, off to one side
        if (this.t > 24) {
          this.state = 'inbound';
          this.t = 0;
          const s = G.slot(this.i);
          this.x = s.x - G.side * 700;
          this.y = s.y - 640;
          this.dir = G.side;
        }
        break;
      case 'inbound': {
        const s = G.slot(this.i);
        if (goTo(s.x, s.y + Math.sin(this.t / 20 + this.i) * 3, PLANE_SPEED * (this.t < 40 ? 1.3 : 1))) { this.state = 'hover'; this.t = 0; this.dir = G.side; }
        break;
      }
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
      case 'leave':
        this.vx = this.dir * 8; this.vy = -7;
        this.x += this.vx; this.y += this.vy;
        if (this.y < G.ceil - 200 || this.x < -400 || this.x > WORLD_W + 400) this.alive = false; // home (not shot down)
        break;
    }
  }

  draw(ctx) {
    if (!this.alive || this.state === 'wait' || this.state === 'out') return;
    const L = PLANE_LOOK[this.kind] || PLANE_LOOK.dive, f = this.dir || 1;
    const x = Math.round(this.x), y = Math.round(this.y - 8); // fuselage centre line
    const len = L.len, half = len / 2, S = PLANE_S;
    const box = (lx, ty, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(f > 0 ? x + lx * S : x - (lx + w) * S), Math.round(y + ty * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S))); };
    const c = (v, k = 1) => rgb(v.map((u) => clamp(u * k, 0, 255)));
    const hot = this.flash > 0.3;
    // tail fin and stabiliser
    box(-half, -9, 4, 9, c(L.body, 0.85));
    box(-half - 2, -2, 10, 2, c(L.body, 0.8));
    // fuselage: top colour over a pale belly, the nose cowl, the canopy
    box(-half, -3, len, 4, hot ? '#ffffff' : c(L.body));
    box(-half + 2, 1, len - 4, 3, hot ? '#ffffff' : c(L.belly));
    box(half - 4, -3, 4, 6, c(L.body, 0.6));
    box(2, -6, 8, 3, 'rgb(168,214,236)');
    // the wing, and the player's colour on the fin and the wing root
    box(-6, 0, 18, 2, c(L.body, 0.7));
    box(-half, -8, 3, 3, this.owner.color);
    box(0, 0, 4, 2, this.owner.color);
    if (L.stripe) box(-half + 4, -1, len - 10, 1, rgb(L.stripe)); // NXi aurora stripe
    // the lift fan in the middle of the fuselage: a ring under the wing, blades flickering
    const spin = (this.t >> 1) % 2;
    box(-5, 3, 10, 2, 'rgb(40,42,48)');
    for (let k = 0; k < 4; k++) if ((k + spin) % 2) box(-4 + k * 2, 3, 1, 2, 'rgb(150,152,160)');
    const hovering = this.state === 'hover' || this.state === 'launch' || (this.state === 'inbound' && this.t > 30);
    if (hovering) box(-5, 5, 10, 3 + spin * 2, `rgba(200,230,255,${0.25 + 0.15 * spin})`);
    // the engine: a propeller disc at the nose, or a jet's glowing tailpipe
    if (this.jet) {
      box(-half - 3, -2, 3, 3, 'rgb(255,170,90)');
      if (this.t % 4 < 2) box(-half - 6, -1, 3, 1, 'rgba(255,220,160,0.8)');
    } else {
      box(half, -6 + (spin ? 0 : 2), 1, spin ? 12 : 8, 'rgba(60,60,64,0.7)');
    }
    // what it carries until it lets go
    if (this.ord > 0) {
      if (this.kind === 'torpedo') box(-10, 4, 18, 2, 'rgb(60,62,70)');
      else if (this.kind === 'rocket') { box(-6, 4, 5, 2, 'rgb(214,216,202)'); box(4, 4, 5, 2, 'rgb(214,216,202)'); }
      else if (this.kind !== 'fighter') box(-3, 4, 7, 3, 'rgb(46,46,52)');
    }
    // health under a damaged plane
    if (this.hp < this.maxHp) {
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

// The take-off: holds the turn (as a projectile in flight would) until the squad is hovering
// over its mark, with the camera on the first plane up, then on the mark as they come back in.
class AirLaunch {
  constructor(game, group) { this.game = game; this.group = group; this.t = 0; }
  update() {
    const g = this.game, P = this.group.planes;
    this.t++;
    const up = P.find((p) => p.alive && (p.state === 'launch' || p.state === 'climb'));
    if (up && this.t < 90) g.cam.follow(up);
    else g.cam.follow({ x: this.group.mark.x, y: this.group.hoverY + 60 });
    const busy = P.some((p) => p.alive && p.state !== 'hover');
    return busy && this.t < AIR_LAUNCH_MAX;
  }
  draw() {}
}

// The attack, at the start of its owner's turn: one plane after another, PLANE_STAGGER apart.
class AirStrike {
  constructor(game, groups) {
    this.game = game; this.groups = groups; this.t = 0;
    this.queue = [];
    for (const G of groups) for (const p of G.planes) if (p.alive && p.state === 'hover') this.queue.push(p);
    this.queue.forEach((p, i) => { p.go = i * PLANE_STAGGER; });
    this.focus = { x: groups[0].mark.x, y: groups[0].hoverY + 80 };
  }

  update() {
    const g = this.game;
    this.t++;
    for (const p of this.queue) {
      if (p.alive && p.state === 'hover' && this.t >= p.go) startAttack(g, p);
    }
    g.cam.follow(this.focus);
    return this.queue.some((p) => p.alive && (p.state === 'hover' || p.state === 'attack')) && this.t < 60 * 12;
  }
  draw() {}
}

// what a plane's ordnance does, as a projectile's weapon (dmg is per bomb, rocket or burst)
function planeOrd(G, extra = {}) {
  const w = G.w;
  return { id: w.id + '_ord', name: w.name, kind: 'shell', ord: true, jet: !!(w.air && w.air.jet), dmg: w.dmg * G.mult, dmgR: w.dmgR, explR: w.explR,
    salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: w.rarity, maxCharge: 10, drift: 0.25, ...extra };
}

// a plane's attack run, by type; each ends with the plane flying off (state 'leave')
function startAttack(g, p) {
  const G = p.group, m = G.mark;
  p.state = 'attack';
  p.t = 0;
  p.ord = G.w.fleet ? (p.kind === 'fighter' ? 6 : 1) : G.w.air.ord;
  const gunDmg = G.w.dmg * G.mult * (G.w.fleet ? 0.15 : 1); // a fighter's burst (a fleet's are a fraction of its bombs)
  const jit = (rng.next() - 0.5) * (G.w.disp * 22 + 30) + (p.i - (G.planes.length - 1) / 2) * 10;
  const gx = clamp(m.x + jit, 4, WORLD_W - 4);
  const ground = () => g.terrain.hAt(clamp(p.x, 0, WORLD_W - 1));
  const leave = () => { p.state = 'leave'; p.t = 0; };
  const fly = (x, y, sp) => {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d < sp) { p.x = x; p.y = y; return true; }
    p.vx = (dx / d) * sp; p.vy = (dy / d) * sp; p.x += p.vx; p.y += p.vy;
    if (Math.abs(dx) > 2) p.dir = Math.sign(dx);
    return false;
  };
  if (p.kind === 'dive' || p.kind === 'heavy') {
    let phase = 0;
    p.attack = () => {
      if (phase === 0 && fly(gx, p.y, 10)) { phase = 1; g.sfx.click(); }
      else if (phase === 1) { // the dive: down to bombing height
        p.vy = Math.min(12, (p.vy || 0) + 0.8); p.vx = 0; p.y += p.vy;
        if (p.y >= g.terrain.hAt(clamp(gx, 0, WORLD_W - 1)) - 110) phase = 2;
      } else if (phase >= 2) { // let go (a bomb every 5 frames), then pull up
        if (p.ord > 0 && (phase - 2) % 5 === 0) {
          p.ord--;
          const guide = p.kind === 'heavy' ? { arm: 2, burn: 300, seek: 999, apex: false, turn: 5, range: G.w.air.seek || 220, cone: 180, lift: 0.85, brake: false } : null;
          const b = new Projectile(g, planeOrd(G, guide ? { guide } : {}), p.owner, p.x, p.y + 6, p.dir * 0.4 + (rng.next() - 0.5) * 0.6, 7, p.i === 0);
          b.launch = Math.PI / 2;
          if (guide) { b.prefer = 'rival'; b.wseed = rng.int(0, 1e9); }
          g.projectiles.push(b);
        }
        phase++;
        p.vy = Math.max(-8, p.vy - 2); p.y += p.vy;
        if (phase > 2 + 5 * G.w.air.ord + 8) leave();
      }
    };
  } else if (p.kind === 'torpedo') {
    const side = G.side, sx = clamp(gx - side * 300, 10, WORLD_W - 10);
    let phase = 0;
    p.attack = () => {
      if (phase === 0 && fly(sx, g.terrain.hAt(sx) - 36, 11)) { phase = 1; p.dir = side; }
      else if (phase === 1) { // skimming in: the torpedo goes in the water (the ground) 200 short
        p.x += side * 8; p.y = ground() - 34;
        if (p.ord > 0 && side * (p.x - (gx - side * 210)) >= 0) {
          p.ord--;
          g.projectiles.push(new Torpedo(g, p.owner, planeOrd(G), p.x, side));
          g.sfx.click();
          phase = 2;
        }
        if (p.x < 0 || p.x > WORLD_W) leave();
      } else if (phase === 2) leave();
    };
  } else if (p.kind === 'rocket') {
    const sx = clamp(gx - G.side * 160, 10, WORLD_W - 10);
    let phase = 0;
    p.attack = () => {
      if (phase === 0 && fly(sx, Math.min(p.y, g.terrain.hAt(sx) - 220), 10)) { phase = 1; p.dir = G.side; }
      else if (phase >= 1) {
        if (p.ord > 0 && (phase - 1) % 6 === 0) {
          p.ord--;
          const r = new Projectile(g, { ...planeOrd(G), kind: 'rocket', guide: G.w.guide }, p.owner, p.x, p.y + 6, G.side * 5, 3.5, p.i === 0);
          r.launch = Math.PI / 3;
          g.projectiles.push(r);
          g.sfx.click();
        }
        phase++;
        if (phase > 1 + 6 * G.w.air.ord + 6) leave();
      }
    };
  } else { // fighter: aircraft near the mark first, else a strafing run along it
    const air = g.aaAircraft(p.owner).filter((e) => e !== p && e.alive && Math.abs(e.center().x - m.x) < 520 && (!e.isPlane || e.owner !== p.owner));
    let phase = 0;
    p.attack = () => {
      phase++;
      const prey = air.find((e) => e.alive);
      if (prey) { // dogfight: close in, guns
        const q = prey.center();
        fly(q.x - p.dir * 90, q.y - 30, 11);
        if (phase % 4 === 0 && p.ord > 0) {
          p.ord--;
          g.lasers.push(new Laser(p.x, p.y, q.x, q.y, '#ffe8a0', 2, 6));
          if (rng.next() < 0.85) g.damage(prey, gunDmg * 3, p.owner, { aa: true });
        }
        if (p.ord <= 0 || phase > 220) leave();
        return;
      }
      if (!p.strafe) p.strafe = { x0: clamp(m.x - G.side * 260, 10, WORLD_W - 10) };
      if (!p.strafe.on) { if (fly(p.strafe.x0, g.terrain.hAt(p.strafe.x0) - 90, 11)) { p.strafe.on = true; p.dir = G.side; } return; }
      p.x += G.side * 7; p.y = Math.min(p.y, ground() - 80);
      if (phase % 4 === 0 && p.ord > 0 && Math.abs(p.x - m.x) < 220) {
        p.ord--;
        const b = new Projectile(g, { ...planeOrd(G), kind: 'gun', drift: 0.1, dmg: gunDmg }, p.owner, p.x, p.y + 4, G.side * 8, 9, false);
        g.projectiles.push(b);
      }
      if (p.ord <= 0 || side(p) || phase > 260) leave();
    };
    const side = (q) => G.side * (q.x - m.x) > 260;
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
    this.projectiles.push(new AirLaunch(this, G));
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
      hoverY: Math.max(ceil + 120, top - PLANE_HOVER),
      dir: owner.facing || 1,
      from: o.from || { x: owner.x, y: owner.y - TANK_H * 0.8 },
    };
    const wide = w.air.type === 'torpedo' ? -side * 150 : 0;
    const rows = Math.ceil(n / 8);
    G.slot = (i) => {
      const k = i % 8, r = Math.floor(i / 8), m = Math.min(8, n - r * 8);
      return { x: clamp(mark.x + wide + (k - (m - 1) / 2) * PLANE_GAP, 20, WORLD_W - 20), y: G.hoverY - r * 34 - (k % 2) * 14 - (rows - 1) * 6 };
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
    this.airGroups = this.airGroups.filter((G) => G.planes.some((p) => p.alive));
  },

  // start of a turn: squads whose owner is gone turn for home; this owner's due squads strike.
  // Returns true if a strike took the turn over (finishShot hands it back to her).
  startStrikes(t) {
    for (const G of this.airGroups) if (!G.owner.alive) for (const p of G.planes) if (p.alive && p.state !== 'leave') { p.state = 'leave'; p.t = 0; }
    const due = this.airGroups.filter((G) => G.owner === t && (t.turnsTaken || 0) >= G.due && G.planes.some((p) => p.alive && p.state === 'hover'));
    if (!due.length) return false;
    this.phase = 'resolve';
    this.strikeResolve = true;
    this.resolveSteps = 0;
    this.quiet = 0;
    this.salvo = null;
    this.report = { shooter: t, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
    this.projectiles.push(new AirStrike(this, due));
    for (const G of due) G.striking = true;
    this.events.push(`${t.name}'s planes attack.`);
    this.ui.notice(`${t.name}'s squadron attacks!`);
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
      for (let y = G.hoverY + 30; y < gy - 20; y += 22) sq(ctx, m.x, y, 3); // and a line down from the squad
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
      const txt = `${G.owner.name} · ${live.length} plane${live.length > 1 ? 's' : ''} · ${left <= 1 ? 'strikes next turn' : `strikes in ${left} turns`}`;
      const x = Math.round(cam.sx(G.mark.x)), y = Math.round(cam.sy(G.hoverY - 40) - 30);
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
    const settled = t > KIDO.BACK_END && this.group.planes.every((p) => !p.alive || p.state === 'hover');
    if (t >= KIDO.END || settled) { cam.wide = 0; return false; }
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
