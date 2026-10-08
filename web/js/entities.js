'use strict';
// Game objects. Everything is drawn as plain axis-aligned boxes (no rotation): a vehicle is a pixel
// turret girl with her rigging and a barrel of squares, the MAIA satellite is built from squares, and
// a laser is a line of squares. Tanks hold per-player state (money, wins, weapons, upgrades).

const TANK_W = 34; // hitbox / footprint (world units)
// girls.js draws the turret girls 64-72 tall; in the world they're scaled down to about the size
// the original vehicles were (34 x 20), so the map keeps its sense of scale
const GIRL_SCALE = 0.6;
const TANK_H = 34; // hitbox height: her body and rigging at GIRL_SCALE
const LABEL_LIFT = 38; // HUD labels sit this much lower than they did over full-size girls
const TANK_FUEL = 250; // A3 Character._maxFuel (frames of movement)
const TANK_SPEED = 2; // A3 Constants.PlayerSpeed was 1.5; quicker, so there's time to reach cover
const TANK_CLIMB = 3.2; // steepest slope (dy/dx) a vehicle can drive up
// jump (W): a hop in the facing direction for a share of the tank's full fuel; clears ridges and
// lands on fort tops
const JUMP_FUEL = 0.3;
const JUMP_VY = -12; // up to about 120 units high: enough to top a fort from the ground beside it
const JUMP_VX = 3.2; // and about 100 along

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
  // reloads (rebalanced): own turns until a gun can fire again; 0 = ready
  reloadLeft(id) { return this.reload[id] | 0; }
  weaponReady(id = this.weapon.id) { return !(this.reload[id] > 0); }
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
    this.jvx = 0; // sideways speed during a jump
    this.fallFrom = 0;
    this.pose = 'idle';
    this.armed = { double: false, over: false };
    this.mark = null; // target marker (humans): the HUD shows the power needed to land on it
    this.aimMemo = null; // CPUs: ranging-in memory per target (ai.js)
    this.cooldown = { double: 0, over: 0, shield: 0, barrier: 0 }; // own turns until each ability is ready again
    this.reload = {}; // weapon id -> own turns until it can fire again (every gun starts the round loaded)
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

  // next loaded gun in that direction (reloading ones are skipped)
  cycleWeapon(dir) {
    const n = this.weapons.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.weaponIdx + dir * k + n * k) % n;
      if (this.weaponReady(this.weapons[i])) { this.selectWeapon(i); return true; }
    }
    return false;
  }

  selectWeapon(i) {
    if (!this.weapons[i] || !this.weaponReady(this.weapons[i])) return false;
    this.weaponIdx = i;
    this.charge = 0;
    this.shotsLeft = this.weapon.clip;
    this.clampElev();
    return true;
  }

  // start of an own turn: count reloads down; if the gun in hand is still reloading, take the
  // best loaded one (the starter never reloads, but a sold starter or an old save might leave none)
  tickReloads() {
    for (const id in this.reload) if (this.reload[id] > 0) this.reload[id]--;
    if (!this.weapons.some((id) => this.weaponReady(id))) {
      const soonest = this.weapons.slice().sort((a, b) => this.reloadLeft(a) - this.reloadLeft(b))[0];
      this.reload[soonest] = 0;
    }
    if (!this.weaponReady()) {
      const ready = this.weapons.map((id, i) => [WEAPON_BY_ID[id], i]).filter(([w]) => this.weaponReady(w.id));
      ready.sort((a, b) => weaponValue(b[0]) - weaponValue(a[0]));
      this.weaponIdx = ready[0][1];
      this.clampElev();
    }
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
    return { x: this.x + facing * a.pivot[0] * GIRL_SCALE, y: this.y + a.pivot[1] * GIRL_SCALE };
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
    const len = gunLength(this.weapon) * GIRL_SCALE;
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
    if (this.dummy) { this.drawDummy(ctx); return; }
    const f = this.facing;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const state = !this.alive ? 'wreck' : this.hp < this.maxHp * 0.5 ? 'damaged' : 'ok';
    const o = { id: this.vehicle.id, x, y, facing: f, color: this.color, state, t: this.blink || 0, walking: this.walking > 0, flash: this.flash, pose: this.pose || 'idle', poseT: this.poseT || 0 };
    // a turret girl (girls.js) with her rigging; the gun is the equipped weapon's skin (weaponskins.js)
    // drawn at full size in girls.js units, scaled down about her feet
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(GIRL_SCALE, GIRL_SCALE);
    ctx.translate(-x, -y);
    drawGirl(ctx, o);
    if (this.alive) {
      const a = GIRL_ART[this.vehicle.id] || GIRL_ART.gwt;
      const off = girlPivotOffset(o); // the victory hop lifts her rigging
      drawGun(ctx, this.weapon, { x: x + (a.pivot[0] + off[0]) * f, y: y + a.pivot[1] + off[1] }, this.aimVec(), f, this.recoil, shade(this.color, -0.5), this.blink || 0, active ? this.charge / this.chargeCap() : 0);
      drawGirlMount(ctx, o);
    }
    ctx.restore();
    if (!this.alive) return;
    if (this.barrier) {
      // Bulwark Barrier: an arc of plates on the side it faces, pulsing; brighter when it just blocked
      const b = this.barrier;
      const base = Math.atan2(b.y, b.x);
      const pulse = 0.55 + 0.25 * Math.sin((this.blink || 0) * 4) + (this.barrierHit || 0) * 0.4;
      for (let i = -6; i <= 6; i++) {
        const a = base + (i / 6) * Math.PI * 0.3;
        ctx.fillStyle = i % 2 ? `rgba(120,230,210,${pulse})` : `rgba(255,214,120,${pulse})`;
        sq(ctx, x + Math.cos(a) * 36, y - 18 + Math.sin(a) * 36, 5);
      }
    }
    if (this.shield) {
      // Deflector: a ring of pale squares around the hull, pulsing
      const a = 0.45 + 0.2 * Math.sin((this.blink || 0) * 5);
      ctx.fillStyle = `rgba(150,210,255,${a})`;
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * TAU;
        sq(ctx, x + Math.cos(t) * 30, y - 19 + Math.sin(t) * 28, 4);
      }
    }
    if (active) {
      // A3 sight: green marks at the elevation limits
      ctx.fillStyle = '#2e8b57';
      const p = this.pivot();
      for (const e of [this.weapon.elevMin, this.weapon.elevMax]) {
        const u = this.aimVec(e);
        for (let d = 26; d <= 40; d += 7) sq(ctx, p.x + u.x * d, p.y + u.y * d, 3);
      }
    }
  }

  // the Codex's training dummy: a post with a bullseye board, that shakes when hit
  drawDummy(ctx) {
    const x = Math.round(this.x + (this.flash > 0 ? (Math.random() - 0.5) * 4 * this.flash : 0));
    const y = Math.round(this.y);
    ctx.fillStyle = '#6a4a32';
    ctx.fillRect(x - 2, y - 30, 5, 30);
    ctx.fillRect(x - 9, y - 3, 19, 3);
    const rings = [['#f4f0e6', 15], ['#c8433a', 12], ['#f4f0e6', 8], ['#c8433a', 4]];
    for (const [c, r] of rings) { ctx.fillStyle = c; ctx.fillRect(x - r, y - 34 - r, r * 2, r * 2); }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.6})`; ctx.fillRect(x - 15, y - 49, 30, 30); }
  }

  // screen space (1600x900 HUD units); sx, sy = ground point on screen
  drawLabel(ctx, sx, sy, active) {
    if (!this.alive) return;
    if (this.dummy) {
      ctx.textAlign = 'center';
      ctx.font = `13px ${HUD_FONT}`;
      plateText(ctx, 'TRAINING DUMMY', Math.round(sx), Math.round(sy - 70), HUD.dim, 'center');
      return;
    }
    ctx.textAlign = 'center';
    ctx.font = `13px ${HUD_FONT}`;
    const title = `${this.name} | ${this.vehicle.name}`;
    const tw = ctx.measureText(title).width + 24;
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - 124 + LABEL_LIFT), Math.round(tw), 20);
    if (active) {
      ctx.fillStyle = this.color;
      ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - 124 + LABEL_LIFT), 5, 20);
    }
    ctx.fillStyle = active ? HUD.bright : HUD.dim;
    ctx.fillText(title, Math.round(sx), Math.round(sy - 109 + LABEL_LIFT));
    // a CPU's grudge: a square in the colour of whoever it is out for
    if (this.isCpu && this.lastAttacker && this.lastAttacker.alive) {
      ctx.fillStyle = this.lastAttacker.color;
      ctx.fillRect(Math.round(sx + tw / 2 + 4), Math.round(sy - 120 + LABEL_LIFT), 12, 12);
    }
    // bounty on the match leader
    if (this.bounty > 0) {
      ctx.fillStyle = HUD.gold;
      ctx.fillRect(Math.round(sx - tw / 2 - 52), Math.round(sy - 124 + LABEL_LIFT), 48, 20);
      ctx.fillStyle = HUD.plateInk;
      ctx.font = `12px ${HUD_FONT}`;
      ctx.fillText(`¢${this.bounty}`, Math.round(sx - tw / 2 - 28), Math.round(sy - 109 + LABEL_LIFT));
      ctx.font = `13px ${HUD_FONT}`;
    }
    // A3 layout: an armour bar stacked on the health bar, armour number left, health right
    const bw = 100;
    const by = Math.round(sy - 102 + LABEL_LIFT);
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(Math.round(sx - bw / 2), by, bw, 20);
    ctx.fillStyle = HUD.line;
    ctx.fillRect(Math.round(sx - bw / 2 + 6), by + 4, bw - 12, 5);
    ctx.fillRect(Math.round(sx - bw / 2 + 6), by + 11, bw - 12, 5);
    ctx.fillStyle = HUD.accent;
    ctx.fillRect(Math.round(sx - bw / 2 + 6), by + 4, Math.round((bw - 12) * clamp(this.armour / this.maxArmour, 0, 1)), 5);
    ctx.fillStyle = HUD.cool;
    ctx.fillRect(Math.round(sx - bw / 2 + 6), by + 11, Math.round((bw - 12) * clamp(this.hp / this.maxHp, 0, 1)), 5);
    ctx.font = `13px ${HUD_FONT}`;
    ctx.textAlign = 'right';
    plateText(ctx, Math.ceil(this.armour), Math.round(sx - bw / 2 - 2), Math.round(sy - 86 + LABEL_LIFT), HUD.accent, 'right');
    plateText(ctx, Math.ceil(this.hp), Math.round(sx + bw / 2 + 2), Math.round(sy - 86 + LABEL_LIFT), HUD.cool, 'left');
    if (active) {
      const w = this.weapon;
      ctx.font = `13px ${HUD_FONT}`;
      ctx.textAlign = 'center';
      const ww = ctx.measureText(w.name).width + 30;
      ctx.fillStyle = HUD.plate;
      ctx.fillRect(Math.round(sx - ww / 2), Math.round(sy + 18), Math.round(ww), 20);
      // A3 badge: rarity + type letters in a square outlined in the rarity colour
      const bx = Math.round(sx - ww / 2 - 26);
      const by = Math.round(sy + 16);
      const rc = RARITY[w.rarity].ui;
      ctx.fillStyle = HUD.plate;
      ctx.fillRect(bx, by, 24, 24);
      ctx.fillStyle = rc;
      ctx.fillRect(bx, by, 24, 1); ctx.fillRect(bx, by + 23, 24, 1); ctx.fillRect(bx, by, 1, 24); ctx.fillRect(bx + 23, by, 1, 24);
      ctx.font = `12px ${HUD_FONT}`;
      ctx.fillText(badgeText(w), bx + 12, by + 17);
      ctx.font = `13px ${HUD_FONT}`;
      ctx.fillStyle = RARITY[w.rarity].ui;
      ctx.fillText(w.name, Math.round(sx), Math.round(sy + 33));
      // autoloader rounds left this turn
      for (let i = 0; i < w.clip; i++) {
        ctx.fillStyle = i < this.shotsLeft ? HUD.accent : HUD.plate;
        ctx.fillRect(Math.round(sx - (w.clip * 10) / 2 + i * 10), Math.round(sy + 42), 7, 7);
      }
    }
  }

  drawSpeech(ctx, sx, sy) {
    const s = this.speech;
    if (!s || !this.alive || s.age < 0) return;
    ctx.font = `13px ${HUD_FONT}`;
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
    const by = Math.round(sy - 140 + LABEL_LIFT - bh);
    ctx.globalAlpha = clamp((s.dur - s.age) * 3, 0, 1);
    ctx.fillStyle = HUD.plate;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.color;
    ctx.fillRect(bx, by, 5, bh);
    sq(ctx, sx, by + bh + 5, 8);
    ctx.fillStyle = HUD.fg;
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
    this.drift = w.drift === undefined ? 1 : w.drift; // how hard the wind pushes it (weapon stat)
    this.age = 0;
    this.main = main;
    this.trail = [];
    this.peak = y; // highest point reached (smallest y), for the altitude bonus
    this.guide = guideFor(w, owner); // rockets: seeker settings (null for shells)
    this.prefer = preferFor(owner);
  }

  update() {
    const g = this.game;
    if (this.delay > 0) { this.delay--; return true; } // waiting its turn in a burst
    if (this.w.lance && this.lanceStep(g)) { this.age++; return true; }
    const r = stepBallistic(this, g.terrain, g.wind, g.targets(), this.owner, this.guide ? g.seekables() : undefined);
    g.frontCheck(this);
    if (!r && this.transform(g)) return false;
    if (!r && (this.w.kind === 'flak' || this.w.airburst) && this.fuse(g)) { g.impact(this, { hit: 'air' }); return false; }
    if (this.y < this.peak) this.peak = this.y;
    g.trace(this, this.x, this.y);
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
    // a carpet rocket that hits something mid-drop throws out the rest of its bomblets
    if (this.dropped && this.dropped < this.w.carpet.n) for (let i = this.dropped; i < this.w.carpet.n; i++) this.dropBomblet(g, i, 4);
    if (r.hit !== 'out') g.impact(this, r);
    return false;
  }

  // rockets that change in flight: a carpet rocket opens over its target (or once its motor is out
  // and it starts to fall) into a line of bomblets; a split rocket breaks into seekers that each
  // go for the nearest target. Returns true when this projectile has been replaced.
  transform(g) {
    const w = this.w;
    // timed: so a rocket has to be lobbed long or high enough to open over its target; one that
    // hits first does only half damage (see Game.bodyFactor)
    // a carpet rocket starts dropping its bomblets at carpet.at, one every carpet.every frames as it
    // flies on, and is spent with the last. Each bomblet steers for the nearest target in reach: let
    // go high, they have time to all bend onto one; let go low, they land along the rocket's path.
    if (w.carpet && this.age >= w.carpet.at) {
      const c = w.carpet;
      const i = (this.age - c.at) / c.every;
      if (i % 1) return false;
      this.dropBomblet(g, i, 0);
      g.particles.puff(this.x, this.y + 4, [200, 200, 205]);
      g.sfx.click();
      if (i < c.n - 1) return false;
      g.particles.explosion(this.x, this.y, 20, 'shell'); // spent
      return true;
    }
    if (w.split && this.age === w.split.at) {
      const sp = w.split;
      const child = { ...w, split: null, dmg: w.dmg * (sp.boost || 1), guide: { ...w.guide, seek: 0 } }; // the children seek at once, and still dive on the nearest past their apex
      const speed = Math.hypot(this.vx, this.vy);
      const a0 = Math.atan2(this.vy, this.vx);
      for (let i = 0; i < sp.n; i++) {
        const a = a0 + rad((i - (sp.n - 1) / 2) * sp.spread);
        const c = new Projectile(g, child, this.owner, this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, this.main && i === 0);
        c.age = this.age;
        c.peak = this.peak;
        c.launch = this.launch;
        g.projectiles.push(c);
      }
      g.particles.explosion(this.x, this.y, 24, 'shell');
      return true;
    }
    return false;
  }

  dropBomblet(g, i, scatter) {
    const w = this.w, c = w.carpet;
    const bomb = { id: w.id + '_b', name: 'Bomblet', kind: 'shell', dmg: w.dmg * c.frac, dmgR: c.r, explR: 4, salvo: 1, clip: 1, disp: 0, acid: 0, sat: false,
      rarity: w.rarity, maxCharge: 10, bomblet: true, drift: 1.1, guide: BOMBLET_GUIDE };
    const b = new Projectile(g, bomb, this.owner, this.x - this.vx, this.y - this.vy - 4,
      this.vx * 0.5 + (Math.random() - 0.5) * (1 + scatter), Math.min(Math.max(this.vy, 0) * 0.5 + 1, 6) - scatter * Math.random(), this.main && i === 0);
    b.peak = this.peak;
    b.launch = this.launch;
    b.prefer = this.prefer;
    g.projectiles.push(b);
    this.dropped = i + 1;
  }

  // the Demigod: at lance.at it stops dead and hovers, picks the nearest target in any direction
  // (rivals first), then charges it in a straight line at lance.speed with no gravity or wind.
  // Returns true while it is hovering (it doesn't move).
  lanceStep(g) {
    const L = this.w.lance;
    if (this.hover > 0) {
      this.hover--;
      if (this.hover === 0) {
        const lock = this.lance;
        const q = lock && lock.alive ? seekCenter(lock) : { x: this.x + Math.sign(this.vx || 1) * 100, y: this.y + 100 };
        const d = Math.hypot(q.x - this.x, q.y - this.y) || 1;
        this.vx = ((q.x - this.x) / d) * L.speed;
        this.vy = ((q.y - this.y) / d) * L.speed;
        this.charging = true;
        g.sfx.laser();
      }
      return true;
    }
    if (!this.charging && this.age === L.at) {
      this.hover = L.hover;
      this.guide = null;
      this.noGrav = true;
      this.drift = 0;
      const seek = g.seekables();
      let best = null, bd = L.range, rival = null, rd = L.range;
      for (const c of seek) {
        if (!c.alive || c === this.owner) continue;
        const q = seekCenter(c);
        const d = Math.hypot(q.x - this.x, q.y - this.y);
        if (d < bd) { bd = d; best = c; }
        if (c.vehicle && !c.isMob && d < rd) { rd = d; rival = c; }
      }
      this.lance = rival || best;
      this.vx = this.vy = 0;
      g.particles.explosion(this.x, this.y, 20, 'laser');
      return true;
    }
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
    if (this.w.lance && (this.hover > 0 || this.charging)) {
      // the Demigod: hovering, a lance of light gathers (pointing at its target); charging, it is a
      // white spear with a long fading tail
      const L = this.w.lance;
      const lock = this.lance && this.lance.alive ? seekCenter(this.lance) : null;
      const dir = this.charging ? { x: this.vx / L.speed, y: this.vy / L.speed } : lock ? (() => { const d = Math.hypot(lock.x - this.x, lock.y - this.y) || 1; return { x: (lock.x - this.x) / d, y: (lock.y - this.y) / d }; })() : { x: 0, y: 1 };
      const grow = this.charging ? 1 : 1 - this.hover / L.hover;
      for (let k = -4; k <= 6; k++) {
        ctx.fillStyle = k > 3 ? '#ffffff' : `rgba(255,240,200,${0.5 + 0.08 * k})`;
        sq(ctx, this.x + dir.x * k * 5 * grow, this.y + dir.y * k * 5 * grow, k > 3 ? 7 : 5);
      }
      if (this.charging) for (let k = 1; k <= 10; k++) {
        ctx.fillStyle = `rgba(255,230,160,${0.6 - k * 0.055})`;
        sq(ctx, this.x - dir.x * k * 9, this.y - dir.y * k * 9, 6 - k * 0.4);
      } else if (this.age % 4 < 2) {
        ctx.fillStyle = 'rgba(255,250,220,0.5)';
        sq(ctx, this.x, this.y, 18 + 10 * grow);
      }
      return;
    }
    if (this.w.kind === 'rocket') {
      // a rocket: a longer body (three squares) and, while the motor burns, a flickering flame
      const G = this.guide;
      const burning = G && this.age <= G.arm + G.burn;
      if (burning) {
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = k ? `rgba(255,${140 + k * 40},60,${0.8 - k * 0.2})` : 'rgba(255,250,200,0.95)';
          sq(ctx, this.x - nx * (sk.size * 1.6 + k * 4) + (Math.random() - 0.5) * 2, this.y - ny * (sk.size * 1.6 + k * 4) + (Math.random() - 0.5) * 2, sk.size * (0.8 - k * 0.15) + Math.random() * 2);
        }
      }
      ctx.fillStyle = rgb(col);
      for (const d of [-sk.size * 0.9, 0]) sq(ctx, this.x + nx * d, this.y + ny * d, sk.size * 0.8);
      ctx.fillStyle = rgb(sk.nose);
      sq(ctx, this.x + nx * (sk.size * 0.8), this.y + ny * (sk.size * 0.8), Math.max(2, sk.size * 0.55));
      if (this.lock && burning && this.age % 10 < 5) { // a blinking seeker light when locked
        ctx.fillStyle = '#ff4a4a';
        sq(ctx, this.x, this.y, 2);
      }
      return;
    }
    ctx.fillStyle = rgb(col);
    sq(ctx, this.x - nx * 3, this.y - ny * 3, sk.size);
    ctx.fillStyle = rgb(sk.nose);
    sq(ctx, this.x + nx * (sk.size / 2 + 1), this.y + ny * (sk.size / 2 + 1), Math.max(2, sk.size * 0.6));
  }
}

class AcidDrop {
  constructor(game, owner, x, y, vx, vy, dmg, fire = false) {
    this.game = game;
    this.owner = owner;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg;
    // acid is orange, yellow and green; fire (incendiary fragments) is red, orange and white-hot
    this.color = (fire ? [[255, 90, 30], [255, 170, 40], [255, 236, 170]] : [[255, 165, 0], [240, 220, 40], [60, 160, 50]])[Math.floor(Math.random() * 3)];
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
    // MAIA can be shot down: its strike damage scales with its health; it heals SAT_HEAL of its max
    // every turn, and its max tracks the average toughness of the vehicles left (Game.satTurn)
    this.isSat = true;
    this.maxHp = 300;
    this.hp = 300;
    this.flash = 0;
    this.hw = 50; // hitbox for shells: the body (100 x 100), so lobs passing near don't clip it
    this.hh = 100;
  }

  get alive() { return this.hp > 0; }
  get hitY() { return this.y + this.bob + 50; } // bottom of the hitbox (stepBallistic)
  center() { return this.toWorld(0, 0); }
  get health() { return clamp(this.hp / this.maxHp, 0, 1); }
  // where a blast at (px, py) caught it, in its own frame (+x points down the emitter): the core
  // and the antenna wings at the back take the most, the curled side arms the least
  region(px, py) {
    const c = this.center();
    const dx = px - c.x, dy = py - c.y;
    const co = Math.cos(this.angle), s = Math.sin(this.angle);
    const lx = dx * co + dy * s, ly = -dx * s + dy * co;
    const r = Math.hypot(lx, ly);
    if (r < 44) return { mult: 1.25, tag: 'CORE' };
    if (lx < -20 && r < 200) return { mult: 1.0, tag: 'WING' };
    if (lx > 30 && Math.abs(ly) < 18) return { mult: 0.8, tag: 'EMITTER' };
    return { mult: 0.5, tag: 'SIDE' };
  }

  setTier(tier) {
    this.tier = tier;
    this.turns = 0;
  }

  get damage() { return (SAT_TIERS[this.tier].dmg + SAT_TURN_GAIN * this.turns) * this.health; }
  get dmgR() { return SAT_TIERS[this.tier].dmgR; }
  get explR() { return SAT_TIERS[this.tier].explR; }
  get level() { return this.tier; }
  newTurn() { this.turns++; }
  lookAt(pt) { this.angleDest = Math.atan2(pt.y - this.y, pt.x - this.x); }
  update() {
    this.t++;
    this.flash = Math.max(0, this.flash - 0.08);
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

    // battle damage: smoke and sparks below half health, a white flash when hit, dark when down
    if (this.health < 0.5 && this.t % 6 < 3) {
      ctx.fillStyle = this.alive ? 'rgba(60,50,60,0.7)' : 'rgba(30,26,34,0.85)';
      for (let i = 0; i < 4; i++) sq(ctx, c.x - 20 + ((this.t * 3 + i * 17) % 40), c.y - 30 - ((this.t + i * 11) % 30), 6 + i);
      ctx.fillStyle = '#ffb040';
      sq(ctx, c.x + ((this.t * 7) % 50) - 25, c.y + ((this.t * 5) % 30) - 15, 3);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.7})`; sq(ctx, c.x, c.y, 90); }
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
      this.x = clamp(this.x + game.wind.x * 30, 40, WORLD_W - 40);
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
