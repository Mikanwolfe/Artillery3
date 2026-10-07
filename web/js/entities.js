'use strict';
// Game objects. Everything is drawn as plain axis-aligned boxes (no rotation): a tank is a
// stack of boxes (tracks, road wheels, hull, turret) with a barrel of five small squares, the MAIA satellite is three nested squares,
// a laser is a line of squares. Tanks hold per-player state (money, wins, weapons, upgrades).

const TANK_W = 34; // hitbox / footprint (world units)
const TANK_H = 20;
const TANK_FUEL = 250; // A3 Character._maxFuel (frames of movement)
const TANK_SPEED = 1.5; // A3 Constants.PlayerSpeed
const PLAYER_COLORS = ['#3d6fa8', '#b8433a', '#3e8a5a', '#7a4d9a'];

// Self-propelled guns, one box-art design per vehicle. `body` draws the chassis, `mount` the gun
// mount drawn over the barrel's root, `pivot` is the gun trunnion (local coords, facing right, so
// a negative x is towards the rear). All in world units around the ground point.
const WRECK_PAL = {
  hull: '#46464d', light: '#55555c', dark: '#3a3a40', deep: '#2a2a2e', track: '#2a2a2e', wheel: '#3a3a40', metal: '#3a3a40', lamp: '#3a3a40',
};

// `fill(colour, lx, ty, w, h)` draws one box in the vehicle's local, facing-mirrored coords
function tracks(fill, pal, half, wheels) {
  fill(pal.track, -half + 2, -7, half * 2 - 4, 7);
  fill(pal.track, -half, -5, half * 2, 3);
  for (let i = 0; i < wheels; i++) fill(pal.wheel, -half + 3 + (i * (half * 2 - 9)) / (wheels - 1), -5, 3, 3);
}

const VEHICLE_ART = {
  // Geschuetzwagen: long low six-wheel chassis, small driver's cab up front, open-topped raised
  // fighting platform at the rear with a gun shield. Long barrel with a muzzle brake.
  gwt: {
    pivot: [-9, -18],
    gun: { n: 6, size: 4, step: 4.5, start: 6, brake: 6 },
    body(fill, pal) {
      tracks(fill, pal, 19, 6);
      fill(pal.hull, -17, -11, 33, 4);
      fill(pal.light, -17, -11, 33, 1);
      fill(pal.dark, 9, -14, 6, 3);
      fill(pal.deep, 12, -13, 2, 1);
      fill(pal.hull, -18, -16, 16, 5);
      fill(pal.deep, -1, -10, 8, 2);
      fill(pal.lamp, 15, -10, 2, 2);
    },
    mount(fill, pal) {
      fill(pal.dark, -6, -22, 4, 9);
      fill(pal.deep, -18, -18, 2, 2);
      fill(pal.deep, -12, -18, 2, 2);
    },
  },
  // Object 15X: engine deck and exhaust at the front, a tall armoured gun housing at the rear,
  // a stowed recoil spade on the tail, and a short fat heavy gun.
  obj: {
    pivot: [-10, -20],
    gun: { n: 5, size: 6, step: 4.5, start: 6, brake: 8 },
    body(fill, pal) {
      tracks(fill, pal, 17, 5);
      fill(pal.hull, -16, -12, 32, 5);
      fill(pal.light, -16, -10, 32, 1);
      fill(pal.dark, 9, -14, 7, 2);
      fill(pal.deep, 12, -17, 2, 3);
      fill(pal.deep, -20, -7, 3, 5);
      fill(pal.deep, -22, -3, 3, 3);
      fill(pal.lamp, 15, -11, 2, 2);
    },
    mount(fill, pal) {
      fill(pal.dark, -17, -22, 13, 10);
      fill(pal.light, -17, -22, 13, 1);
      fill(pal.deep, -7, -20, 4, 7);
    },
  },
  // Innocentia: lighter chassis with a sloped nose, an enclosed rear casemate, twin barrels for
  // its two-round salvo, and a satellite uplink (mast, dish and a beacon in MAIA's colour).
  int: {
    pivot: [-6, -17],
    gun: { n: 7, size: 3, step: 3, start: 5, twin: true },
    body(fill, pal, t) {
      tracks(fill, pal, 16, 5);
      fill(pal.hull, -15, -11, 28, 4);
      fill(pal.hull, 11, -13, 3, 2);
      fill(pal.hull, 13, -9, 2, 2);
      fill(pal.lamp, 13, -11, 2, 1);
      fill(pal.metal, -15, -31, 1, 12);
      fill('#c8ccd8', -19, -32, 6, 2);
      fill('#c8ccd8', -17, -34, 2, 2);
      if (Math.floor(t * 2) % 2 === 0) fill('rgb(255,120,200)', -16, -36, 3, 2);
    },
    mount(fill, pal) {
      fill(pal.dark, -16, -20, 14, 9);
      fill(pal.light, -16, -20, 14, 1);
      fill(pal.deep, -13, -16, 3, 2);
    },
  },
};

// average slope of the ground under a vehicle's footprint (dy/dx), used to tilt it
function groundSlope(terrain, x) {
  return clamp((terrain.hAt(x + 18) - terrain.hAt(x - 18)) / 36, -0.7, 0.7);
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
    this.upgrades = { hp: 0, armour: 0 };
    this.weapons = [this.vehicle.weapon.id];
    this.weaponIdx = 0;
    this.stats = { dealt: 0, kills: 0 };
    this.lastCharge = 0;
    this.lastTrail = null;
    this.speech = null;
    this.resetRound(WORLD_W / 2);
  }

  get isCpu() { return this.type !== 'human'; }
  // A3 shop: Health++ / Armour++ multiply by 1.3 per level
  get maxHp() { return Math.round(this.vehicle.hp * Math.pow(1.3, this.upgrades.hp)); }
  get maxArmour() { return Math.round(this.vehicle.armour * Math.pow(1.3, this.upgrades.armour)); }
  get weapon() { return WEAPON_BY_ID[this.weapons[this.weaponIdx]] || WEAPON_BY_ID[this.weapons[0]]; }

  resetRound(x, terrain) {
    this.x = x;
    this.y = terrain ? terrain.hAt(x) : 1000;
    this.vy = 0;
    this.alive = true;
    this.hp = this.maxHp;
    this.armour = this.maxArmour;
    this.fuel = TANK_FUEL;
    this.facing = x < WORLD_W / 2 ? 1 : -1;
    this.weaponIdx = Math.min(this.weaponIdx, this.weapons.length - 1);
    this.elev = (this.weapon.elevMin + this.weapon.elevMax) / 2;
    this.charge = 0;
    this.recoil = 0;
    this.flash = 0;
    this.tilt = terrain ? groundSlope(terrain, x) : 0;
    this.falling = false;
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

  say(text, secs, delay = 0) {
    this.speech = { text, age: -delay, dur: secs || Math.max(3.2, 1.6 + text.length * 0.055) };
  }

  center() { return { x: this.x, y: this.y - TANK_H / 2 }; }
  // the gun is mounted at the back of the superstructure (these are SPGs, not tanks)
  // (vehicles sit on slopes by shearing their boxes vertically, so the mount moves with the tilt)
  pivot(facing = this.facing) {
    const a = VEHICLE_ART[this.vehicle.id] || VEHICLE_ART.gwt;
    const dx = facing * a.pivot[0];
    return { x: this.x + dx, y: this.y + a.pivot[1] + (this.tilt || 0) * dx };
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
    const a = VEHICLE_ART[this.vehicle.id] || VEHICLE_ART.gwt;
    const p = this.pivot(facing);
    const v = this.aimVec(elev, facing);
    const len = a.gun.start + a.gun.step * a.gun.n;
    return { x: p.x + v.x * len, y: p.y + v.y * len };
  }

  update(dt) {
    this.blink = (this.blink || 0) + dt;
    this.recoil = Math.max(0, this.recoil - dt * 2.5);
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
    const k = this.tilt || 0;
    const box = (lx, ty, w, h) => {
      const left = f > 0 ? x + lx : x - lx - w;
      // long boxes are drawn as 6-unit columns so the whole silhouette steps with the slope
      for (let c = 0; c < w; c += 6) {
        const cw = Math.min(6, w - c);
        ctx.fillRect(left + c, y + ty + Math.round(k * (left + c + cw / 2 - x)), cw, h);
      }
    };
    const art = VEHICLE_ART[this.vehicle.id] || VEHICLE_ART.gwt;
    const fill = (c, lx, ty, w, h) => { ctx.fillStyle = c; box(lx, ty, w, h); };
    if (!this.alive) {
      // burnt-out wreck: the same silhouette in charred greys, gun drooped
      art.body(fill, WRECK_PAL, 0);
      ctx.fillStyle = '#2a2a2e';
      for (let i = 0; i < 3; i++) box(art.pivot[0] + i * 4, art.pivot[1] + 2 + i * 2, 4, 3);
      return;
    }
    const pal = {
      hull: this.color, light: shade(this.color, 0.3), dark: shade(this.color, -0.25), deep: shade(this.color, -0.5),
      track: '#2b2d33', wheel: '#6b6f78', metal: '#8a8fa0', lamp: '#fff3c0',
    };
    art.body(fill, pal, this.blink || 0);
    // gun on the rear mount, drawn over the hull so it reads as firing forward across the deck
    const v = this.aimVec();
    const p = this.pivot();
    const g = art.gun;
    ctx.fillStyle = pal.deep;
    for (let k = 0; k < (g.twin ? 2 : 1); k++) {
      const off = g.twin ? (k ? 2.5 : -2.5) : 0;
      const ox = -v.y * off * f;
      const oy = v.x * off * f;
      for (let i = 0; i < g.n; i++) {
        const d = g.start + i * g.step - this.recoil * 6;
        sq(ctx, p.x + ox + v.x * d, p.y + oy + v.y * d, i === g.n - 1 && g.brake ? g.brake : g.size);
      }
    }
    art.mount(fill, pal);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.85})`;
      box(-18, -22, 36, 22);
    }
    if (active) {
      // A3 sight: green marks at the elevation limits
      ctx.fillStyle = '#2e8b57';
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
    ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - 80), Math.round(tw), 20);
    if (active) {
      ctx.fillStyle = this.color;
      ctx.fillRect(Math.round(sx - tw / 2), Math.round(sy - 80), 5, 20);
    }
    ctx.fillStyle = active ? '#20204a' : '#4a4a72';
    ctx.fillText(title, Math.round(sx), Math.round(sy - 65));
    // armour | health bar | health  (A3 layout)
    const bw = 100;
    ctx.fillStyle = 'rgba(232,230,244,0.88)';
    ctx.fillRect(Math.round(sx - bw / 2), Math.round(sy - 56), bw, 16);
    ctx.fillStyle = 'rgb(87,128,109)';
    ctx.fillRect(Math.round(sx - bw / 2 + 6), Math.round(sy - 52), Math.round((bw - 12) * clamp(this.hp / this.maxHp, 0, 1)), 8);
    ctx.font = '15px "Maven Pro", Verdana, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(Math.ceil(this.armour), Math.round(sx - bw / 2 - 6), Math.round(sy - 42));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a5a7a';
    ctx.fillText(Math.ceil(this.hp), Math.round(sx + bw / 2 + 6), Math.round(sy - 42));
    if (active) {
      const w = this.weapon;
      ctx.font = '15px "Maven Pro", Verdana, sans-serif';
      ctx.textAlign = 'center';
      const ww = ctx.measureText(w.name).width + 30;
      ctx.fillStyle = 'rgba(200,200,214,0.88)';
      ctx.fillRect(Math.round(sx - ww / 2), Math.round(sy + 18), Math.round(ww), 20);
      ctx.fillStyle = w.rarity === 7 ? '#20204a' : RARITY[w.rarity].color;
      ctx.fillText(w.name, Math.round(sx), Math.round(sy + 33));
      // autoloader rounds left this turn
      for (let i = 0; i < w.clip; i++) {
        ctx.fillStyle = i < this.shotsLeft ? '#4682b4' : 'rgba(40,40,70,0.35)';
        ctx.fillRect(Math.round(sx - (w.clip * 10) / 2 + i * 10), Math.round(sy + 42), 7, 7);
      }
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
    const by = Math.round(sy - 96 - bh);
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
  }

  update() {
    const g = this.game;
    const r = stepBallistic(this, g.terrain, g.wind, g.tanks, this.owner);
    if (this.age % 2 === 0) {
      this.trail.push(this.x, this.y);
      if (this.trail.length > 24) this.trail.splice(0, 2);
    }
    if (!r) return true;
    if (r.hit !== 'out') g.impact(this, r);
    return false;
  }

  draw(ctx) {
    const col = this.w.kind === 'laser' ? [0, 200, 220] : this.w.kind === 'acid' ? [70, 160, 50] : [50, 50, 64];
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
    sq(ctx, this.x - nx * 3, this.y - ny * 3, 8);
    ctx.fillStyle = rgb(mixRgb(col, [255, 255, 255], 0.45));
    sq(ctx, this.x + nx * 4, this.y + ny * 4, 5);
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

// MAIA-class Low Orbit Ion Cannon. Sits above the map, gains damage every turn, and fires at
// wherever a satellite-enabled weapon's shell lands. Drawn as boxes: solar wings, a body in the
// original's plum/navy, an antenna dish and an emitter barrel that swings toward the target.
class Satellite {
  constructor() {
    this.name = 'Maia';
    this.x = WORLD_W / 2;
    this.y = -300;
    this.damage = 60;
    this.explR = 15;
    this.dmgR = 150;
    this.angle = Math.PI / 2;
    this.angleDest = Math.PI / 2;
    this.charge = 0; // 0..1 while powering up for a strike
    this.t = 0;
  }

  get level() { return Math.floor(this.damage / 60); }
  newTurn() { this.damage += 0.5; }
  lookAt(pt) { this.angleDest = Math.atan2(pt.y - this.y, pt.x - this.x); }
  update() {
    this.t++;
    this.angle += (this.angleDest - this.angle) / 20;
  }

  // emitter tip, where the beam leaves
  lens() {
    return { x: this.x + Math.cos(this.angle) * 100, y: this.y + Math.sin(this.angle) * 100 };
  }

  draw(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(this.t / 50) * 4);
    const main = 'rgb(120,32,78)';
    const accent = 'rgb(23,23,47)';
    // solar wings: navy frame, blue cells, a strut to the body
    for (const s of [-1, 1]) {
      const wx = s < 0 ? x - 168 : x + 58;
      ctx.fillStyle = '#8a8fa0';
      ctx.fillRect(s < 0 ? x - 60 : x + 35, y - 3, 25, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(wx, y - 26, 110, 52);
      ctx.fillStyle = 'rgb(62,78,150)';
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) ctx.fillRect(wx + 4 + i * 21, y - 22 + j * 23, 18, 20);
      ctx.fillStyle = 'rgba(190,205,255,0.35)';
      for (let i = 0; i < 5; i++) ctx.fillRect(wx + 4 + i * 21, y - 22, 6, 4);
      // blinking navigation light at the wingtip
      if ((this.t >> 5) % 2 === (s < 0 ? 0 : 1)) {
        ctx.fillStyle = s < 0 ? '#ff4040' : '#40ff80';
        sq(ctx, s < 0 ? wx - 4 : wx + 114, y, 6);
      }
    }
    // antenna mast and stepped dish
    ctx.fillStyle = '#8a8fa0';
    ctx.fillRect(x - 2, y - 66, 4, 30);
    ctx.fillStyle = '#c8ccd8';
    ctx.fillRect(x - 14, y - 72, 28, 6);
    ctx.fillRect(x - 9, y - 78, 18, 6);
    ctx.fillStyle = main;
    sq(ctx, x, y - 82, 5);
    // body (the original's nested circles, as nested boxes)
    ctx.fillStyle = main;
    sq(ctx, x, y, 76);
    ctx.fillStyle = accent;
    sq(ctx, x, y, 62);
    ctx.fillStyle = main;
    sq(ctx, x, y, 44);
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 12);
    ctx.fillStyle = `rgba(255,190,230,${0.4 + 0.4 * pulse + this.charge * 0.2})`;
    sq(ctx, x, y, 14 + this.charge * 14);
    // emitter barrel
    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    ctx.fillStyle = accent;
    for (let i = 0; i < 6; i++) sq(ctx, x + ca * (40 + i * 11), y + sa * (40 + i * 11), 16 - i);
    ctx.fillStyle = main;
    sq(ctx, x + ca * 100, y + sa * 100, 12);
    // charging: sparks spiral into the lens and the tip whitens
    if (this.charge > 0) {
      const lx = x + ca * 100;
      const ly = y + sa * 100;
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63 + this.t * 0.15;
        const r = 70 * (1 - ((this.charge * 3 + i / 10) % 1));
        ctx.fillStyle = `rgba(255,240,250,${0.4 + this.charge * 0.6})`;
        sq(ctx, lx + Math.cos(a) * r, ly + Math.sin(a) * r, 5);
      }
      ctx.fillStyle = `rgba(255,255,255,${this.charge})`;
      sq(ctx, lx, ly, 6 + this.charge * 16);
    }
  }
}
