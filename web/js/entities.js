'use strict';
// Game objects. Tanks hold persistent per-player state (cash, wins, ammo) plus
// per-round state. Projectiles/acid/beams get a `game` handle for terrain, damage etc.

const PLAYER_COLORS = ['#3fd0d4', '#f4ad42', '#ef6461', '#a58bf0'];
const TANK_FUEL = 100;
const TANK_HP = 100;

function shade(hex, k) {
  const c = hexToRgb(hex);
  return k >= 0 ? rgb(mixRgb(c, [255, 255, 255], k)) : rgb(mixRgb(c, [0, 0, 0], -k));
}

class Tank {
  constructor(idx, cfg) {
    this.idx = idx;
    this.name = cfg.name;
    this.type = cfg.type; // 'human' | 'easy' | 'normal' | 'hard' | 'llm'
    this.color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
    this.cash = 1500;
    this.wins = 0;
    this.ammo = {};
    for (const w of WEAPONS) this.ammo[w.id] = w.infinite ? Infinity : 0;
    this.upgrades = { armor: 0, engine: 0 };
    this.stats = { dealt: 0, kills: 0 };
    this.weaponId = 'howitzer';
    this.lastPower = 0;
    this.lastTrail = null;
    this.speech = null;
    this.resetRound(W / 2);
  }

  get isCpu() { return this.type !== 'human'; }
  get maxHp() { return TANK_HP + 20 * this.upgrades.armor; }
  get maxFuel() { return TANK_FUEL + 40 * this.upgrades.engine; }
  get weapon() { return WEAPON_BY_ID[this.weaponId]; }

  resetRound(x, terrain) {
    this.x = x;
    this.y = terrain ? terrain.hAt(x) : H / 2;
    this.vy = 0;
    this.alive = true;
    this.hp = this.maxHp;
    this.fuel = this.maxFuel;
    this.facing = x < W / 2 ? 1 : -1;
    this.elev = 45;
    this.power = 0;
    this.tilt = 0;
    this.recoil = 0;
    this.flash = 0;
    this.falling = false;
    this.fallFrom = 0;
    this.dmgAcc = 0;
    this.roundDealt = 0;
    this.roundEarned = 0;
    this.speech = null;
    if (!this.weapon || (this.ammo[this.weaponId] <= 0)) this.weaponId = 'howitzer';
  }

  ownedWeapons() { return WEAPONS.filter((w) => this.ammo[w.id] > 0); }

  clampElev() {
    const w = this.weapon;
    this.elev = clamp(this.elev, w.elevMin, w.elevMax);
  }

  cycleWeapon(dir) {
    const owned = this.ownedWeapons();
    const i = owned.findIndex((w) => w.id === this.weaponId);
    this.selectWeapon(owned[(i + dir + owned.length) % owned.length].id);
  }

  selectWeapon(id) {
    if (!(this.ammo[id] > 0)) return;
    this.weaponId = id;
    this.clampElev();
  }

  say(text, secs) {
    this.speech = { text, age: 0, dur: secs || Math.max(3.2, 1.6 + text.length * 0.055) };
  }

  center() { return { x: this.x, y: this.y - 7 }; }

  pivot() {
    return { x: this.x + 11 * Math.sin(this.tilt), y: this.y - 11 * Math.cos(this.tilt) };
  }

  aimVec(elev = this.elev, facing = this.facing) {
    const e = rad(elev);
    return { x: facing * Math.cos(e), y: -Math.sin(e) };
  }

  muzzle(elev = this.elev, facing = this.facing) {
    const p = this.pivot();
    const v = this.aimVec(elev, facing);
    return { x: p.x + v.x * 19, y: p.y + v.y * 19 };
  }

  update(dt) {
    this.recoil = Math.max(0, this.recoil - dt * 2.5);
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.speech) {
      this.speech.age += dt;
      if (this.speech.age > this.speech.dur) this.speech = null;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);
    // tracks
    ctx.fillStyle = '#232837';
    ctx.beginPath();
    ctx.roundRect(-15, -6, 30, 6.5, 3);
    ctx.fill();
    ctx.fillStyle = '#4b546b';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-11 + i * 5.5, -3, 2.2, 0, TAU);
      ctx.fill();
    }
    // hull
    const g = ctx.createLinearGradient(0, -11, 0, -5);
    g.addColorStop(0, shade(this.color, 0.35));
    g.addColorStop(1, shade(this.color, -0.1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-13.5, -5.5);
    ctx.lineTo(-10, -10.8);
    ctx.lineTo(10, -10.8);
    ctx.lineTo(13.5, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(this.color, -0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(this.facing > 0 ? 9.5 : -11.5, -9, 2, 2);
    // turret
    ctx.fillStyle = shade(this.color, -0.28);
    ctx.beginPath();
    ctx.arc(0, -11, 5.8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.8})`;
      ctx.fillRect(-14, -17, 28, 17);
    }
    ctx.restore();

    // barrel (world-space so elevation is absolute)
    const pv = this.pivot();
    const v = this.aimVec();
    const len = 17 - this.recoil * 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(this.color, -0.6);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(pv.x, pv.y);
    ctx.lineTo(pv.x + v.x * len, pv.y + v.y * len);
    ctx.stroke();
    ctx.strokeStyle = shade(this.color, 0.1);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  drawLabel(ctx, active, t) {
    if (!this.alive) return;
    const bw = 36;
    const bx = this.x - bw / 2;
    const by = this.y - 33;
    ctx.fillStyle = 'rgba(8,12,24,0.7)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    const pct = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = pct > 0.5 ? '#6fe08a' : pct > 0.25 ? '#f1c94b' : '#f0605d';
    ctx.fillRect(bx, by, bw * pct, 4);
    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(8,12,24,0.85)';
    ctx.strokeText(this.name, this.x, by - 4);
    ctx.fillStyle = active ? '#ffffff' : 'rgba(230,238,255,0.8)';
    ctx.fillText(this.name, this.x, by - 4);
    if (active) {
      const bob = Math.sin(t * 5) * 2;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x, by - 17 + bob + 6);
      ctx.lineTo(this.x - 5, by - 17 + bob);
      ctx.lineTo(this.x + 5, by - 17 + bob);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawSpeech(ctx) {
    const s = this.speech;
    if (!s || !this.alive) return;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    const maxW = 170;
    const words = s.text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = 15;
    const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 16;
    const bh = lines.length * lh + 10;
    const bx = clamp(this.x - bw / 2, 6, W - bw - 6);
    const by = this.y - 52 - bh - 8;
    const fade = clamp(Math.min(s.age * 6, (s.dur - s.age) * 3), 0, 1);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(248,251,255,0.95)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - 5, by + bh);
    ctx.lineTo(this.x, by + bh + 7);
    ctx.lineTo(this.x + 5, by + bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#16203a';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 5 + lh * (i + 0.8)));
    ctx.globalAlpha = 1;
  }
}

class Projectile {
  constructor(game, w, owner, x, y, vx, vy) {
    this.w = w;
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.age = 0;
    this.split = false;
    this.trail = [];
    this.game = game;
  }

  // returns false when the projectile is finished
  update() {
    const g = this.game;
    const r = stepBallistic(this, this.w, g.terrain, g.wind, g.tanks, this.owner);
    this.trail.push(this.x, this.y);
    if (this.trail.length > 28) this.trail.splice(0, 2);
    if (this.age % 2 === 0) {
      if (this.w.id === 'coil' || this.w.kind === 'marker') g.particles.trailSpark(this.x, this.y, hexToRgb(this.w.color));
      else if (this.w.id !== 'bomblet') g.particles.smoke(this.x, this.y, 2.5);
    }
    if (!r) {
      if (this.w.kind === 'cluster' && !this.split && this.vy > 0 && this.age > 10) {
        this.split = true;
        g.clusterSplit(this);
        return false;
      }
      return true;
    }
    if (r.hit === 'out') return false;
    g.impact(this, r);
    return false;
  }

  draw(ctx) {
    const c = hexToRgb(this.w.color);
    ctx.lineCap = 'round';
    for (let i = 2; i < this.trail.length; i += 2) {
      const a = i / this.trail.length;
      ctx.strokeStyle = rgb(c, a * 0.55);
      ctx.lineWidth = 0.8 + a * (this.w.id === 'coil' ? 1.4 : 2);
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 2], this.trail[i - 1]);
      ctx.lineTo(this.trail[i], this.trail[i + 1]);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'lighter';
    const r = this.w.id === 'bomblet' ? 5 : 9;
    const gr = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    gr.addColorStop(0, rgb(c, 0.9));
    gr.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.w.id === 'bomblet' ? 1.6 : 2.4, 0, TAU);
    ctx.fill();
  }
}

class AcidDrop {
  constructor(game, owner, x, y, vx, vy) {
    this.game = game;
    this.owner = owner;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.stuck = false;
    this.life = 70 + Math.floor(Math.random() * 60);
    this.tick = 0;
  }

  update() {
    const g = this.game;
    this.tick++;
    if (!this.stuck) {
      this.vy += 0.12;
      this.vx += g.wind * 0.5;
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -20 || this.x > W + 20 || this.y > H + 20) return false;
      for (const t of g.tanks) {
        if (t.alive && Math.abs(this.x - t.x) < 13 && this.y > t.y - 15 && this.y < t.y + 2) {
          g.damage(t, 0.9, this.owner, true);
          return false;
        }
      }
      if (this.x >= 0 && this.x < W && this.y >= g.terrain.hAt(this.x)) {
        this.stuck = true;
        this.y = g.terrain.hAt(this.x);
        g.terrain.erode(this.x, 1.1);
      }
      return true;
    }
    if (this.tick % 5 === 0) g.terrain.erode(this.x, 0.1);
    this.y = g.terrain.hAt(this.x);
    for (const t of g.tanks) {
      if (t.alive && Math.abs(this.x - t.x) < 11 && Math.abs(this.y - t.y) < 8) g.damage(t, 0.05, this.owner, true);
    }
    return --this.life > 0;
  }

  draw(ctx) {
    const a = this.stuck ? clamp(this.life / 30, 0, 1) * 0.8 : 1;
    ctx.fillStyle = `rgba(150,240,90,${a})`;
    ctx.fillRect(this.x - 1.2, this.y - (this.stuck ? 1.5 : 1.2), 2.4, this.stuck ? 2 : 2.4);
    if (this.stuck && this.tick % 3 === 0 && Math.random() < 0.15) this.game.particles.smoke(this.x, this.y - 2, 2);
  }
}

// Orbital strike: telegraphed warning, then a column of light that bores a shaft.
class Beam {
  constructor(game, w, owner, x) {
    this.game = game;
    this.w = w;
    this.owner = owner;
    this.x = clamp(x, 6, W - 6);
    this.t = 0;
    this.warn = 55;
    this.fire = 24;
    game.sfx.beamWarn();
  }

  update() {
    this.t++;
    if (this.t === this.warn) this.game.beamStrike(this);
    return this.t < this.warn + this.fire;
  }

  draw(ctx) {
    const g = this.game;
    const gy = g.terrain.hAt(this.x);
    if (this.t < this.warn) {
      const p = this.t / this.warn;
      const pulse = 0.5 + 0.5 * Math.sin(this.t * (0.3 + p * 0.9));
      ctx.strokeStyle = `rgba(255,143,216,${0.2 + 0.5 * pulse})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x, 0);
      ctx.lineTo(this.x, gy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, gy, 10 + (1 - p) * 26, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, gy, 4, 0, TAU);
      ctx.stroke();
      return;
    }
    const p = (this.t - this.warn) / this.fire;
    const w = (1 - p) * (this.w.beamHalf + 6);
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(this.x - w * 2.2, 0, this.x + w * 2.2, 0);
    gr.addColorStop(0, 'rgba(255,100,210,0)');
    gr.addColorStop(0.5, `rgba(255,170,230,${0.9 * (1 - p * 0.6)})`);
    gr.addColorStop(1, 'rgba(255,100,210,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(this.x - w * 2.2, 0, w * 4.4, gy + 4);
    ctx.fillStyle = `rgba(255,255,255,${1 - p})`;
    ctx.fillRect(this.x - w * 0.55, 0, w * 1.1, gy + 4);
    ctx.globalCompositeOperation = 'source-over';
  }
}
