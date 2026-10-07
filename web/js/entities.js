'use strict';
// Game objects. Everything is drawn as plain axis-aligned boxes (no rotation): a vehicle is a pixel
// turret girl with her rigging and a barrel of squares, the MAIA satellite is built from squares, and
// a laser is a line of squares. Tanks hold per-player state (money, wins, weapons, upgrades).

const TANK_W = 34; // hitbox / footprint (world units)
const TANK_H = 34; // a turret girl stands about 44 tall; the hitbox covers her body and rigging
const TANK_FUEL = 250; // A3 Character._maxFuel (frames of movement)
const TANK_SPEED = 1.5; // A3 Constants.PlayerSpeed
const TANK_CLIMB = 2.2; // steepest slope (dy/dx) a vehicle can drive up

// Vehicle upgrades beyond A3's Health++ / Armour++ (which use Game.upgradeCost's curve). Each level
// is bought in turn from `costs`.
const VEHICLE_UPGRADES = [
  { id: 'engine', name: 'Engine & tracks', costs: [900, 1800, 3200], desc: '+40% fuel and steeper climbs per level.' },
  { id: 'computer', name: 'Ballistic computer', costs: [2800], desc: 'The aim guide and target marker account for wind, and the guide arc runs further.' },
  { id: 'workshop', name: 'Field workshop', costs: [1200, 2400, 4200], desc: 'Repairs 5% of max armour per level at the start of each of your turns.' },
];
const PLAYER_COLORS = ['#3d6fa8', '#b8433a', '#3e8a5a', '#7a4d9a'];

// Vehicles are drawn as turret girls (girls.js) carrying their weapon's skin (weaponskins.js).

// average slope of the ground under a vehicle's footprint (dy/dx), used to tilt it
function groundSlope(terrain, x) {
  return clamp((terrain.hAt(x + 18) - terrain.hAt(x - 18)) / 36, -1.2, 1.2);
}

class Tank {
  constructor(idx, cfg) {
    this.idx = idx;
    this.name = cfg.name;
    this.type = cfg.type; // 'human' | 'easy' | 'normal' | 'hard'
    this.vehicle = VEHICLES.find((v) => v.id === cfg.vehicle) || VEHICLES[0];
    this.color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
    this.money = 0;
    this.wins = 0;
    this.upgrades = { hp: 0, armour: 0, engine: 0, computer: 0, workshop: 0 };
    this.weapons = [this.vehicle.weapon.id];
    this.kits = 0; // repair kits carried (consumable)
    this.abilities = { double: 0, over: 0, shield: 0, barrier: 0 }; // 1 = owned (see ABILITIES)
    this.lastAttacker = null; // CPUs go after whoever last hurt them
    this.weaponIdx = 0;
    this.stats = { dealt: 0, kills: 0 };
    this.lastCharge = 0;
    this.lastTrail = null;
    this.speech = null;
    this.pose = 'idle';
    this.poseT = 0;
    this.resetRound(WORLD_W / 2);
  }

  get isCpu() { return this.type !== 'human'; }
  // A3 shop: Health++ / Armour++ multiply by 1.3 per level
  get maxHp() { return Math.round(this.vehicle.hp * Math.pow(1.3, this.upgrades.hp)); }
  get maxArmour() { return Math.round(this.vehicle.armour * Math.pow(1.3, this.upgrades.armour)); }
  get maxFuel() { return Math.round(TANK_FUEL * (this.vehicle.fuel || 1) * (1 + 0.4 * this.upgrades.engine)); }
  get climb() { return TANK_CLIMB + 0.5 * this.upgrades.engine; }
  get weapon() { return WEAPON_BY_ID[this.weapons[this.weaponIdx]] || WEAPON_BY_ID[this.weapons[0]]; }
  // full-charge muzzle speed for the next shot (Overcharge raises it)
  // owned and recharged
  abilityReady(id) { return this.abilities[id] > 0 && !(this.cooldown[id] > 0); }
  chargeCap() { return this.weapon.maxCharge * (this.armed.over ? OVERCHARGE : 1); }

  resetRound(x, terrain) {
    this.x = x;
    this.y = terrain ? terrain.hAt(x) : 1000;
    this.vy = 0;
    this.alive = true;
    this.hp = this.maxHp;
    this.armour = this.maxArmour;
    this.fuel = this.maxFuel;
    this.facing = x < WORLD_W / 2 ? 1 : -1;
    this.weaponIdx = Math.min(this.weaponIdx, this.weapons.length - 1);
    this.elev = (this.weapon.elevMin + this.weapon.elevMax) / 2;
    this.charge = 0;
    this.recoil = 0;
    this.flash = 0;
    this.tilt = terrain ? groundSlope(terrain, x) : 0;
    this.falling = false;
    this.fallFrom = 0;
    this.pose = 'idle';
    this.armed = { double: false, over: false };
    this.mark = null; // target marker (humans): the HUD shows the power needed to land on it
    this.cooldown = { double: 0, over: 0, shield: 0, barrier: 0 }; // own turns until each ability is ready again
    this.barrier = null; // Bulwark Barrier direction (unit vector), until the next turn
    this.shield = false;
    this.shotsLeft = 0;
    this.roundDealt = 0;
    this.dmgAcc = 0;
    this.speech = null;
  }

  clampElev() {
    const w = this.weapon;
    this.elev = clamp(this.elev, w.elevMin, w.elevMax);
  }

  cycleWeapon(dir) {
    this.weaponIdx = (this.weaponIdx + dir + this.weapons.length) % this.weapons.length;
    this.charge = 0;
    this.clampElev();
  }

  // girls.js poses: 'fire' and 'hit' play once, 'win' loops
  setPose(pose) { if (this.pose !== 'win' || pose === 'idle') { this.pose = pose; this.poseT = 0; } }

  say(text, secs, delay = 0) {
    this.speech = { text, age: -delay, dur: secs || Math.max(3.2, 1.6 + text.length * 0.055) };
  }

  center() { return { x: this.x, y: this.y - TANK_H / 2 }; }
  // the gun is mounted at the back of the superstructure (these are SPGs, not tanks)
  // (vehicles sit on slopes by shearing their boxes vertically, so the mount moves with the tilt)
  // (the girls stand upright on slopes, so the mount doesn't shift with the tilt; the hull angle
  // still pitches the elevation range, see aimVec)
  pivot(facing = this.facing) {
    const a = GIRL_ART[this.vehicle.id] || GIRL_ART.gwt;
    return { x: this.x + facing * a.pivot[0], y: this.y + a.pivot[1] };
  }

  // hull pitch in degrees for the given facing (+ = nose up), from the ground-slope tilt
  hullAngle(facing = this.facing) {
    return deg(Math.atan(-(this.tilt || 0) * facing));
  }

  // A3 measured elevation from the hull, not from level ground (Weapon._relativeAngle), so on a
  // slope the whole elevation range pitches with the vehicle
  aimVec(elev = this.elev, facing = this.facing) {
    const e = rad(elev + this.hullAngle(facing));
    return { x: facing * Math.cos(e), y: -Math.sin(e) };
  }

  muzzle(elev = this.elev, facing = this.facing) {
    const p = this.pivot(facing);
    const v = this.aimVec(elev, facing);
    const len = gunLength(this.weapon);
    return { x: p.x + v.x * len, y: p.y + v.y * len };
  }

  update(dt) {
    this.blink = (this.blink || 0) + dt;
    this.recoil = Math.max(0, this.recoil - dt * 2.5);
    this.walking = Math.max(0, (this.walking || 0) - 1);
    this.poseT = (this.poseT || 0) + dt;
    this.barrierHit = Math.max(0, (this.barrierHit || 0) - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.speech) {
      this.speech.age += dt;
      if (this.speech.age > this.speech.dur) this.speech = null;
    }
  }

  // world space. Box helper takes facing-right local coords (lx = left edge, ty = top edge
  // relative to the ground point) and mirrors them when the vehicle faces left. Boxes never
  // rotate: to sit on a slope each box is shifted vertically by tilt * its offset from centre.
  draw(ctx, active) {
    const f = this.facing;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const state = !this.alive ? 'wreck' : this.hp < this.maxHp * 0.5 ? 'damaged' : 'ok';
    const o = { id: this.vehicle.id, x, y, facing: f, color: this.color, state, t: this.blink || 0, walking: this.walking > 0, flash: this.flash, pose: this.pose || 'idle', poseT: this.poseT || 0 };
    // a turret girl (girls.js) with her rigging; the gun is the equipped weapon's skin (weaponskins.js)
    drawGirl(ctx, o);
    if (!this.alive) return;
    const p0 = this.pivot();
    const off = girlPivotOffset(o); // the victory hop lifts her rigging
    drawGun(ctx, this.weapon, { x: p0.x + off[0] * f, y: p0.y + off[1] }, this.aimVec(), f, this.recoil, shade(this.color, -0.5), this.blink || 0, active ? this.charge / this.chargeCap() : 0);
    drawGirlMount(ctx, o);
    if (this.barrier) {
      // Bulwark Barrier: an arc of plates on the side it faces, pulsing; brighter when it just blocked
      const b = this.barrier;
      const base = Math.atan2(b.y, b.x);
      const pulse = 0.55 + 0.25 * Math.sin((this.blink || 0) * 4) + (this.barrierHit || 0) * 0.4;
      for (let i = -6; i <= 6; i++) {
        const a = base + (i / 6) * Math.PI * 0.3;
        ctx.fillStyle = i % 2 ? `rgba(120,230,210,${pulse})` : `rgba(255,214,120,${pulse})`;
        sq(ctx, x + Math.cos(a) * 40, y - 20 + Math.sin(a) * 40, 6);
      }
    }
    if (this.shield) {
      // Deflector: a ring of pale squares around the hull, pulsing
      const a = 0.45 + 0.2 * Math.sin((this.blink || 0) * 5);
      ctx.fillStyle = `rgba(150,210,255,${a})`;
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * TAU;
        sq(ctx, x + Math.cos(t) * 32, y - 22 + Math.sin(t) * 30, 4);
      }
    }
    if (active) {
      // A3 sight: green marks at the elevation limits
      ctx.fillStyle = '#2e8b57';
      const p = this.pivot();
      for (const e of [this.weapon.elevMin, this.weapon.elevMax]) {
        const u = this.aimVec(e);
        for (let d = 36; d <= 52; d += 8) sq(ctx, p.x + u.x * d, p.y + u.y * d, 3);
      }
    }
  }

  // screen space (1600x900 HUD units); sx, sy = ground point on screen
  drawLabel(ctx, sx, sy, active) {
    if (!this.alive) return;
    ctx.textAlign = 'center';
    ctx.font = '15px "Maven Pro", Verdana, sans-serif';
    const title = `${this.name} | ${this.vehicle.name}`;
    const tw = ctx.measureText(title).width + 24;
    ctx.fillStyle = 'rgba(232,230,244,0.88)';
    ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - 100), Math.round(tw), 20);
    if (active) {
      ctx.fillStyle = this.color;
      ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - 100), 5, 20);
    }
    ctx.fillStyle = active ? '#20204a' : '#4a4a72';
    ctx.fillText(title, Math.round(sx), Math.round(sy - 85));
    // a CPU's grudge: a square in the colour of whoever it is out for
    if (this.isCpu && this.lastAttacker && this.lastAttacker.alive) {
      ctx.fillStyle = this.lastAttacker.color;
      ctx.fillRect(Math.round(sx + tw / 2 + 4), Math.round(sy - 96), 12, 12);
    }
    // bounty on the match leader
    if (this.bounty > 0) {
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(Math.round(sx - tw / 2 - 52), Math.round(sy - 100), 48, 20);
      ctx.fillStyle = '#20204a';
      ctx.font = '13px "Maven Pro", Verdana, sans-serif';
      ctx.fillText(`$${this.bounty}`, Math.round(sx - tw / 2 - 28), Math.round(sy - 85));
      ctx.font = '15px "Maven Pro", Verdana, sans-serif';
    }
    // armour | health bar | health  (A3 layout)
    const bw = 100;
    ctx.fillStyle = 'rgba(232,230,244,0.88)';
    ctx.fillRect(Math.round(sx - bw / 2), Math.round(sy - 76), bw, 16);
    ctx.fillStyle = 'rgb(87,128,109)';
    ctx.fillRect(Math.round(sx - bw / 2 + 6), Math.round(sy - 72), Math.round((bw - 12) * clamp(this.hp / this.maxHp, 0, 1)), 8);
    ctx.font = '15px "Maven Pro", Verdana, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(Math.ceil(this.armour), Math.round(sx - bw / 2 - 6), Math.round(sy - 62));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a5a7a';
    ctx.fillText(Math.ceil(this.hp), Math.round(sx + bw / 2 + 6), Math.round(sy - 62));
    if (active) {
      const w = this.weapon;
      ctx.font = '15px "Maven Pro", Verdana, sans-serif';
      ctx.textAlign = 'center';
      const ww = ctx.measureText(w.name).width + 30;
      ctx.fillStyle = 'rgba(200,200,214,0.88)';
      ctx.fillRect(Math.round(sx - ww / 2), Math.round(sy + 18), Math.round(ww), 20);
      // A3 badge: rarity + type letters in a square outlined in the rarity colour
      const bx = Math.round(sx - ww / 2 - 26);
      const by = Math.round(sy + 16);
      const rc = RARITY[w.rarity].color;
      ctx.fillStyle = 'rgba(200,200,214,0.88)';
      ctx.fillRect(bx, by, 24, 24);
      ctx.fillStyle = rc;
      ctx.fillRect(bx, by, 24, 1); ctx.fillRect(bx, by + 23, 24, 1); ctx.fillRect(bx, by, 1, 24); ctx.fillRect(bx + 23, by, 1, 24);
      ctx.font = '14px "Maven Pro", Verdana, sans-serif';
      ctx.fillText(badgeText(w), bx + 12, by + 17);
      ctx.font = '15px "Maven Pro", Verdana, sans-serif';
      ctx.fillStyle = w.rarity === 7 ? '#20204a' : RARITY[w.rarity].color;
      ctx.fillText(w.name, Math.round(sx), Math.round(sy + 33));
      // autoloader rounds left this turn
      for (let i = 0; i < w.clip; i++) {
        ctx.fillStyle = i < this.shotsLeft ? '#4682b4' : 'rgba(40,40,70,0.35)';
        ctx.fillRect(Math.round(sx - (w.clip * 10) / 2 + i * 10), Math.round(sy + 42), 7, 7);
      }
      // MAIA uplink from a supply crate: the next shot calls the satellite
      if (this.uplink) {
        ctx.fillStyle = 'rgb(255,120,200)';
        ctx.fillRect(Math.round(sx - ww / 2 - 44), Math.round(sy + 22), 12, 12);
        ctx.fillStyle = 'rgb(120,32,78)';
        ctx.fillRect(Math.round(sx - ww / 2 - 41), Math.round(sy + 25), 6, 6);
      }
      // repair kits carried: small green crosses (press R)
      for (let i = 0; i < this.kits; i++) {
        const kx = Math.round(sx + ww / 2 + 10 + i * 14);
        const ky = Math.round(sy + 22);
        ctx.fillStyle = '#3e8a5a';
        ctx.fillRect(kx + 4, ky, 4, 12);
        ctx.fillRect(kx, ky + 4, 12, 4);
      }
      // abilities owned: "key tag", lit up when armed, greyed with turns left while recharging
      const tags = ABILITIES.filter((a) => this.abilities[a.id] > 0);
      ctx.font = '13px "Maven Pro", Verdana, sans-serif';
      tags.forEach((a, i) => {
        const on = this.armed[a.id] || (a.id === 'shield' && this.shield);
        const cd = this.cooldown[a.id];
        const txt = cd > 0 && !on ? `${a.key} ${a.tag} · ${cd}` : `${a.key} ${a.tag}`;
        const bw2 = 64;
        const ax = Math.round(sx - (tags.length * (bw2 + 4)) / 2 + i * (bw2 + 4));
        ctx.fillStyle = on ? '#ffd84a' : cd > 0 ? 'rgba(120,120,140,0.6)' : 'rgba(200,200,214,0.88)';
        ctx.fillRect(ax, Math.round(sy + 54), bw2, 18);
        ctx.fillStyle = '#20204a';
        ctx.fillText(txt, ax + bw2 / 2, Math.round(sy + 67));
      });
    }
  }

  drawSpeech(ctx, sx, sy) {
    const s = this.speech;
    if (!s || !this.alive || s.age < 0) return;
    ctx.font = '15px "Maven Pro", Verdana, sans-serif';
    const maxW = 260;
    const words = s.text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = 19;
    const bw = Math.round(Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 20);
    const bh = lines.length * lh + 10;
    const bx = Math.round(clamp(sx - bw / 2, 8, VIEW_W - bw - 8));
    const by = Math.round(sy - 116 - bh);
    ctx.globalAlpha = clamp((s.dur - s.age) * 3, 0, 1);
    ctx.fillStyle = 'rgba(250,250,255,0.95)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.color;
    ctx.fillRect(bx, by, 5, bh);
    sq(ctx, sx, by + bh + 5, 8);
    ctx.fillStyle = '#20204a';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx + 3 + bw / 2, by + 6 + lh * (i + 0.75)));
    ctx.globalAlpha = 1;
  }
}

function shade(hex, k) {
  const c = hexToRgb(hex);
  return k >= 0 ? rgb(mixRgb(c, [255, 255, 255], k)) : rgb(mixRgb(c, [0, 0, 0], -k));
}

class Projectile {
  constructor(game, w, owner, x, y, vx, vy, main) {
    this.game = game;
    this.w = w;
    this.owner = owner;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.age = 0;
    this.main = main;
    this.trail = [];
    this.peak = y; // highest point reached (smallest y), for the altitude bonus
  }

  update() {
    const g = this.game;
    if (this.delay > 0) { this.delay--; return true; } // waiting its turn in a burst
    const r = stepBallistic(this, g.terrain, g.wind, g.targets(), this.owner);
    g.frontCheck(this);
    if (!r && this.w.kind === 'flak' && this.fuse(g)) { g.impact(this, { hit: 'air' }); return false; }
    if (this.y < this.peak) this.peak = this.y;
    if (this.age % 2 === 0) g.trace(this.x, this.y);
    // soot flecks shed in flight: they fall away behind the shell and fade
    if (this.age % 3 === 0) {
      const dark = Math.random() < 0.5;
      g.particles.add({
        x: this.x, y: this.y, vx: this.vx * 0.15 + (Math.random() - 0.5), vy: this.vy * 0.15 + Math.random() * 0.5,
        g: 0.12, drag: 0.97, life: 0.5 + Math.random() * 0.6, size: 2 + Math.random() * 3,
        color: dark ? [58, 44, 34] : [110, 78, 52],
      });
    }
    if (this.age % 2 === 0) {
      this.trail.push(this.x, this.y);
      if (this.trail.length > 24) this.trail.splice(0, 2);
    }
    if (!r) return true;
    if (r.hit !== 'out') g.impact(this, r);
    return false;
  }

  // flak proximity fuse: bursts near a mob or an enemy vehicle, or just above the ground on the way down
  fuse(g) {
    if (this.age < 10) return false;
    const r = 30 + this.w.dmgR * 0.25;
    for (const t of g.targets()) {
      if (!t.alive || t === this.owner) continue;
      const c = t.center();
      if (dist(c.x, c.y, this.x, this.y) < (t.isMob ? r + t.hw * 0.5 : r * 0.6)) return true;
    }
    return this.vy > 0 && this.y > g.terrain.hAt(this.x) - 60;
  }

  draw(ctx) {
    if (this.delay > 0) return;
    const sk = shellSkin(this.w);
    const col = sk.body;
    for (let i = 0; i < this.trail.length; i += 2) {
      const a = (i + 2) / this.trail.length;
      ctx.fillStyle = rgb([200, 200, 214], a * 0.6);
      sq(ctx, this.trail[i], this.trail[i + 1], 2 + a * 5);
    }
    // a shell is a body square with a lighter nose square pointing the way it flies
    const sp = Math.hypot(this.vx, this.vy) || 1;
    const nx = this.vx / sp;
    const ny = this.vy / sp;
    ctx.fillStyle = rgb(col);
    sq(ctx, this.x - nx * 3, this.y - ny * 3, sk.size);
    ctx.fillStyle = rgb(sk.nose);
    sq(ctx, this.x + nx * (sk.size / 2 + 1), this.y + ny * (sk.size / 2 + 1), Math.max(2, sk.size * 0.6));
  }
}

class AcidDrop {
  constructor(game, owner, x, y, vx, vy, dmg) {
    this.game = game;
    this.owner = owner;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg;
    this.color = [[255, 165, 0], [240, 220, 40], [60, 160, 50]][Math.floor(Math.random() * 3)];
    this.size = 5 + Math.random() * 5;
    this.stuck = false;
    this.life = 90 + Math.floor(Math.random() * 90);
    this.tick = 0;
  }

  update() {
    const g = this.game;
    this.tick++;
    if (!this.stuck) {
      this.vy += 0.3;
      this.vx += g.wind.x;
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -50 || this.x > WORLD_W + 50 || this.y > WORLD_BOTTOM) return false;
      for (const t of g.tanks) {
        if (t.alive && Math.abs(this.x - t.x) < TANK_W / 2 + 3 && this.y > t.y - TANK_H - 3 && this.y < t.y + 3) {
          g.damage(t, this.dmg * 6, this.owner, true);
          return false;
        }
      }
      if (this.x >= 0 && this.x < WORLD_W && this.y >= g.terrain.hAt(this.x)) {
        this.stuck = true;
        g.terrain.erode(this.x, 2);
      }
      return true;
    }
    this.y = g.terrain.hAt(this.x);
    if (this.tick % 6 === 0) g.terrain.erode(this.x, 0.4);
    for (const t of g.tanks) {
      if (t.alive && Math.abs(this.x - t.x) < TANK_W / 2 + 4 && Math.abs(this.y - t.y) < 10) g.damage(t, this.dmg * 0.15, this.owner, true);
    }
    return --this.life > 0;
  }

  draw(ctx) {
    ctx.fillStyle = rgb(this.color, this.stuck ? clamp(this.life / 40, 0, 1) : 1);
    sq(ctx, this.x, this.y - (this.stuck ? this.size / 2 : 0), this.size);
  }
}

// A line of squares from (x0,y0) to (x1,y1) that fades out (A3 Laser).
class Laser {
  constructor(x0, y0, x1, y1, color, width = 14, life = 70) {
    Object.assign(this, { x0, y0, x1, y1, color: hexToRgb(color), width, life, max: life });
  }

  update() { return --this.life > 0; }

  draw(ctx) {
    const t = this.life / this.max;
    const len = dist(this.x0, this.y0, this.x1, this.y1);
    const n = Math.max(1, Math.floor(len / 10));
    ctx.fillStyle = rgb(this.color, 0.55 * t);
    for (let i = 0; i <= n; i++) sq(ctx, lerp(this.x0, this.x1, i / n), lerp(this.y0, this.y1, i / n), this.width * (0.4 + 0.6 * t));
    ctx.fillStyle = `rgba(255,255,255,${t})`;
    for (let i = 0; i <= n; i++) sq(ctx, lerp(this.x0, this.x1, i / n), lerp(this.y0, this.y1, i / n), this.width * 0.3);
  }
}

// MAIA-class Low Orbit Ion Cannon. Sits above the map and fires at wherever a satellite-enabled
// weapon's shell lands. It is upgraded as the match goes on: three tiers spread across the rounds,
// each hitting harder and wider (and, as in A3, creeping up a little every turn within a round).
// Box-art but round: a stepped-disc body (the original's nested plum/navy circles), arms that curl
// around it, and antenna spars flaring out on one side like a wing; each tier adds rings and wing.
// Every part is placed in the satellite's own frame, so the whole thing turns to face its target;
// the squares themselves never rotate.
const SAT_TIERS = [null,
  { dmg: 70, dmgR: 130, explR: 12 },
  { dmg: 120, dmgR: 165, explR: 16 },
  { dmg: 190, dmgR: 210, explR: 22 },
];
const SAT_TURN_GAIN = 0.5; // A3 Constants.SatelliteDamageIncPerTurn

// which tier is active for a given round: thirds of the match (infinite mode, rounds = 0: level 2
// from round 3, level 3 from round 6)
function satelliteTier(round, rounds) {
  if (!rounds) return round >= 6 ? 3 : round >= 3 ? 2 : 1;
  return clamp(1 + Math.floor(((round - 1) * 3) / Math.max(1, rounds)), 1, 3);
}

class Satellite {
  constructor() {
    this.name = 'Maia';
    this.x = WORLD_W / 2;
    this.y = -300;
    this.tier = 1;
    this.turns = 0;
    this.angle = Math.PI / 2;
    this.angleDest = Math.PI / 2;
    this.charge = 0; // 0..1 while powering up for a strike
    this.t = 0;
    this.bob = 0;
  }

  setTier(tier) {
    this.tier = tier;
    this.turns = 0;
  }

  get damage() { return SAT_TIERS[this.tier].dmg + SAT_TURN_GAIN * this.turns; }
  get dmgR() { return SAT_TIERS[this.tier].dmgR; }
  get explR() { return SAT_TIERS[this.tier].explR; }
  get level() { return this.tier; }
  newTurn() { this.turns++; }
  lookAt(pt) { this.angleDest = Math.atan2(pt.y - this.y, pt.x - this.x); }
  update() {
    this.t++;
    this.bob = Math.sin(this.t / 50) * 5;
    // turns toward its target, with a slow idle sway so it never sits perfectly still
    this.angle += (this.angleDest + 0.07 * Math.sin(this.t / 80) - this.angle) / 20;
  }

  // local frame -> world: +x is the emitter direction
  toWorld(lx, ly) {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    return { x: this.x + lx * c - ly * s, y: this.y + this.bob + lx * s + ly * c };
  }

  // emitter tip, where the beam leaves
  lens() { return this.toWorld(104, 0); }

  draw(ctx) {
    const tier = this.tier;
    const main = 'rgb(120,32,78)';
    const accent = 'rgb(23,23,47)';
    const light = 'rgb(176,74,128)';
    const gold = 'rgb(232,190,90)';
    const metal = '#9aa0b4';
    const dot = (lx, ly, size, col) => {
      const p = this.toWorld(lx, ly);
      ctx.fillStyle = col;
      sq(ctx, p.x, p.y, size);
    };
    const polar = (r, deg) => [Math.cos(rad(deg)) * r, Math.sin(rad(deg)) * r];
    const c = this.toWorld(0, 0);

    // orbiting rings (tier II: one; tier III: two, counter-rotating). They spin on their own,
    // independent of where the satellite is pointing.
    const ring = (r, n, size, speed, col) => {
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + this.t * speed;
        sq(ctx, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.45, i % 3 === 0 ? size + 3 : size);
      }
    };
    if (tier >= 2) ring(150, 26, 6, 0.004, 'rgba(140,50,100,0.8)');
    if (tier >= 3) ring(185, 34, 5, -0.006, 'rgba(214,160,50,0.9)');

    // wing: antenna spars fanning out from a hub at the back, on one side only
    const fan = (hub, spars, scale, feathers, tipCol) => {
      spars.forEach(([deg, len], k) => {
        const L = len * scale;
        const [ux, uy] = polar(1, deg);
        for (let d = 10; d <= L; d += 6) {
          dot(hub[0] + ux * d, hub[1] + uy * d, 4, metal);
          if (feathers && d > 24 && d < L * 0.75 && (d / 6) % 2 < 1) dot(hub[0] + ux * d - uy * 6, hub[1] + uy * d + ux * 6, 7, 'rgba(62,78,150,0.9)');
        }
        const tipOn = ((this.t >> 4) + k) % spars.length === 0;
        dot(hub[0] + ux * (L + 6), hub[1] + uy * (L + 6), 7, tipOn ? '#ff8fd0' : tipCol);
      });
      dot(hub[0], hub[1], 12, accent);
    };
    if (tier >= 3) fan([-46, 30], [[122, 120], [137, 150], [152, 170], [167, 150], [182, 116]], 1, true, gold);
    if (tier === 1) fan([-34, 18], [[131, 90], [146, 110], [161, 90]], 1, false, light);
    else fan([-34, 18], [[116, 104], [131, 136], [146, 152], [161, 136], [176, 102]], 1, true, light);

    // arms curling around the body (tier I: short stubs; II: full to claws; III: doubled, gold claws)
    for (const side of [-1, 1]) {
      const end = tier === 1 ? 95 : 38;
      for (let deg = 160; deg >= end; deg -= 7.5) {
        const [ox, oy] = polar(64, deg * side);
        const [ix, iy] = polar(54, deg * side);
        dot(ix, iy, 5, accent);
        dot(ox, oy, 10, main);
        if (tier >= 3 && deg < 150) {
          const [qx, qy] = polar(78, deg * side);
          dot(qx, qy, 6, light);
        }
      }
      if (tier >= 2) {
        const [cx, cy] = polar(66, 32 * side);
        const clawCol = tier >= 3 ? gold : light;
        dot(cx, cy, 14, clawCol);
        dot(cx + 8, cy + side * -4, 6, clawCol);
        if ((this.t >> 5) % 2 === (side < 0 ? 0 : 1)) dot(cx, cy, 5, side < 0 ? '#ff4040' : '#40ff80');
      }
    }

    // round body as stepped discs (unrotated rows of boxes)
    const disc = (r, col) => {
      ctx.fillStyle = col;
      for (let y = -r; y < r; y += 6) {
        const yy = y + 3;
        const w = 2 * Math.sqrt(Math.max(0, r * r - yy * yy));
        ctx.fillRect(Math.round(c.x - w / 2), Math.round(c.y + y), Math.round(w), 6);
      }
    };
    disc(44, main);
    disc(37, accent);
    disc(28, main);
    if (tier >= 3) disc(18, light);
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 12);
    ctx.fillStyle = `rgba(255,190,230,${0.45 + 0.35 * pulse + this.charge * 0.2})`;
    sq(ctx, c.x, c.y, 14 + this.charge * 16);

    // emitter barrel and lens (heavier at higher tiers)
    for (let i = 0; i < 6; i++) dot(40 + i * 11, 0, 16 - i + (tier - 1) * 2, accent);
    if (tier >= 2) { dot(60, -10, 5, light); dot(60, 10, 5, light); }
    dot(104, 0, 12 + (tier - 1) * 3, tier >= 3 ? gold : main);
    // charging: sparks spiral into the lens and the tip whitens
    if (this.charge > 0) {
      const l = this.lens();
      for (let i = 0; i < 10 + tier * 4; i++) {
        const an = i * 0.63 + this.t * 0.15;
        const r = 70 * (1 - ((this.charge * 3 + i / 10) % 1));
        ctx.fillStyle = `rgba(255,240,250,${0.4 + this.charge * 0.6})`;
        sq(ctx, l.x + Math.cos(an) * r, l.y + Math.sin(an) * r, 5);
      }
      ctx.fillStyle = `rgba(255,255,255,${this.charge})`;
      sq(ctx, l.x, l.y, 6 + this.charge * 16);
    }
  }
}

// Supply drop (A3's design notes listed crates and item drops as entities that never got built).
// Parachutes in mid-round, drifting with the wind; claimed by driving into it or by catching it in
// any blast. Contents stay hidden until it is claimed.
const CRATE_KINDS = [
  { id: 'repair', w: 3 }, { id: 'cash', w: 3 }, { id: 'armour', w: 2 }, { id: 'uplink', w: 2 },
];

class Crate {
  constructor(x, kind) {
    this.x = x;
    this.y = -150;
    this.kind = kind;
    this.landed = false;
    this.alive = true;
    this.t = 0;
  }

  update(game) {
    this.t++;
    if (!this.landed) {
      this.y += 2.2;
      this.x = clamp(this.x + game.wind.x * 12, 40, WORLD_W - 40);
      const gy = game.terrain.hAt(this.x);
      if (this.y >= gy) {
        this.y = gy;
        this.landed = true;
        game.particles.puff(this.x, this.y);
      }
    } else this.y = game.terrain.hAt(this.x);
  }

  draw(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    if (!this.landed) {
      // striped canopy as a stepped dome, with rigging lines of squares down to the crate
      const cy = y - 62;
      for (let i = -4; i <= 4; i++) {
        const h = Math.round(Math.sqrt(Math.max(0, 25 - i * i)) * 3.2);
        ctx.fillStyle = i % 2 ? '#d8402c' : '#f4f4f8';
        ctx.fillRect(x + i * 6 - 3, cy - h, 6, h);
      }
      ctx.fillStyle = '#6b6f78';
      for (const ex of [-27, 0, 27]) {
        for (let k = 1; k < 6; k++) sq(ctx, lerp(x + ex, x, k / 6), lerp(cy, y - 18, k / 6), 2);
      }
    }
    ctx.fillStyle = 'rgb(96,72,48)';
    ctx.fillRect(x - 10, y - 18, 20, 18);
    ctx.fillStyle = 'rgb(176,136,84)';
    ctx.fillRect(x - 8, y - 16, 16, 14);
    ctx.fillStyle = 'rgb(96,72,48)';
    ctx.fillRect(x - 8, y - 10, 16, 2);
    ctx.fillRect(x - 1, y - 16, 2, 14);
    if (this.landed && (this.t >> 4) % 2 === 0) {
      ctx.fillStyle = '#ffd84a';
      sq(ctx, x, y - 22, 4);
    }
  }
}
