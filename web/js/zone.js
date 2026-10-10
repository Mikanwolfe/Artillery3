'use strict';
// The closing zone (battle royale): ZONE_FROM turn cycles into a round, a Hatsuyuki fleet takes up
// station over the map and marks its edges as a target area, and every cycle after that it marks
// ZONE_STEP more from each side, closing on a point it picked, until only ZONE_MIN is left clear.
// Whoever ends her turn inside the marked ground has red lasers come down on her: ZONE_HIT of her
// health and armour together, a little more each round. Hooks: Game.startRound (resetZone),
// Game.nextTurn (zoneCycle, zoneStrike), the CPU (it drives out), drawHazardsFront (drawZone).

const ZONE_FROM = 3; // cycles into a round before the fleet arrives
const ZONE_STEP = 170; // how much more of the map it marks each cycle (both sides together, ×2)
const ZONE_MIN = 700; // the clear ground it always leaves
const ZONE_BOMB_EVERY = 150; // frames between a ship's (harmless, for show) bomb drops
const ZONE_HIT = 0.12; // of max health + armour, for ending a turn in the marked area (+2% a round)

Object.assign(Game.prototype, {
  resetZone() {
    this.zone = null;
    this.zoneAim = WORLD_W * 0.3 + rng.next() * WORLD_W * 0.4; // where the clear ground ends up
  },

  // once a turn cycle: the fleet arrives, then marks more ground, closing on its aim point
  zoneCycle(cycles) {
    if (this.range || cycles < ZONE_FROM) return;
    if (!this.zone) {
      this.zone = { l: 0, r: WORLD_W, tl: 0, tr: WORLD_W, t: 0 };
      this.ui.notice('A Hatsuyuki fleet takes station overhead. Don’t end your turn under its red marks.');
      this.events.push('A Hatsuyuki fleet arrives and starts marking the edges of the field.');
    }
    const z = this.zone, w = z.tr - z.tl;
    if (w <= ZONE_MIN + 1) return;
    const step = Math.min(ZONE_STEP * 2, w - ZONE_MIN);
    const a = clamp(this.zoneAim, z.tl + ZONE_MIN / 2, z.tr - ZONE_MIN / 2);
    const dl = a - z.tl, dr = z.tr - a;
    z.tl += (step * dl) / (dl + dr);
    z.tr -= (step * dr) / (dl + dr);
    this.events.push('The Hatsuyuki fleet marks more ground.');
  },

  // is x in the marked area?
  zoneMarked(x) {
    const z = this.zone;
    return !!z && (x < z.tl || x > z.tr);
  },

  // her turn is over: if she ended it on marked ground, the fleet fires on her
  zoneStrike(t) {
    if (!t || !t.alive || this.range || !this.zoneMarked(t.x) || this.zoneStruck === this.turnSerial) return;
    this.zoneStruck = this.turnSerial;
    const amt = Math.round((t.maxHp + t.maxArmour) * (ZONE_HIT + 0.02 * (this.round - 1)));
    const top = t.y - 1100;
    for (let i = 0; i < 9; i++) {
      const x0 = t.x + rng.range(-260, 260), x1 = t.x + rng.range(-40, 40);
      this.lasers.push(new Laser(x0, top, x1, t.y - rng.range(0, 24), i % 3 ? '#ff3040' : '#ff9aa4', i % 3 ? 3 : 5, 26 + i * 2));
    }
    for (let i = 0; i < 4; i++) this.particles.explosion(t.x + rng.range(-30, 30), t.y - rng.range(0, 20), 50, 'shell');
    this.shake = Math.max(this.shake, 8);
    this.sfx.explosion(35);
    this.events.push(`The Hatsuyuki fleet fires on ${t.name} in its target area.`);
    this.damage(t, amt, null, false, null, { q: 0.75, alt: 0, kin: 0, front: 1, zone: true });
  },

  // the marked ground, tinted red with warning chevrons at its edge, and the fleet's ships over it
  drawZone(ctx) {
    const z = this.zone;
    if (!z) return;
    z.t++;
    z.l += (z.tl - z.l) * 0.04;
    z.r += (z.tr - z.r) * 0.04;
    const T = this.terrain, pulse = 0.12 + 0.05 * Math.sin(z.t / 12);
    for (const [a, b, edge, dir] of [[-400, z.l, z.l, 1], [z.r, WORLD_W + 400, z.r, -1]]) {
      if (b <= a) continue;
      ctx.fillStyle = `rgba(255,40,64,${pulse})`;
      ctx.fillRect(Math.round(a), -2400, Math.round(b - a), WORLD_BOTTOM + 2400);
      // the edge: a red line down to the ground and chevrons along the ground pointing to safety
      const gy = T.hAt(clamp(edge, 0, WORLD_W - 1));
      ctx.fillStyle = 'rgba(255,60,80,0.75)';
      ctx.fillRect(Math.round(edge - 1), Math.round(gy - 900), 2, 900);
      for (let k = 1; k <= 6; k++) {
        const x = edge - dir * k * 26, y = T.hAt(clamp(x, 0, WORLD_W - 1)) - 6;
        ctx.fillStyle = (Math.floor(z.t / 8) + k) % 3 ? 'rgba(255,60,80,0.8)' : 'rgba(255,200,200,0.9)';
        for (let j = 0; j < 4; j++) ctx.fillRect(Math.round(x + dir * j * 2), Math.round(y - 4 + j), 3, 2), ctx.fillRect(Math.round(x + dir * j * 2), Math.round(y + 4 - j), 3, 2);
      }
      // a ship of the fleet over each marked side, its bays dropping bombs on the marked ground
      const sx = clamp((a + b) / 2, a + 60, b - 60), sy = Math.min(T.hAt(clamp(edge, 0, WORLD_W - 1)), T.hAt(clamp(sx, 0, WORLD_W - 1))) - 1000 + Math.sin(z.t / 50) * 8;
      if (b - a > 140) {
        const key = dir > 0 ? 'bl' : 'br', bay = (z[key] = (z[key] || Math.random() * 60) + 1) % ZONE_BOMB_EVERY;
        if (bay === 0 && !this.range) { // (visual only: Math.random, so the seeded game never sees it)
          const bx = clamp(sx + (Math.random() - 0.5) * 80, a + 20, b - 20);
          (z.bombs || (z.bombs = [])).push({ x: bx, y: sy + 18, vx: dir * 0.6, vy: 0.5, lo: a + 10, hi: b - 10 });
        }
        this.drawZoneShip(ctx, sx, sy, dir, z.t, bay > ZONE_BOMB_EVERY - 40 || bay < 25);
      }
    }
    this.drawZoneBombs(ctx);
  },

  // the falling bombs: finned, nose down, a burst where they land
  drawZoneBombs(ctx) {
    const z = this.zone, T = this.terrain;
    if (!z.bombs) return;
    z.bombs = z.bombs.filter((m) => {
      m.vy += 0.22;
      m.x = clamp(m.x + m.vx, m.lo, m.hi);
      m.y += m.vy;
      const gy = T.hAt(clamp(m.x, 0, WORLD_W - 1));
      if (m.y >= gy) {
        this.particles.explosion(m.x, gy - 4, 38, 'shell');
        return false;
      }
      const x = Math.round(m.x), y = Math.round(m.y);
      ctx.fillStyle = '#2a2630'; ctx.fillRect(x - 2, y - 7, 5, 10); // body
      ctx.fillStyle = '#ff3048'; ctx.fillRect(x - 2, y - 2, 5, 1); // red band
      ctx.fillStyle = '#4a4452'; ctx.fillRect(x - 1, y + 3, 3, 2); // nose
      ctx.fillStyle = '#1c1a22'; ctx.fillRect(x - 3, y - 10, 7, 3); // fins
      return true;
    });
  },

  // a Hatsuyuki destroyer, side on, bow toward dir: a raked bow and flared hull, a forward turret,
  // the tall conning tower with its bridge glowing red, a mast, funnel and aft turret, the keel's
  // red lights, and two bomb bays underneath that swing open as she drops
  drawZoneShip(ctx, x, y, dir, t, open) {
    const R = (lx, ty, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + (dir > 0 ? lx : -lx - w)), Math.round(y + ty), w, h); };
    const HULL = '#2b2733', DARK = '#1c1a22', DECK = '#3a3542', TOWER = '#443e4e', EDGE = '#5a5266';
    const P = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([lx, ly], k) => ctx[k ? 'lineTo' : 'moveTo'](Math.round(x + dir * lx), Math.round(y + ly))); ctx.closePath(); ctx.fill(); };
    // hull: a flared stern, the deck rising to a raked bow, the keel running up to the stem
    P([[-160, -10], [110, -10], [166, -19], [150, -4], [118, 12], [-128, 16], [-160, 6]], HULL);
    P([[-128, 8], [124, 8], [118, 12], [-128, 16], [-150, 9]], DARK); // below the waterline
    P([[-160, -10], [110, -10], [166, -19], [166, -17], [110, -8], [-160, -8]], EDGE); // the deck line
    R(-166, -6, 8, 12, DARK); // the transom
    // forward turret: two barrels to the bow
    R(78, -18, 22, 8, DECK); R(84, -22, 12, 4, TOWER);
    R(100, -17, 26, 2, DARK); R(100, -13, 26, 2, DARK);
    // the conning tower: stepped up, bridge windows red
    R(10, -26, 56, 16, DECK);
    R(22, -42, 38, 16, TOWER);
    R(32, -56, 24, 14, TOWER);
    R(36, -52, 18, 3, t % 40 < 30 ? '#ff4058' : '#a02038'); // bridge glass
    R(26, -36, 30, 2, '#ff3048');
    R(42, -78, 2, 22, EDGE); R(36, -70, 14, 2, EDGE); // mast and yard
    R(43, -80, 2, 2, (t >> 4) % 2 ? '#ff6070' : '#601020'); // masthead light
    // funnel and aft superstructure
    R(-30, -30, 18, 20, DARK); R(-32, -32, 22, 3, EDGE);
    R(-80, -20, 44, 10, DECK);
    // aft turret: barrels to the stern
    R(-122, -18, 22, 8, DECK); R(-118, -22, 12, 4, TOWER);
    R(-148, -16, 26, 2, DARK);
    // bomb bays: doors drawn shut, or swung open on a dark bay
    for (const bx of [-60, 0]) {
      R(bx - 4, 10, 42, 7, DARK); // the bay's housing, flush with the keel
      if (open) { R(bx, 16, 34, 4, '#0c0a10'); R(bx - 4, 16, 4, 8, EDGE); R(bx + 34, 16, 4, 8, EDGE); R(bx + 6, 17, 22, 1, '#ff3048'); }
      else R(bx, 16, 34, 3, EDGE);
    }
    // engines at the stern and their glow
    R(-172, -4, 12, 12, DARK);
    R(-178, -1, 6, 6, t % 10 < 5 ? '#ff7088' : '#c03048');
    for (let k = 0; k < 7; k++) R(-120 + k * 34, 12, 6, 2, (t >> 3) % 7 === k ? '#ffd0d6' : '#ff3048'); // the keel's lights
  },
});
