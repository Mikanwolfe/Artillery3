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
      // a ship of the fleet over each marked side, hull dark, red lights along its keel
      const sx = clamp((a + b) / 2, a + 60, b - 60), sy = Math.min(T.hAt(clamp(edge, 0, WORLD_W - 1)), T.hAt(clamp(sx, 0, WORLD_W - 1))) - 1000 + Math.sin(z.t / 50) * 8;
      if (b - a > 140) this.drawZoneShip(ctx, sx, sy, dir, z.t);
    }
  },

  drawZoneShip(ctx, x, y, dir, t) {
    const R = (lx, ty, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + (dir > 0 ? lx : -lx - w)), Math.round(y + ty), w, h); };
    R(-110, -10, 220, 22, '#26222c'); // hull
    R(-90, -24, 120, 14, '#322d38'); // superstructure
    R(-40, -36, 40, 12, '#3c3644'); // bridge
    R(110, -4, 30, 10, '#26222c'); // prow
    R(-130, -6, 20, 14, '#1c1a22'); // engines
    R(-136, -3, 6, 8, t % 10 < 5 ? '#ff7088' : '#c03048'); // their glow
    for (let k = 0; k < 7; k++) R(-90 + k * 30, 12, 6, 3, (t >> 3) % 7 === k ? '#ffd0d6' : '#ff3048'); // the keel's lights
  },
});
