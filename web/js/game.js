'use strict';
// Game: owns the match state machine (menu -> aim -> resolve -> roundEnd -> shop -> ... -> gameEnd),
// the fixed-timestep simulation, damage/economy rules and canvas rendering.

class Input {
  constructor(game) {
    this.g = game;
    this.ctl = new Ctl();
    this.queue = [];
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.ctl.reset());
  }

  key(e, down) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const c = this.ctl;
    let handled = true;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': c.left = down; break;
      case 'ArrowRight': case 'KeyD': c.right = down; break;
      case 'ArrowUp': case 'KeyW': c.up = down; break;
      case 'ArrowDown': case 'KeyS': c.down = down; break;
      case 'ShiftLeft': case 'ShiftRight': c.fine = down; break;
      case 'Space':
        if (down && !e.repeat) c.charge = true;
        else if (!down) c.charge = false;
        break;
      case 'KeyQ': if (down && !e.repeat) this.queue.push({ cycle: -1 }); break;
      case 'KeyE': case 'Tab': if (down && !e.repeat) this.queue.push({ cycle: 1 }); break;
      case 'KeyM': if (down && !e.repeat) this.g.toggleMute(); break;
      case 'Escape': if (down && !e.repeat) this.g.togglePause(); break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          if (down && !e.repeat) this.queue.push({ slot: +e.code.slice(5) - 1 });
        } else handled = false;
    }
    if (handled && this.g.phase !== 'menu') e.preventDefault();
  }
}

class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.sfx = new Sfx();
    this.particles = new Particles();
    this.terrain = new Terrain();
    this.bg = null;
    this.tanks = [];
    this.projectiles = [];
    this.drops = [];
    this.beams = [];
    this.wind = 0;
    this.shake = 0;
    this.phase = 'menu';
    this.round = 0;
    this.rounds = 3;
    this.events = [];
    this.time = 0;
    this.speed = 1;
    this.paused = false;
    this.active = null;
    this.cpu = null;
    this.charging = false;
    this.k = 1;
    this.input = new Input(this);
    this.newEnvironment();
  }

  // ------------------------------------------------------------ setup
  newEnvironment() {
    const p = rng.pick(PRESETS);
    this.bg = new Background(p);
    this.terrain.setPalette({ rockTop: p.rockTop, rockBot: p.rockBot, snow: p.snow });
    this.terrain.generate();
  }

  resize(cssWidth) {
    this.k = clamp((cssWidth * Math.min(2, window.devicePixelRatio || 1)) / W, 1, 2);
    this.canvas.width = Math.round(W * this.k);
    this.canvas.height = Math.round(H * this.k);
  }

  startMatch(configs, rounds) {
    this.sfx.unlock();
    LlmBrain.failures = 0;
    LlmBrain.lastError = '';
    this.tanks = configs.map((c, i) => new Tank(i, c));
    this.rounds = rounds;
    this.round = 0;
    this.events = [];
    this.ui.showHud(true);
    this.startRound();
  }

  startRound() {
    this.round++;
    this.newEnvironment();
    this.projectiles = [];
    this.drops = [];
    this.beams = [];
    this.particles.clear();
    this.placeTanks();
    this.wind = rng.range(-0.012, 0.012);
    this.turnCount = 0;
    this.order = rng.shuffle(this.tanks.map((_, i) => i));
    this.turnPtr = -1;
    this.events.push(`Round ${this.round} begins on the ${this.bg.preset.name.toLowerCase()} range.`);
    this.nextTurn();
  }

  placeTanks() {
    const n = this.tanks.length;
    const slot = (W - 120) / n;
    const xs = this.tanks.map((_, i) => 60 + slot * (i + 0.5) + rng.range(-slot * 0.2, slot * 0.2));
    rng.shuffle(xs);
    this.tanks.forEach((t, i) => {
      this.terrain.flatten(xs[i], 16);
      t.resetRound(xs[i], this.terrain);
    });
  }

  nextTurn() {
    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length <= 1) { this.endRound(); return; }
    do { this.turnPtr = (this.turnPtr + 1) % this.order.length; } while (!this.tanks[this.order[this.turnPtr]].alive);
    const t = this.tanks[this.order[this.turnPtr]];
    this.active = t;
    if (this.turnCount++ > 0) this.wind = clamp(this.wind + rng.range(-0.005, 0.005), -0.012, 0.012);
    t.fuel = t.maxFuel;
    t.power = 0;
    t.clampElev();
    this.input.ctl.reset();
    this.input.queue.length = 0;
    this.charging = false;
    this.sfx.chargeStop();
    this.phase = 'aim';
    this.cpu = t.isCpu ? new CpuController(this, t) : null;
    this.ui.turn(t);
  }

  // ------------------------------------------------------------ main loop
  step() {
    this.time += DT;
    this.bg.update(DT, this.wind);
    this.particles.update(DT);
    for (const t of this.tanks) {
      t.update(DT);
      if (t.alive && t.hp < 35 && Math.random() < 0.04) this.particles.smoke(t.x, t.y - 10, 3);
    }
    this.stepTanks();
    if (this.phase === 'aim') this.updateAim(DT);
    else if (this.phase === 'resolve') this.updateResolve();
    this.shake *= 0.9;
  }

  stepTanks() {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const gy = this.terrain.hAt(t.x);
      if (t.y < gy - 0.5) {
        if (!t.falling) { t.falling = true; t.fallFrom = t.y; t.vy = 0; }
        t.vy += 0.22;
        t.y += t.vy;
        if (t.y >= gy) { t.y = gy; this.land(t); }
      } else {
        if (t.falling) this.land(t);
        t.y = gy;
      }
      t.tilt += (clamp(this.terrain.slope(t.x, 9), -0.8, 0.8) - t.tilt) * 0.25;
    }
  }

  land(t) {
    const fall = t.y - t.fallFrom;
    t.falling = false;
    t.vy = 0;
    if (fall > 4) { this.sfx.thud(); this.particles.dust(t.x, t.y, 8); }
    if (fall > 35) this.damage(t, (fall - 35) * 0.4, null);
  }

  moveTank(t, dir, dt) {
    t.facing = dir;
    if (t.fuel <= 0) return;
    const step = 38 * dt;
    const nx = t.x + dir * step;
    if (nx < 14 || nx > W - 14) return;
    if ((this.terrain.hAt(t.x) - this.terrain.hAt(nx)) / step > 1.4) return;
    for (const o of this.tanks) {
      if (o !== t && o.alive && Math.abs(o.x - nx) < 24 && Math.abs(o.x - nx) < Math.abs(o.x - t.x)) return;
    }
    t.x = nx;
    t.fuel = Math.max(0, t.fuel - step);
  }

  updateAim(dt) {
    const t = this.active;
    let c;
    if (this.cpu) {
      this.cpu.update(dt);
      c = this.cpu.ctl;
    } else {
      c = this.input.ctl;
      const q = this.input.queue.splice(0);
      for (const a of q) {
        if (a.cycle) { t.cycleWeapon(a.cycle); this.sfx.click(); }
        else if (a.slot !== undefined) {
          const w = t.ownedWeapons()[a.slot];
          if (w) { t.selectWeapon(w.id); this.sfx.click(); }
        }
      }
    }
    if (c.left) this.moveTank(t, -1, dt);
    if (c.right) this.moveTank(t, 1, dt);
    const rate = (c.fine ? 10 : 40) * dt;
    if (c.up) t.elev += rate;
    if (c.down) t.elev -= rate;
    t.clampElev();
    if (c.charge) {
      if (!this.charging) { this.charging = true; this.sfx.chargeStart(); }
      t.power = Math.min(100, t.power + 55 * dt);
      this.sfx.chargeUpdate(t.power);
    } else if (this.charging) {
      this.charging = false;
      this.sfx.chargeStop();
      if (t.power >= 5) this.fire(t);
      else t.power = 0;
    }
  }

  fire(t) {
    const w = t.weapon;
    if (!(t.ammo[w.id] > 0)) return;
    if (!w.infinite) t.ammo[w.id]--;
    const m = t.muzzle();
    const v = t.power * SPEED_PER_POWER * w.speed;
    const a = rad(t.elev);
    const p = new Projectile(this, w, t, m.x, m.y, t.facing * v * Math.cos(a), -v * Math.sin(a));
    p.rec = [];
    this.projectiles.push(p);
    const dir = t.aimVec();
    this.particles.muzzle(m.x, m.y, Math.atan2(dir.y, dir.x));
    this.sfx.shot(w);
    this.shake = Math.max(this.shake, 2 + t.power * 0.03);
    t.recoil = 1;
    t.lastPower = t.power;
    t.power = 0;
    this.events.push(`${t.name} fired the ${w.name}.`);
    this.phase = 'resolve';
    this.resolveSteps = 0;
    this.quiet = 0;
    this.ui.turn(t);
  }

  updateResolve() {
    this.resolveSteps++;
    // projectiles may spawn others (cluster split) mid-update: queue those instead of
    // pushing into the array being rebuilt
    const next = [];
    this.spawned = [];
    for (const p of this.projectiles) {
      const alive = p.update();
      if (p.rec && p.age % 3 === 0) p.rec.push(p.x, p.y);
      if (!alive && p.rec) p.owner.lastTrail = p.rec;
      if (alive) next.push(p);
    }
    this.projectiles = next.concat(this.spawned);
    this.spawned = [];
    this.drops = this.drops.filter((d) => d.update());
    this.beams = this.beams.filter((b) => b.update());
    const busy = this.projectiles.length || this.drops.length || this.beams.length || this.tanks.some((t) => t.alive && t.falling);
    this.quiet = busy ? 0 : this.quiet + 1;
    if (this.quiet > 45 || this.resolveSteps > 60 * 30) {
      this.projectiles.length = this.drops.length = this.beams.length = 0;
      this.finishTurn();
    }
  }

  finishTurn() {
    const t = this.active;
    if (t && t.ammo[t.weaponId] <= 0) t.weaponId = 'howitzer';
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
    this.nextTurn();
  }

  // ------------------------------------------------------------ combat rules
  impact(p, r) {
    const w = p.w;
    if (w.kind === 'marker') {
      this.particles.explosion(p.x, p.y, 8, [255, 140, 220]);
      this.beams.push(new Beam(this, w, p.owner, p.x));
      return;
    }
    if (w.kind === 'cluster') {
      const s = w.sub;
      this.explode(p.x, p.y, { dmg: s.dmg * 1.8, blast: s.blast * 1.5, dmgR: s.dmgR * 1.4 }, p.owner);
      return;
    }
    this.explode(p.x, p.y, w, p.owner);
    if (w.kind === 'acid') {
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI * (0.08 + 0.84 * Math.random());
        const s = 1.2 + Math.random() * 3.2;
        this.drops.push(new AcidDrop(this, p.owner, p.x, p.y - 2, Math.cos(a) * s, Math.sin(a) * s));
      }
      this.sfx.acid();
    }
  }

  clusterSplit(p) {
    const s = p.w.sub;
    this.particles.add({ type: 'fireball', x: p.x, y: p.y, life: 0.2, r: 16, color: [255, 200, 120] });
    this.sfx.click();
    const def = { id: 'bomblet', kind: 'shell', grav: 1, wind: 1, speed: 1, color: '#ffcf8a', dmg: s.dmg, blast: s.blast, dmgR: s.dmgR };
    for (let i = 0; i < s.count; i++) {
      // the centre bomblet keeps the parent's exact velocity so it lands where the shell would have
      const spread = (i - (s.count - 1) / 2) * 0.45;
      const jitter = i === (s.count - 1) / 2 ? 0 : (Math.random() - 0.3) * 0.4;
      this.spawned.push(new Projectile(this, def, p.owner, p.x, p.y, p.vx + spread, p.vy + jitter));
    }
  }

  explode(x, y, def, owner) {
    this.terrain.crater(x, y, def.blast);
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const c = t.center();
      const d = dist(c.x, c.y, x, y);
      if (d < def.dmgR + 8) {
        const amt = def.dmg * clamp(1 - (d - 6) / def.dmgR, 0, 1);
        if (amt >= 1) this.damage(t, amt, owner);
      }
    }
    this.particles.explosion(x, y, def.blast * 0.9 + 6);
    this.sfx.explosion(def.blast);
    this.shake = Math.max(this.shake, Math.min(12, def.blast * 0.22));
  }

  beamStrike(b) {
    const half = b.w.beamHalf;
    this.sfx.beamFire();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const dx = Math.abs(t.x - b.x);
      const amt = b.w.dmg * (dx <= half ? 1 : clamp(1 - (dx - half) / 40, 0, 1));
      if (amt >= 1) this.damage(t, amt, b.owner);
    }
    const gy = this.terrain.hAt(b.x);
    this.terrain.shaft(b.x, half - 1, 85);
    this.particles.explosion(b.x, gy, 30, [255, 150, 225]);
    for (let i = 0; i < 40; i++) {
      this.particles.add({
        type: 'spark', x: b.x + (Math.random() - 0.5) * 12, y: gy - Math.random() * 120,
        vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 3, g: 0.05, life: 0.6, size: 1.6, color: [255, 190, 240],
      });
    }
    this.shake = Math.max(this.shake, 9);
  }

  damage(t, amt, owner, quiet = false) {
    if (!t.alive || amt <= 0) return;
    t.hp -= amt;
    t.flash = 1;
    if (owner && owner !== t) {
      owner.stats.dealt += amt;
      owner.roundDealt += amt;
      owner.cash += amt * 3;
      owner.roundEarned += amt * 3;
    }
    if (quiet) {
      t.dmgAcc += amt;
      if (t.dmgAcc >= 6) {
        this.particles.text(t.x, t.y - 42, '-' + Math.round(t.dmgAcc), '#b6f27a');
        t.dmgAcc = 0;
      }
    } else {
      this.particles.text(t.x, t.y - 42, '-' + Math.round(amt), '#ff9d8a', amt > 40);
      this.sfx.hit();
      if (owner && owner !== t) this.events.push(`${owner.name} hit ${t.name} for ${Math.round(amt)}.`);
      else if (!owner) this.events.push(`${t.name} took ${Math.round(amt)} from a fall.`);
    }
    if (t.hp <= 0) this.kill(t, owner);
  }

  kill(t, owner) {
    t.hp = 0;
    t.alive = false;
    t.speech = null;
    this.particles.explosion(t.x, t.y - 6, 36, [255, 170, 70]);
    this.particles.explosion(t.x, t.y - 14, 20, [255, 120, 60]);
    this.sfx.explosion(45);
    this.shake = Math.max(this.shake, 10);
    if (owner && owner !== t) {
      owner.stats.kills++;
      owner.cash += 300;
      owner.roundEarned += 300;
      this.particles.text(t.x, t.y - 55, '+$300', '#ffe27a', true);
      this.events.push(`${owner.name} destroyed ${t.name}!`);
    } else {
      this.events.push(`${t.name} destroyed themselves.`);
    }
  }

  say(tank, text) {
    tank.say(text);
    this.events.push(`${tank.name}: "${text}"`);
    this.ui.chat(tank, text);
  }

  // ------------------------------------------------------------ round / shop flow
  endRound() {
    this.phase = 'roundEnd';
    this.sfx.chargeStop();
    const alive = this.tanks.filter((t) => t.alive);
    const winner = alive[0] || null;
    for (const t of this.tanks) {
      t.cash += 400;
      t.roundEarned += 400;
    }
    if (winner) {
      winner.wins++;
      winner.cash += 600;
      winner.roundEarned += 600;
      this.sfx.win();
      this.events.push(`${winner.name} wins round ${this.round}.`);
    } else this.events.push(`Round ${this.round} ends in mutual destruction.`);
    for (const t of this.tanks) t.cash = Math.round(t.cash);
    const last = this.round >= this.rounds;
    this.ui.showRoundEnd({ round: this.round, winner, tanks: this.tanks }, last);
    for (const t of this.tanks.filter((x) => x.type === 'llm')) {
      const situation = t === winner ? 'you just won the round' : winner ? `${winner.name} just won the round` : 'everyone died at once';
      LlmBrain.quip(this, t, situation).then((line) => line && this.ui.addQuip(t, line));
    }
  }

  afterRoundEnd() {
    if (this.round >= this.rounds) {
      const st = this.tanks.slice().sort((a, b) => b.wins - a.wins || b.cash - a.cash);
      this.phase = 'gameEnd';
      this.ui.showHud(false);
      this.ui.showGameEnd(st);
      return;
    }
    this.phase = 'shop';
    for (const t of this.tanks.filter((x) => x.isCpu)) this.autoBuy(t);
    this.shopQueue = this.tanks.filter((t) => !t.isCpu);
    this.nextShop();
  }

  nextShop() {
    const t = this.shopQueue.shift();
    if (!t) { this.ui.hideShop(); this.startRound(); return; }
    this.ui.showShop(t, () => this.nextShop());
  }

  buy(tank, kind, id) {
    let item;
    let cost;
    if (kind === 'weapon') {
      item = WEAPON_BY_ID[id];
      cost = item.cost;
    } else {
      item = UPGRADES.find((u) => u.id === id);
      cost = item.cost;
      if (tank.upgrades[id] >= item.max) return false;
    }
    if (tank.cash < cost) { this.sfx.deny(); return false; }
    tank.cash -= cost;
    if (kind === 'weapon') tank.ammo[id] += item.pack;
    else tank.upgrades[id]++;
    this.sfx.buy();
    return true;
  }

  autoBuy(t) {
    const shopW = WEAPONS.filter((w) => w.cost > 0).sort((a, b) => b.cost - a.cost);
    for (let n = 0; n < 3; n++) {
      if (rng.chance(0.3)) {
        const u = rng.pick(UPGRADES);
        if (t.upgrades[u.id] < u.max && t.cash >= u.cost) { t.cash -= u.cost; t.upgrades[u.id]++; continue; }
      }
      const afford = shopW.filter((w) => w.cost <= t.cash);
      if (!afford.length) break;
      const w = afford[Math.floor(Math.pow(rng.next(), 2) * afford.length)];
      t.cash -= w.cost;
      t.ammo[w.id] += w.pack;
    }
  }

  // ------------------------------------------------------------ misc controls
  toggleMute() {
    this.sfx.unlock();
    this.sfx.setMuted(!this.sfx.muted);
    this.ui.syncMute();
  }

  togglePause() {
    if (this.phase === 'menu' || this.phase === 'gameEnd') return;
    this.paused = !this.paused;
    this.ui.showPause(this.paused);
  }

  // ------------------------------------------------------------ frame
  frame(dtReal) {
    if (!this.paused) {
      this.acc = (this.acc || 0) + Math.min(0.1, dtReal) * this.speed;
      let n = 0;
      while (this.acc >= DT && n < 800) { this.step(); this.acc -= DT; n++; }
    }
    this.render();
    this.ui.updateHud(this);
  }

  render() {
    const ctx = this.ctx;
    const k = this.k;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.save();
    if (this.shake > 0.15) ctx.translate((Math.random() - 0.5) * this.shake * 2, (Math.random() - 0.5) * this.shake * 2);
    this.bg.drawBack(ctx);
    this.terrain.render();
    ctx.drawImage(this.terrain.canvas, 0, 0);

    const active = this.phase === 'aim' ? this.active : null;
    if (active && !this.cpu) this.drawGhost(ctx, active);
    for (const t of this.tanks) t.draw(ctx);
    for (const t of this.tanks) t.drawLabel(ctx, t === active || (this.phase === 'resolve' && t === this.active), this.time);
    if (active) this.drawAim(ctx, active);
    for (const b of this.beams) b.draw(ctx);
    for (const d of this.drops) d.draw(ctx);
    for (const p of this.projectiles) {
      p.draw(ctx);
      if (p.y < -6) this.drawOffscreen(ctx, p);
    }
    this.particles.draw(ctx);
    for (const t of this.tanks) t.drawSpeech(ctx);
    this.bg.drawSnow(ctx);
    ctx.restore();
  }

  drawGhost(ctx, t) {
    if (!t.lastTrail || t.lastTrail.length < 4) return;
    ctx.fillStyle = t.color;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < t.lastTrail.length; i += 2) ctx.fillRect(t.lastTrail[i] - 1, t.lastTrail[i + 1] - 1, 2, 2);
    ctx.globalAlpha = 1;
  }

  drawOffscreen(ctx, p) {
    const x = clamp(p.x, 8, W - 8);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = clamp(1 + p.y / 400, 0.35, 1);
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x - 5, 13);
    ctx.lineTo(x + 5, 13);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(-p.y) + 'm', x, 25);
  }

  drawAim(ctx, t) {
    const w = t.weapon;
    const pv = t.pivot();
    // allowed elevation range
    ctx.strokeStyle = 'rgba(190,235,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let e = w.elevMin; e <= w.elevMax; e += 5) {
      const v = t.aimVec(e);
      const px = pv.x + v.x * 30;
      const py = pv.y + v.y * 30;
      if (e === w.elevMin) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const v = t.aimVec();
    const m = t.muzzle();
    if (t.power > 0) {
      const len = 6 + t.power * 0.6;
      const frac = t.power / 100;
      ctx.strokeStyle = `hsl(${120 - frac * 120},90%,60%)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(m.x + v.x * 3, m.y + v.y * 3);
      ctx.lineTo(m.x + v.x * (3 + len), m.y + v.y * (3 + len));
      ctx.stroke();
    }
    if (t.lastPower > 0 && !this.cpu) {
      const len = 3 + 6 + t.lastPower * 0.6;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x + v.x * len - v.y * 4, m.y + v.y * len + v.x * 4);
      ctx.lineTo(m.x + v.x * len + v.y * 4, m.y + v.y * len - v.x * 4);
      ctx.stroke();
    }
  }
}
