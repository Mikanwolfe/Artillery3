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

  // `delay` (seconds) holds the bubble back so several CPUs don't all talk at once
  say(text, secs, delay = 0) {
    this.speech = { text, age: -delay, dur: secs || Math.max(3.2, 1.6 + text.length * 0.055) };
  }

  center() { return { x: this.x, y: this.y - 7 }; }

  // turret pivot; tanks never rotate, so this is a fixed offset above the ground point
  pivot() {
    return { x: this.x, y: this.y - 13 };
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

  // tank = a little cluster of squares; the barrel is 5 squares slid along the aim direction
  draw(ctx) {
    if (!this.alive) return;
    const x = Math.round(this.x);
    const y = Math.round(this.drawY ?? this.y);
    const f = this.facing;
    ctx.fillStyle = '#2b2d33';
    for (let i = -12; i <= 12; i += 4) sq(ctx, x + i, y - 2, 4);
    ctx.fillStyle = '#6b6f78';
    for (let i = -10; i <= 10; i += 8) sq(ctx, x + i, y - 2, 2);
    ctx.fillStyle = this.color;
    for (const dx of [-9, -3, 3, 9]) sq(ctx, x + dx, y - 7, 6);
    ctx.fillStyle = shade(this.color, 0.3);
    for (const dx of [-6, 0, 6]) sq(ctx, x + dx, y - 9, 2);
    ctx.fillStyle = shade(this.color, -0.3);
    sq(ctx, x, y - 13, 8);
    ctx.fillStyle = '#fff3c0';
    sq(ctx, x + f * 11, y - 8, 2);
    // barrel
    const v = this.aimVec();
    const back = this.recoil * 4;
    for (let i = 0; i < 5; i++) {
      const d = 6 + i * 3.5 - back;
      ctx.fillStyle = i === 4 ? shade(this.color, -0.15) : shade(this.color, -0.55);
      sq(ctx, x + v.x * d, y - 13 + v.y * d, i === 4 ? 4 : 4 - i * 0.25);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.8})`;
      sq(ctx, x, y - 8, 26);
    }
  }

  drawLabel(ctx, active, t) {
    if (!this.alive) return;
    const x = Math.round(this.x);
    const y = Math.round(this.drawY ?? this.y);
    const bw = 34;
    const bx = x - bw / 2;
    const by = y - 32;
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    const pct = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = pct > 0.5 ? '#3fcf5a' : pct > 0.25 ? '#e8c22e' : '#e2412f';
    ctx.fillRect(bx, by, Math.round(bw * pct), 4);
    ctx.font = 'bold 10px Verdana, Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(this.name, x + 1, by - 3);
    ctx.fillStyle = active ? '#ffffff' : '#d8dde6';
    ctx.fillText(this.name, x, by - 4);
    if (active) {
      const bob = Math.round(Math.sin(t * 5) * 2);
      ctx.fillStyle = this.color;
      sq(ctx, x, by - 22 + bob, 8);
      sq(ctx, x, by - 17 + bob, 4);
    }
  }

  drawSpeech(ctx) {
    const s = this.speech;
    if (!s || !this.alive) return;
    ctx.font = '11px Verdana, Tahoma, sans-serif';
    const maxW = 170;
    const words = s.text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = 14;
    const bw = Math.round(Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 14);
    const bh = lines.length * lh + 8;
    const x = Math.round(this.x);
    const bx = Math.round(clamp(x - bw / 2, 6, W - bw - 6));
    const by = Math.round((this.drawY ?? this.y) - 52 - bh - 8);
    if (s.age < 0) return;
    ctx.globalAlpha = clamp((s.dur - s.age) * 3, 0, 1);
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#fffff4';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.color;
    ctx.fillRect(bx, by, 4, bh);
    ctx.fillStyle = '#000';
    sq(ctx, x, by + bh + 4, 6);
    sq(ctx, x, by + bh + 9, 3);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx + 2 + bw / 2, by + 4 + lh * (i + 0.8)));
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
    const small = this.w.id === 'bomblet';
    for (let i = 0; i < this.trail.length; i += 2) {
      const a = (i + 2) / this.trail.length;
      ctx.fillStyle = rgb(c, a * 0.6);
      sq(ctx, this.trail[i], this.trail[i + 1], 1 + a * (small ? 2 : 3));
    }
    ctx.fillStyle = rgb(c);
    sq(ctx, this.x, this.y, small ? 4 : 6);
    ctx.fillStyle = '#fff';
    sq(ctx, this.x, this.y, 2);
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
    const a = this.stuck ? clamp(this.life / 30, 0, 1) * 0.85 : 1;
    ctx.fillStyle = `rgba(130,230,70,${a})`;
    sq(ctx, this.x, this.y - (this.stuck ? 1 : 0), this.stuck ? 4 : 3);
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
    const gy = this.game.terrain.hAt(this.x);
    if (this.t < this.warn) {
      const p = this.t / this.warn;
      const pulse = 0.5 + 0.5 * Math.sin(this.t * (0.3 + p * 0.9));
      ctx.fillStyle = `rgba(255,120,200,${0.3 + 0.6 * pulse})`;
      for (let y = 6; y < gy; y += 12) sq(ctx, this.x, y, 3);
      const r = 8 + (1 - p) * 26;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) sq(ctx, this.x + dx * r, gy + dy * r * 0.6, 5);
      return;
    }
    const p = (this.t - this.warn) / this.fire;
    const outer = Math.max(2, (1 - p) * (this.w.beamHalf + 6) * 2.4);
    const inner = Math.max(1, outer * 0.4);
    ctx.fillStyle = `rgba(255,120,210,${0.8 * (1 - p * 0.6)})`;
    for (let y = gy; y > -outer; y -= outer) sq(ctx, this.x, y, outer);
    ctx.fillStyle = `rgba(255,255,255,${1 - p})`;
    for (let y = gy; y > -inner; y -= inner) sq(ctx, this.x, y, inner);
  }
}
