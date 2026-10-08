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
  force: { name: 'Force', col: [255, 216, 74], tip: 'shells hit harder' },
  storm: { name: 'Storm', col: [150, 210, 255], tip: 'shells throw lightning' },
  updraft: { name: 'Updraft', col: [255, 170, 120], tip: 'lifts shells' },
  gale: { name: 'Gale', col: [200, 222, 232], tip: 'blows shells sideways' },
  blizzard: { name: 'Blizzard', col: [240, 244, 255], tip: 'slows shells' },
  rain: { name: 'Rain', col: [110, 150, 214], tip: 'damps blasts' },
  sandstorm: { name: 'Sandstorm', col: [206, 160, 100], tip: 'buffets shells' },
};
const FRONT_WIDTH = [null, [60, 90], [100, 140], [150, 200]];
const FRONT_DRIFT = 1200; // world units of drift per turn per unit of wind
const FOG_RISE = 45; // world units per turn cycle (+5 per stage)
const FOG_DMG = 0.1; // of max health + max armour, at the start of each turn spent in it
const ROMAN = ['', 'I', 'II', 'III'];

Object.assign(Game.prototype, {
  // 1..8 across a finite match; the round number in infinite mode
  stage() {
    if (!this.events_on) return 0;
    if (!this.rounds) return this.round;
    return 1 + ((this.round - 1) * 7) / Math.max(1, this.rounds - 1);
  },

  // everything a shell can hit
  targets() { return this.mobs.length ? this.tanks.concat(this.mobs) : this.tanks; },
  // what a rocket's seeker can lock onto: vehicles, mobs and supply crates
  seekables() { return this.targets().concat(this.crates.filter((c) => c.alive)); },

  // ------------------------------------------------------------ round setup
  setupHazards() {
    this.fronts = [];
    this.mobs = [];
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
    if (st >= 3) {
      const n = st >= 7 ? 3 : st >= 5 ? 2 : 1;
      for (let i = 0; i < n; i++) this.addMob(st >= 4 && i === n - 1 ? 'gunner' : 'drone', this.mobSpot(150));
      this.reinforceAt = Math.max(2, 7 - Math.floor(st / 2));
      notes.push(`${n} drone${n > 1 ? 's' : ''}, with more after ${this.reinforceAt} cycles`);
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
      switch (f.kind) {
        case 'force': p.forceMult = Math.max(p.forceMult || 1, 1 + 0.35 * s); break;
        case 'storm': p.storm = Math.max(p.storm || 0, s); break;
        case 'rain': p.rainMult = Math.min(p.rainMult || 1, 1 - 0.18 * s); break;
        case 'updraft': p.vy -= GRAV * 0.35 * s; break;
        case 'gale': p.vx += f.dir * 0.05 * s; break;
        case 'blizzard': p.vx *= 1 - 0.007 * s; p.vy *= 1 - 0.004 * s; break;
        case 'sandstorm': p.vx += (Math.random() - 0.5) * 0.3 * s; p.vy += (Math.random() - 0.5) * 0.3 * s; break;
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
    if (this.shipAt && cycles >= this.shipAt && !this.mobs.some((m) => m.kind === 'mothership')) {
      const m = this.addMob('mothership', rng.chance(0.5) ? 160 : WORLD_W - 160);
      this.ui.notice(`The ${m.name} has arrived! $${m.bounty} to whoever brings it down.`);
      this.ui.dispatch('Priority transmission', STORY.boss);
      this.events.push(`The ${m.name} arrives.`);
      this.sfx.satPrep();
    }
    if (!this.planMobs()) return false;
    this.phase = 'hazard';
    this.hazard = { t: 0, fired: false };
    const lead = this.mobs.find((m) => m.alive && m.kind === 'mothership') || this.mobs.find((m) => m.alive && m.dest);
    if (lead) this.cam.follow(lead);
    this.charging = false;
    this.sfx.chargeStop();
    this.ui.turn({ name: 'Hostiles', color: '#5a5a6a', isCpu: true });
    return true;
  },

  updateHazard() {
    const h = this.hazard;
    h.t++;
    const live = this.mobs.filter((m) => m.alive);
    if (!h.fired && (live.every((m) => m.arrived()) || h.t > 200)) {
      h.fired = true;
      for (const m of live) m.dest = null;
      const shots = this.mobAttacks();
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

  // start of a vehicle's turn inside the rising hazard
  fogDamage(t) {
    if (this.fogY === null || !t.alive || t.y < this.fogY) return;
    this.events.push(`${t.name} ${this.biome.sudden.hurt}.`);
    this.damage(t, (t.maxHp + t.maxArmour) * FOG_DMG, null);
  },

  // ------------------------------------------------------------ drawing
  drawHazardsBack(ctx, cam) {
    const top = cam.y - 40;
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
      ctx.fillRect(Math.round(cam.x) - 10, y, VIEW_W + 20, WORLD_BOTTOM + 1200 - y);
      ctx.fillStyle = rgb(sd.color, sd.alpha * 0.8);
      for (let x = Math.floor(cam.x / 24) * 24; x < cam.x + VIEW_W + 24; x += 24) {
        sq(ctx, x, y - 4 + Math.sin(x * 0.05 + this.time * 1.5) * 4, 14);
      }
    }
  },

  drawHazardLabels(ctx, cam) {
    for (const m of this.mobs) m.drawLabel(ctx, m.x - cam.x, m.y - cam.y);
    ctx.font = `12px ${HUD_FONT}`;
    ctx.textAlign = 'center';
    for (const f of this.fronts) {
      const sx = f.x - cam.x;
      if (sx < -60 || sx > VIEW_W + 60 || f.alpha < 0.3) continue;
      const sy = clamp(this.terrain.hAt(f.x) - cam.y - 40, 260, VIEW_H - 160);
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = 'rgba(32,32,74,0.85)';
      const label = `${this.frontName(f)}${f.kind === 'gale' ? (f.dir > 0 ? ' →' : ' ←') : ''}`;
      ctx.fillText(label, Math.round(sx), Math.round(sy));
      ctx.globalAlpha = 1;
    }
  },
});
