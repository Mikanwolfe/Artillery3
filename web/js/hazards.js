'use strict';
// Complications that build up as a match goes on (menu: events on/off). The match "stage" runs 1..8
// over a finite match (so every match reaches the full set by its last round) and = the round
// number in infinite mode.
//   stage 2+  Storm fronts (after GunBound's Force and Lightning weather): vertical bands across the
//             sky. A shell through a Force front hits 1.5x as hard; one through a Storm front is
//             electrified and throws a lightning bolt at whatever is nearest where it lands.
//   stage 3+  Hatsuyuki drones (named after A3's shelved AI project): hostile bombers. Once per turn
//             cycle they fly over a vehicle and drop a bomb. They can be shot down for a bounty.
//   stage 4+  Whiteout (after Worms' sudden-death water): once a round has gone a few cycles, freezing
//             fog rises from the bottom every cycle and hurts anything inside it at the start of its
//             turn. High ground matters, and long rounds end.

const FRONT_FORCE_MULT = 1.5;
const FRONT_STORM_FRAC = 0.4; // lightning bolt damage, as a fraction of the shell's damage (min 25)
const FRONT_STORM_RANGE = 320;
const DRONE_SPEED = 7;
const FOG_RISE = 45; // world units per turn cycle (+5 per stage)
const FOG_DMG = 0.1; // of max health + max armour, at the start of each turn spent in the fog

class Drone {
  constructor(x, y, stage) {
    this.isDrone = true;
    this.name = 'Hatsuyuki drone';
    this.x = x;
    this.y = y; // bottom of the hitbox, like a tank's ground point
    this.dest = null;
    this.alive = true;
    this.maxHp = 100 + 40 * stage;
    this.hp = this.maxHp;
    this.armour = 0;
    this.maxArmour = 0;
    this.color = '#5a5a6a';
    this.t = Math.random() * 100;
    this.flash = 0;
  }

  center() { return { x: this.x, y: this.y - TANK_H / 2 }; }

  update(terrain) {
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
    if (!this.alive) return;
    const hover = Drone.hoverY(terrain, this.dest ? this.dest.x : this.x);
    if (this.dest) {
      this.x += clamp(this.dest.x - this.x, -DRONE_SPEED, DRONE_SPEED);
      this.y += clamp(hover - this.y, -DRONE_SPEED, DRONE_SPEED);
    } else {
      this.y += (hover + Math.sin(this.t / 40) * 8 - this.y) * 0.05;
    }
  }

  arrived() { return !this.dest || Math.abs(this.dest.x - this.x) < 2; }

  // cruise well clear of the highest ground underneath
  static hoverY(terrain, x) {
    let top = Infinity;
    for (let dx = -80; dx <= 80; dx += 20) top = Math.min(top, terrain.hAt(clamp(x + dx, 0, WORLD_W - 1)));
    return Math.max(-150, top - 260);
  }

  // box art: a flat body with a pink sensor, two rotor arms whose blades flicker
  draw(ctx) {
    if (!this.alive) return;
    const x = Math.round(this.x);
    const y = Math.round(this.y - TANK_H / 2);
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#3c3c48';
    ctx.fillRect(x - 14, y - 5, 28, 10);
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(x - 26, y - 3, 12, 3);
    ctx.fillRect(x + 14, y - 3, 12, 3);
    ctx.fillStyle = '#20202a';
    ctx.fillRect(x - 4, y + 5, 8, 4);
    const blade = (this.t >> 2) % 2 ? 14 : 8;
    ctx.fillStyle = 'rgba(200,200,214,0.8)';
    ctx.fillRect(x - 20 - blade / 2, y - 7, blade, 2);
    ctx.fillRect(x + 20 - blade / 2, y - 7, blade, 2);
    ctx.fillStyle = (this.t >> 4) % 2 ? 'rgb(255,120,200)' : 'rgb(160,60,120)';
    ctx.fillRect(x + 6, y - 2, 4, 4);
  }

  // screen space: a small health bar
  drawLabel(ctx, sx, sy) {
    if (!this.alive) return;
    ctx.fillStyle = 'rgba(232,230,244,0.85)';
    ctx.fillRect(Math.round(sx - 26), Math.round(sy - 42), 52, 8);
    ctx.fillStyle = 'rgb(184,67,58)';
    ctx.fillRect(Math.round(sx - 24), Math.round(sy - 40), Math.round(48 * clamp(this.hp / this.maxHp, 0, 1)), 4);
  }
}

Object.assign(Game.prototype, {
  // 1..8 across a finite match; the round number in infinite mode
  stage() {
    if (!this.events_on) return 0;
    if (!this.rounds) return this.round;
    return 1 + ((this.round - 1) * 7) / Math.max(1, this.rounds - 1);
  },

  // everything a shell can hit
  targets() { return this.drones.length ? this.tanks.concat(this.drones) : this.tanks; },

  setupHazards() {
    this.fronts = [];
    this.drones = [];
    this.fogY = null;
    this.hazardTurn = -1;
    const st = this.stage();
    const avoid = this.tanks.map((t) => t.x);
    const notes = [];
    if (st >= 2) {
      const n = st >= 5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        let x = 0;
        for (let k = 0; k < 20; k++) {
          x = rng.range(200, WORLD_W - 200);
          if (avoid.every((a) => Math.abs(a - x) > 140)) break;
        }
        avoid.push(x);
        this.fronts.push({ x, w: rng.range(70, 110), kind: i === 0 ? rng.pick(['force', 'storm']) : (this.fronts[0].kind === 'force' ? 'storm' : 'force') });
      }
      notes.push(this.fronts.map((f) => (f.kind === 'force' ? 'a Force front (shells through it hit 1.5x)' : 'a Storm front (shells through it throw lightning)')).join(' and '));
    }
    if (st >= 3) {
      const n = st >= 7 ? 3 : st >= 5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = rng.range(200, WORLD_W - 200);
        this.drones.push(new Drone(x, Drone.hoverY(this.terrain, x), Math.round(st)));
      }
      notes.push(`${n} Hatsuyuki drone${n > 1 ? 's' : ''} (bombs once a cycle; $${this.droneBounty()} to shoot one down)`);
    }
    if (st >= 4) {
      this.fogStart = Math.max(3, 8 - Math.floor(st / 2)); // turn cycles before the fog starts rising
      notes.push(`whiteout after ${this.fogStart} turn cycles`);
    }
    if (notes.length) {
      const msg = `This round: ${notes.join('; ')}.`;
      this.events.push(msg);
      this.ui.notice(msg);
    }
  },

  droneBounty() { return 250 + 60 * Math.round(this.stage()); },

  updateHazards() {
    for (const d of this.drones) d.update(this.terrain);
    for (const f of this.fronts) f.t = (f.t || 0) + 1;
  },

  // shells passing through a front pick up its effect (once)
  frontCheck(p) {
    for (const f of this.fronts) {
      if (Math.abs(p.x - f.x) > f.w / 2) continue;
      if (f.kind === 'force' && !p.force) { p.force = true; this.sfx.click(); }
      if (f.kind === 'storm' && !p.storm) { p.storm = true; this.sfx.click(); }
    }
    if ((p.force || p.storm) && p.age % 2 === 0) {
      this.particles.add({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, g: 0, drag: 0.9, life: 0.35, size: 4, color: p.storm ? [150, 210, 255] : [255, 216, 74] });
    }
  },

  // a storm-charged shell's lightning: jumps to the nearest target in range of the impact
  lightning(p, w) {
    let best = null;
    let bd = FRONT_STORM_RANGE;
    for (const t of this.targets()) {
      if (!t.alive) continue;
      const c = t.center();
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) return;
    const c = best.center();
    // a jagged bolt of squares
    let x = p.x;
    let y = p.y;
    const n = 7;
    for (let i = 1; i <= n; i++) {
      const nx = i === n ? c.x : lerp(p.x, c.x, i / n) + (Math.random() - 0.5) * 40;
      const ny = i === n ? c.y : lerp(p.y, c.y, i / n) + (Math.random() - 0.5) * 40;
      this.lasers.push(new Laser(x, y, nx, ny, '#a0d8ff', 8, 30));
      x = nx;
      y = ny;
    }
    this.sfx.laser();
    this.damage(best, Math.max(25, w.dmg * FRONT_STORM_FRAC), p.owner);
  },

  damageDrone(d, amt, owner) {
    if (!d.alive) return;
    d.hp -= amt;
    d.flash = 1;
    this.particles.text(d.x, d.y - 50, String(Math.round(amt)), '#ffffff', amt > 100);
    if (d.hp > 0) return;
    d.alive = false;
    this.particles.explosion(d.x, d.y - 10, 90, 'shell');
    this.sfx.explosion(30);
    if (owner && !owner.isDrone) {
      const pay = this.droneBounty();
      owner.money += pay;
      this.particles.text(d.x, d.y - 80, `+$${pay}`, '#ffd84a', true);
      this.events.push(`${owner.name} shot down a drone (+$${pay}).`);
      this.ui.notice(`${owner.name} shot down a Hatsuyuki drone! +$${pay}`);
      if (owner.isCpu && Math.random() < 0.5) this.banter(owner, 'hit_big');
    } else this.events.push('A drone went down.');
  },

  // Called from nextTurn: once per turn cycle the fog rises and the drones make a bombing run.
  // Returns true if it took over the turn flow (the hazard phase will call nextTurn when done).
  hazardStep() {
    if (!this.events_on) return false;
    const alive = this.tanks.filter((t) => t.alive).length;
    const cycle = this.turnCount > 0 && this.turnCount % alive === 0;
    if (!cycle || this.hazardTurn === this.turnCount) return false;
    this.hazardTurn = this.turnCount;
    const cycles = this.turnCount / alive;
    if (this.fogStart && cycles >= this.fogStart) {
      if (this.fogY === null) {
        this.fogY = WORLD_BOTTOM;
        this.ui.notice('Whiteout! Freezing fog is rising: get to high ground.');
        this.events.push('A whiteout sets in.');
      }
      this.fogY -= FOG_RISE + 5 * Math.round(this.stage());
    }
    const drones = this.drones.filter((d) => d.alive);
    if (!drones.length) return false;
    const victims = this.tanks.filter((t) => t.alive);
    drones.forEach((d, i) => {
      const v = rng.pick(victims);
      // drones on the same target fan out a little so they don't stack
      const same = drones.slice(0, i).filter((o) => o.victim === v).length;
      d.dest = { x: clamp(v.x + rng.range(-45, 45) + same * 70 * (same % 2 ? 1 : -1), 20, WORLD_W - 20) };
      d.victim = v;
    });
    this.phase = 'hazard';
    this.hazard = { t: 0, dropped: false };
    this.cam.follow(drones[0]);
    this.charging = false;
    this.sfx.chargeStop();
    this.ui.turn({ name: 'Hatsuyuki drones', color: '#5a5a6a', isCpu: true });
    return true;
  },

  updateHazard() {
    const h = this.hazard;
    h.t++;
    const drones = this.drones.filter((d) => d.alive);
    if (!h.dropped && (drones.every((d) => d.arrived()) || h.t > 240)) {
      h.dropped = true;
      const st = Math.round(this.stage());
      const bomb = { id: 'dronebomb', name: 'Drone bomb', kind: 'shell', dmg: 35 + 12 * st, dmgR: 70, explR: 8, salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: 1 };
      for (const d of drones) {
        const p = new Projectile(this, bomb, d, d.x, d.y + 4, 0, 1, false);
        this.projectiles.push(p);
        d.dest = null;
      }
      this.cam.follow(this.projectiles[0]);
      this.sfx.shot(bomb);
      this.events.push('The drones drop their bombs.');
      // let the normal resolve loop play the bombs out, then hand back to nextTurn
      this.salvo = null;
      this.report = null;
      this.hazardResolve = true;
      this.phase = 'resolve';
      this.resolveSteps = 0;
      this.quiet = 0;
    }
  },

  // start of a vehicle's turn inside the fog
  fogDamage(t) {
    if (this.fogY === null || !t.alive || t.y < this.fogY) return;
    this.events.push(`${t.name} is freezing in the fog.`);
    this.damage(t, (t.maxHp + t.maxArmour) * FOG_DMG, null);
  },

  drawHazardsBack(ctx, cam) {
    for (const f of this.fronts) {
      const col = f.kind === 'force' ? [255, 216, 74] : [150, 210, 255];
      const ground = this.terrain.hAt(f.x);
      const top = cam.y - 40;
      ctx.fillStyle = rgb(col, 0.1);
      ctx.fillRect(Math.round(f.x - f.w / 2), Math.round(top), Math.round(f.w), Math.round(ground - top));
      // rising motes
      ctx.fillStyle = rgb(col, 0.55);
      for (let i = 0; i < 18; i++) {
        const my = ground - (((f.t || 0) * (1.5 + (i % 3)) + i * 97) % (ground - top));
        sq(ctx, f.x - f.w / 2 + ((i * 37) % f.w), my, 3 + (i % 3));
      }
    }
  },

  drawHazardsFront(ctx, cam) {
    for (const d of this.drones) d.draw(ctx);
    if (this.fogY !== null) {
      const y = Math.round(this.fogY);
      ctx.fillStyle = 'rgba(236,240,250,0.62)';
      ctx.fillRect(Math.round(cam.x) - 10, y, VIEW_W + 20, WORLD_BOTTOM + 1200 - y);
      ctx.fillStyle = 'rgba(236,240,250,0.5)';
      for (let x = Math.floor(cam.x / 24) * 24; x < cam.x + VIEW_W + 24; x += 24) {
        sq(ctx, x, y - 4 + Math.sin(x * 0.05 + this.time * 1.5) * 4, 14);
      }
    }
  },

  drawHazardLabels(ctx, cam) {
    for (const d of this.drones) d.drawLabel(ctx, d.x - cam.x, d.y - cam.y);
    ctx.font = '14px "Maven Pro", Verdana, sans-serif';
    ctx.textAlign = 'center';
    for (const f of this.fronts) {
      const sx = f.x - cam.x;
      if (sx < -60 || sx > VIEW_W + 60) continue;
      ctx.fillStyle = f.kind === 'force' ? 'rgb(150,110,0)' : 'rgb(40,90,140)';
      const sy = clamp(this.terrain.hAt(f.x) - cam.y - 40, 260, VIEW_H - 160);
      ctx.fillText(f.kind === 'force' ? 'FORCE ×1.5' : 'STORM', Math.round(sx), Math.round(sy));
    }
  },
});
