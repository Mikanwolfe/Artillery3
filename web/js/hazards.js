'use strict';
// Complications that build up as a match goes on (menu: events on/off). The match "stage" runs 1..8
// over a finite match (so every match reaches the full set by its last round) and = the round
// number in infinite mode.
//   Forts (forts.js)        every events round: neutral block strongholds, cover until shelled apart.
//   Weather fronts          stage 2+: vertical bands that form, drift with the wind, change and fade
//                           over a few turns, after GunBound's weather. Each biome has its own set.
//                           Wider is stronger; levels I-III come with the stage.
//   Mobs (mobs.js)          stage 3+: drones (then gunners), stage 4+: shore batteries, reinforcements
//                           once a round drags on, and in the last round a mothership boss.
//   Sudden death            stage 4+: after a few cycles the biome's hazard rises from the bottom
//                           every cycle (whiteout fog, flood, quicksand) and hurts anything in it.

// Fronts: strength s = width / 100 (about 0.6 at level I up to 2 at level III)
const FRONT_TYPES = {
  force: { name: 'Force', col: [255, 216, 74], tip: 'shells hit far harder' },
  storm: { name: 'Storm', col: [150, 210, 255], tip: 'shells throw lightning and hit harder' },
  updraft: { name: 'Updraft', col: [255, 170, 120], tip: 'lifts shells, which hit harder' },
  gale: { name: 'Gale', col: [200, 222, 232], tip: 'blows shells sideways, and they hit harder' },
  blizzard: { name: 'Blizzard', col: [240, 244, 255], tip: 'slows shells, which hit harder' },
  rain: { name: 'Rain', col: [110, 150, 214], tip: 'damps blasts' },
  sandstorm: { name: 'Sandstorm', col: [206, 160, 100], tip: 'buffets shells, which hit harder' },
};
const FRONT_POWER = 2; // how hard fronts push shells about (x their original strength)
const FRONT_FORCE = 0.8; // Force: +80% damage at full width (strength 1)
const FRONT_BUFF = 0.2; // every other front (bar Rain) also adds +20% at full width
const FRONT_WIDTH = [null, [60, 90], [100, 140], [150, 200]];
const FRONT_DRIFT = 1200; // world units of drift per turn per unit of wind
const FOG_RISE = 45; // world units per turn cycle (+5 per stage)
const FOG_DMG = 0.1; // of max health + max armour, at the start of each turn spent in it
const LAVA_DMG = 60; // at the start of each turn spent standing in lava (Ikaros' Apollon), at full melt
const ROMAN = ['', 'I', 'II', 'III'];
// The NXi fleet's running battle overhead (round 2 on): once a round has gone DEBRIS_FROM cycles,
// burning wreckage falls on every hostile turn, more each cycle, onto and around the players
const DEBRIS_FROM = 2;
const DEBRIS_SRC = { isMob: true, name: 'NXi fleet debris', alive: false, x: 0, y: -2000, center() { return { x: this.x, y: this.y }; } };

Object.assign(Game.prototype, {
  // 1..8 across a finite match; the round number in infinite mode
  stage() {
    if (!this.events_on) return 0;
    if (!this.rounds) return this.round;
    return 1 + ((this.round - 1) * 7) / Math.max(1, this.rounds - 1);
  },

  // everything a shell can hit
  targets() {
    const list = this.mobs.length ? this.tanks.concat(this.mobs) : this.tanks.slice();
    if (this.satellite && this.satellite.alive) list.push(this.satellite); // MAIA can be shot
    if (this.planes) for (const p of this.planes) if (p.targetable) list.push(p); // and planes in the sky
    return list;
  },
  // what a rocket's seeker can lock onto: vehicles, mobs and supply crates (not MAIA: up there it
  // is the nearest thing to a diving rocket, which would then circle it)
  seekables() { return this.targets().filter((x) => !x.isSat).concat(this.crates.filter((c) => c.alive)); },

  // ------------------------------------------------------------ round setup
  setupHazards() {
    this.fronts = [];
    this.mobs = [];
    this.fleetFight = false;
    this.skyFlashes = [];
    this.fogY = null;
    this.fogStart = 0;
    this.reinforceAt = 0;
    this.shipAt = 0;
    this.hazardTurn = -1;
    const st = this.stage();
    if (!st) return;
    const notes = [];
    if (st >= 2) {
      for (let i = 0; i < this.frontTarget(); i++) this.spawnFront(true);
      notes.push(this.fronts.map((f) => `a ${this.frontName(f)} front (${FRONT_TYPES[f.kind].tip})`).join(' and '));
    }
    if (this.round >= 2) { // several drones from round 2, more each round
      const n = clamp(2 + Math.floor(st / 2), 3, 6);
      for (let i = 0; i < n; i++) this.addMob(st >= 4 && i === n - 1 ? 'gunner' : st >= 5 && i === n - 2 ? 'fpv' : 'drone', this.mobSpot(150));
      this.reinforceAt = Math.max(1, 5 - Math.floor(st / 2));
      notes.push(`${n} drones, with more (and worse) after ${this.reinforceAt} cycle${this.reinforceAt > 1 ? 's' : ''}`);
    }
    if (st >= 4) {
      const n = st >= 6 ? 2 : 1;
      for (let i = 0; i < n; i++) this.addMob('turret', this.mobSpot());
      notes.push(`${n} shore batter${n > 1 ? 'ies' : 'y'}`);
      this.fogStart = Math.max(3, 8 - Math.floor(st / 2)); // turn cycles before sudden death
      notes.push(`${this.biome.sudden.name.toLowerCase()} after ${this.fogStart} cycles`);
    }
    // the boss: the last round of a finite match, every 5th round in infinite mode
    if ((this.rounds && this.round === this.rounds && this.rounds >= 3) || (!this.rounds && this.round >= 5 && this.round % 5 === 0)) {
      this.shipAt = 2;
      notes.push('something big on the radar');
    }
    if (notes.length) {
      const msg = `This round: ${notes.join('; ')}.`;
      this.events.push(msg);
      this.ui.notice(msg);
    }
  },

  // ------------------------------------------------------------ weather fronts
  frontTarget() { const st = this.stage(); return st >= 6 ? 3 : st >= 4 ? 2 : st >= 2 ? 1 : 0; },
  frontName(f) { return `${f.kind === 'updraft' && this.biome.id === 'desert' ? 'Thermal' : FRONT_TYPES[f.kind].name} ${ROMAN[f.level]}`; },

  spawnFront(quiet) {
    const st = this.stage();
    const maxLevel = st >= 7 ? 3 : st >= 4 ? 2 : 1;
    const level = rng.int(1, maxLevel);
    const used = this.fronts.filter((f) => !f.dying).map((f) => f.kind);
    const kinds = this.biome.fronts.filter((k) => !used.includes(k));
    const kind = rng.pick(kinds.length ? kinds : this.biome.fronts);
    const avoid = this.tanks.map((t) => t.x).concat(this.fronts.map((f) => f.x));
    let x = WORLD_W / 2;
    for (let k = 0; k < 20; k++) {
      x = rng.range(200, WORLD_W - 200);
      if (avoid.every((a) => Math.abs(a - x) > 160)) break;
    }
    const [w0, w1] = FRONT_WIDTH[level];
    const f = { kind, level, x, w: rng.range(w0, w1), life: rng.int(5, 12), alpha: quiet ? 1 : 0, dying: false, t: 0, dir: rng.chance(0.5) ? 1 : -1 };
    this.fronts.push(f);
    if (!quiet) {
      this.ui.notice(`A ${this.frontName(f)} front is forming (${FRONT_TYPES[kind].tip}).`);
      this.events.push(`A ${this.frontName(f)} front forms.`);
    }
    return f;
  },

  // every turn: fronts drift with the wind and breathe; old ones die away and new ones form
  updateFrontsTurn(windChanged) {
    if (!this.events_on || this.stage() < 2) return;
    for (const f of this.fronts) {
      if (f.dying) continue;
      f.x = clamp(f.x + this.wind.x * FRONT_DRIFT, 80, WORLD_W - 80);
      const [w0, w1] = FRONT_WIDTH[f.level];
      f.w = clamp(f.w * rng.range(0.9, 1.1), w0 * 0.8, w1 * 1.1);
      if (--f.life <= 0 || (windChanged && rng.chance(0.5))) {
        f.dying = true;
        this.events.push(`The ${this.frontName(f)} front breaks up.`);
      }
    }
    const live = this.fronts.filter((f) => !f.dying).length;
    if (live < this.frontTarget() && rng.chance(windChanged ? 1 : 0.4)) this.spawnFront(false);
  },

  // a front's strength: wider is stronger (0 while it fades in or out)
  frontStrength(f) { return f.alpha < 0.5 ? 0 : f.w / 100; },

  // called every frame for every projectile: fronts act on shells inside them
  frontCheck(p) {
    for (const f of this.fronts) {
      if (Math.abs(p.x - f.x) > f.w / 2) continue;
      const s = this.frontStrength(f);
      if (!s) continue;
      if (f.kind !== 'rain') p.forceMult = Math.max(p.forceMult || 1, 1 + (f.kind === 'force' ? FRONT_FORCE : FRONT_BUFF) * s);
      const k = FRONT_POWER * s;
      switch (f.kind) {
        case 'storm': p.storm = Math.max(p.storm || 0, s); break;
        case 'rain': p.rainMult = Math.min(p.rainMult || 1, 1 - 0.18 * s); break;
        case 'updraft': p.vy -= GRAV * 0.35 * k; break;
        case 'gale': p.vx += f.dir * 0.05 * k; break;
        case 'blizzard': p.vx *= 1 - 0.007 * k; p.vy *= 1 - 0.004 * k; break;
        case 'sandstorm': p.vx += (rng.next() - 0.5) * 0.3 * k; p.vy += (rng.next() - 0.5) * 0.3 * k; break;
        default: break;
      }
      if (p.age % 3 === 0) {
        this.particles.add({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, g: 0, drag: 0.9, life: 0.35, size: 4, color: FRONT_TYPES[f.kind].col });
      }
    }
  },

  // damage multiplier picked up from Force / Rain fronts
  frontMult(p) { return (p.forceMult || 1) * (p.rainMult || 1); },

  // a jagged bolt: a list of points from the top to the bottom
  makeBolt(x, top, bottom) {
    const pts = [];
    let px = x;
    for (let y = top; y < bottom; y += 18 + Math.random() * 16) {
      pts.push({ x: px, y });
      px += (Math.random() - 0.5) * 44;
    }
    pts.push({ x: px, y: bottom });
    return { pts, life: 14 };
  },

  drawBolt(ctx, b, size = 6) {
    const a = clamp(b.life / 10, 0, 1);
    for (let i = 1; i < b.pts.length; i++) {
      const p0 = b.pts[i - 1], p1 = b.pts[i];
      const n = Math.ceil(dist(p0.x, p0.y, p1.x, p1.y) / 5);
      for (let k = 0; k <= n; k++) {
        const x = lerp(p0.x, p1.x, k / n), y = lerp(p0.y, p1.y, k / n);
        ctx.fillStyle = `rgba(160,210,255,${0.3 * a})`;
        sq(ctx, x, y, size * 2.6);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        sq(ctx, x, y, size);
      }
    }
  },

  // a storm-charged shell's lightning: jumps to the nearest target in range of the impact
  lightning(p, w) {
    const s = p.storm;
    let best = null;
    let bd = 200 + 80 * s;
    for (const t of this.targets()) {
      if (!t.alive) continue;
      const c = t.center();
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) return;
    const c = best.center();
    // a bright jagged bolt from the impact to the target, with a flash and thunder
    const pts = [{ x: p.x, y: p.y }];
    const n = 7;
    for (let i = 1; i < n; i++) pts.push({ x: lerp(p.x, c.x, i / n) + (Math.random() - 0.5) * 40, y: lerp(p.y, c.y, i / n) + (Math.random() - 0.5) * 40 });
    pts.push({ x: c.x, y: c.y });
    this.chainBolts = (this.chainBolts || []).concat({ pts, life: 22 });
    this.screenFlash = Math.max(this.screenFlash || 0, 0.35);
    this.sfx.thunder();
    this.damage(best, Math.max(20, w.dmg * 0.25 * s), p.owner);
  },

  updateHazards() {
    for (const m of this.mobs) m.update(this);
    for (const f of this.fronts) {
      f.t++;
      f.alpha = clamp(f.alpha + (f.dying ? -0.02 : 0.02), 0, 1);
      if (f.kind === 'storm' && f.alpha > 0.6) {
        // storms strike: a visible bolt from the sky to the ground every few seconds (more often when wide)
        if (f.nextBolt === undefined) f.nextBolt = 40 + Math.floor(Math.random() * 120); // visual only: Math.random
        if (--f.nextBolt <= 0) {
          f.nextBolt = Math.round((90 + Math.random() * 150) / (f.w / 100));
          f.bolt = this.makeBolt(f.x + (Math.random() - 0.5) * f.w * 0.66, this.cam.y - 60, this.terrain.hAt(f.x));
          this.screenFlash = Math.max(this.screenFlash || 0, 0.25 + 0.1 * f.level);
          this.sfx.thunder();
        }
      }
      if (f.bolt && --f.bolt.life <= 0) f.bolt = null;
    }
    this.fronts = this.fronts.filter((f) => !(f.dying && f.alpha <= 0));
  },

  // ------------------------------------------------------------ the hazard cycle
  // Called from nextTurn: once per turn cycle sudden death rises, reinforcements arrive and every
  // mob takes its move. Returns true if it took over the turn flow (updateHazard calls nextTurn).
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
        this.ui.notice(this.biome.sudden.start);
        this.events.push(`${this.biome.sudden.name} sets in.`);
      }
      this.fogY -= FOG_RISE + 5 * Math.round(this.stage());
    }
    this.reinforce(cycles);
    this.debrisDue = 0;
    if (this.round >= 2 && cycles >= DEBRIS_FROM) {
      this.debrisDue = Math.min(12, 1 + Math.floor((cycles - DEBRIS_FROM) * 1.2) + Math.floor(this.stage() / 3));
      if (!this.fleetFight) { this.fleetFight = true; this.ui.notice('The NXi fleet is fighting overhead: wreckage is coming down.'); this.events.push('Wreckage from the NXi fleet starts to fall.'); }
    }
    if (this.shipAt && cycles >= this.shipAt && !this.mobs.some((m) => m.kind === 'mothership')) {
      const m = this.addMob('mothership', rng.chance(0.5) ? 160 : WORLD_W - 160);
      this.ui.notice(`The ${m.name} has arrived! ¢${m.bounty} to whoever brings it down.`);
      this.ui.dispatch('Priority transmission', STORY.boss);
      this.events.push(`The ${m.name} arrives.`);
      this.sfx.satPrep();
    }
    if (!this.planMobs() && !this.debrisDue) return false;
    this.phase = 'hazard';
    this.hazard = { t: 0, fired: false };
    const lead = this.mobs.find((m) => m.alive && m.kind === 'mothership') || this.mobs.find((m) => m.alive && m.dest);
    if (lead) this.cam.follow(lead);
    this.charging = false;
    this.ui.turn({ name: 'Hostiles', color: '#5a5a6a', isCpu: true });
    return true;
  },

  updateHazard() {
    const h = this.hazard;
    h.t++;
    const live = this.mobs.filter((m) => m.alive);
    if (!h.fired && (live.every((m) => m.arrived()) || h.t > 200)) {
      h.fired = true;
      for (const m of live) { m.dest = null; m.path = null; }
      const shots = this.mobAttacks() + this.dropDebris();
      if (this.projectiles.length) this.cam.follow(this.projectiles[0]);
      if (shots) this.sfx.shot({ kind: 'shell' });
      // let the normal resolve loop play the shots out, then hand back to nextTurn
      this.salvo = null;
      this.report = null;
      this.hazardResolve = true;
      this.phase = 'resolve';
      this.resolveSteps = 0;
      this.quiet = 0;
    }
  },

  // the fleet's wreckage: burning plates that fall at an angle, aimed loosely at the players
  dropDebris() {
    const n = this.debrisDue || 0;
    this.debrisDue = 0;
    if (!n) return 0;
    const st = clamp(Math.round(this.stage()), 1, 12);
    const w = { kind: 'shell', salvo: 1, clip: 1, disp: 0, acid: 0, sat: false, rarity: 1, maxCharge: 60, id: 'debris', name: 'Fleet debris', debris: true, dmg: 22 + 6 * st, dmgR: 55, explR: 8 };
    const victims = this.tanks.filter((t) => t.alive);
    for (let i = 0; i < n; i++) {
      const v = rng.pick(victims);
      const tx = clamp(v.x + rng.range(-320, 320), 20, WORLD_W - 20);
      const vx = rng.range(-5, 5);
      const y0 = -1600;
      const fall = this.terrain.hAt(tx) - y0;
      const tFall = Math.sqrt((2 * fall) / GRAV);
      const p = new Projectile(this, w, DEBRIS_SRC, tx - vx * tFall, y0, vx, 0, false);
      p.delay = i * 7;
      this.projectiles.push(p);
    }
    this.events.push(`${n} piece${n > 1 ? 's' : ''} of wreckage fall.`);
    return n;
  },

  // start of a vehicle's turn standing in lava (Ikaros' Apollon)
  lavaDamage(t) {
    if (!t.alive) return;
    const l = this.terrain.lavaAt(t.x);
    if (l < 0.1 || Math.abs(t.y - this.terrain.hAt(t.x)) > 12) return;
    this.particles.text(t.x, t.y - 64, 'LAVA', '#ff9a40');
    this.events.push(`${t.name} is standing in lava.`);
    this.damage(t, Math.round(LAVA_DMG * (0.4 + 0.6 * l)), null);
  },

  // start of a vehicle's turn inside the rising hazard
  fogDamage(t) {
    if (this.fogY === null || !t.alive || t.y < this.fogY) return;
    this.events.push(`${t.name} ${this.biome.sudden.hurt}.`);
    this.damage(t, (t.maxHp + t.maxArmour) * FOG_DMG, null);
  },

  // ------------------------------------------------------------ drawing
  drawHazardsBack(ctx, cam) {
    const top = cam.y - 40;
    if (this.fleetFight) { // the battle up there: far-off lance shots and bursts at the top of the sky
      const fl = this.skyFlashes;
      if (Math.random() < 0.05) fl.push({ x: cam.x + Math.random() * cam.w, y: cam.y + cam.h * (0.04 + Math.random() * 0.16), len: 60 + Math.random() * 220, dir: Math.random() < 0.5 ? -1 : 1, life: 1, burst: Math.random() < 0.35 });
      for (const f of fl) {
        f.life -= 0.06;
        ctx.globalAlpha = clamp(f.life, 0, 1) * 0.7;
        if (f.burst) { ctx.fillStyle = '#ffd8a0'; sq(ctx, f.x, f.y, 6 + 10 * (1 - f.life)); ctx.fillStyle = '#ff9040'; sq(ctx, f.x, f.y, 4); }
        else { ctx.fillStyle = '#9ad8ff'; ctx.fillRect(Math.round(Math.min(f.x, f.x + f.dir * f.len)), Math.round(f.y), Math.round(f.len), 2); }
      }
      ctx.globalAlpha = 1;
      this.skyFlashes = fl.filter((f) => f.life > 0);
    }
    for (const f of this.fronts) {
      const T = FRONT_TYPES[f.kind];
      const col = T.col;
      const ground = this.terrain.hAt(f.x);
      const x0 = f.x - f.w / 2;
      const a = f.alpha;
      ctx.fillStyle = rgb(col, (0.07 + 0.04 * f.level) * a);
      ctx.fillRect(Math.round(x0), Math.round(top), Math.round(f.w), Math.round(ground - top));
      ctx.fillStyle = rgb(col, 0.25 * a);
      ctx.fillRect(Math.round(x0), Math.round(top), 2, Math.round(ground - top));
      ctx.fillRect(Math.round(x0 + f.w - 2), Math.round(top), 2, Math.round(ground - top));
      const span = Math.max(1, ground - top);
      const n = Math.round(f.w / 6);
      ctx.fillStyle = rgb(col, 0.6 * a);
      for (let i = 0; i < n; i++) {
        const lane = (i * 37) % Math.max(1, Math.round(f.w));
        const speed = 1 + (i % 3);
        const ph = f.t * speed + i * 97;
        switch (f.kind) {
          case 'rain': ctx.fillRect(Math.round(x0 + lane), Math.round(top + ((ph * 3) % span)), 2, 8); break;
          case 'blizzard': sq(ctx, x0 + ((lane + ph) % f.w), top + ((ph * 2.2) % span), 3); break;
          case 'gale': sq(ctx, x0 + (((lane + ph * 1.5 * f.dir) % f.w) + f.w) % f.w, top + ((i * 53) % span), 4); break;
          case 'sandstorm': ctx.fillRect(Math.round(x0 + ((lane + ph * 2) % f.w)), Math.round(top + ((i * 61 + Math.sin(ph / 9) * 20) % span)), 6, 2); break;
          case 'updraft': sq(ctx, x0 + lane, ground - ((ph * 2) % span), 3 + (i % 3)); break;
          default: sq(ctx, x0 + lane, ground - (ph % span), 3 + (i % 3)); break;
        }
      }
      if (f.kind === 'force') {
        // a beam coming down from orbit: a bright core, pulses travelling down it, a glow where it lands
        const core = f.w * 0.28;
        ctx.fillStyle = rgb([255, 236, 150], (0.18 + 0.06 * f.level) * a);
        ctx.fillRect(Math.round(f.x - core / 2), Math.round(top), Math.round(core), Math.round(ground - top));
        ctx.fillStyle = rgb([255, 250, 220], 0.35 * a);
        ctx.fillRect(Math.round(f.x - core / 6), Math.round(top), Math.round(core / 3), Math.round(ground - top));
        for (let k = 0; k < 5; k++) {
          const py = top + (((f.t * (3 + f.level)) + k * span / 5) % span);
          ctx.fillStyle = rgb([255, 244, 180], 0.45 * a);
          ctx.fillRect(Math.round(x0 + 4), Math.round(py), Math.round(f.w - 8), 4);
        }
        ctx.fillStyle = rgb([255, 236, 150], 0.35 * a * (0.7 + 0.3 * Math.sin(f.t / 6)));
        ctx.fillRect(Math.round(x0 - 6), Math.round(ground - 6), Math.round(f.w + 12), 8);
      }
      if (f.bolt) this.drawBolt(ctx, f.bolt, 4 + f.level);
    }
  },

  drawHazardsFront(ctx, cam) {
    for (const m of this.mobs) m.draw(ctx);
    if (this.chainBolts) {
      for (const b of this.chainBolts) { this.drawBolt(ctx, b, 5); b.life--; }
      this.chainBolts = this.chainBolts.filter((b) => b.life > 0);
    }
    if (this.fogY !== null) {
      const sd = this.biome.sudden;
      const y = Math.round(this.fogY);
      ctx.fillStyle = rgb(sd.color, sd.alpha);
      ctx.fillRect(Math.round(cam.x) - 10, y, cam.w + 20, WORLD_BOTTOM + 1200 - y);
      ctx.fillStyle = rgb(sd.color, sd.alpha * 0.8);
      for (let x = Math.floor(cam.x / 24) * 24; x < cam.x + cam.w + 24; x += 24) {
        sq(ctx, x, y - 4 + Math.sin(x * 0.05 + this.time * 1.5) * 4, 14);
      }
    }
  },

  drawHazardLabels(ctx, cam) {
    for (const m of this.mobs) m.drawLabel(ctx, cam.sx(m.x), cam.sya(m.y, LABEL_ANCHOR));
    ctx.font = `12px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    for (const f of this.fronts) {
      const sx = cam.sx(f.x);
      if (sx < -60 || sx > VIEW_W + 60 || f.alpha < 0.3) continue;
      const sy = clamp(cam.sy(this.terrain.hAt(f.x)) - 40, 260, VIEW_H - 160);
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = 'rgba(32,32,74,0.85)';
      const label = `${this.frontName(f)}${f.kind === 'gale' ? (f.dir > 0 ? ' →' : ' ←') : ''}`;
      ctx.fillText(label, Math.round(sx), Math.round(sy));
      ctx.globalAlpha = 1;
    }
  },
});
