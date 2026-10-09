'use strict';
// Giants: one or two huge growths on every map that you can hide under. Each biome has its own:
// a great snow pine or a dead tree on Snowy Day, a great oak or a giant toadstool in the Autumn
// Forest, a bleached dead tree in the Dune Sea, and a pastel toadstool or an oak in Alstroemeria.
// Shells, beams and hostile fire stop on the canopy (or cap) and burst there, so whoever is under
// it is covered. Blasts wear down the canopy and the stem: shoot the canopy away and the cover is
// gone; break the stem and the whole top comes down, crushing whatever is underneath (the stump
// stays). Hooks: stepBallistic / beamTrace / lineOfSight (giantAt), Game.explode (blastGiants),
// Game.step (stepGiants), the world draw (drawGiants), placeInfra (placeGiants).

const GIANT_KINDS = { snow: ['pine', 'dead'], forest: ['oak', 'mushroom'], desert: ['dead'], alstroemeria: ['mushroom', 'oak'] };
const GIANT_STEM_HP = 260; // blast damage a stem takes before it snaps
const GIANT_CAP_HP = 420; // and a canopy before it is shot away
const GIANT_CRUSH = 110; // to everything under a falling top

Object.assign(Terrain.prototype, {
  // the giant whose canopy or stem contains (x, y), if any
  giantAt(x, y) {
    for (const G of this.giants || []) {
      if (G.state === 'down' || G.state === 'gone') continue;
      const g = this.hAt(G.x);
      if (G.capHp > 0 && G.state !== 'falling') {
        const c = giantCap(G, g);
        if (x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1) return G;
      }
      const stem = G.state === 'stump' || G.state === 'falling' ? G.stemH * 0.3 : G.stemH;
      if (Math.abs(x - G.x) < G.stemW / 2 && y <= g && y > g - stem) return G;
    }
    return null;
  },
});

// the canopy's box (world units) for a giant standing at ground g, dropped by G.dy while it falls
function giantCap(G, g) {
  const top = g - G.stemH - G.capH * 0.75 + (G.dy || 0);
  return { x0: G.x - G.capW / 2, x1: G.x + G.capW / 2, y0: top, y1: top + G.capH };
}

Object.assign(Game.prototype, {
  placeGiants(avoid) {
    const T = this.terrain;
    T.giants = [];
    const kinds = GIANT_KINDS[this.biome.id] || ['dead'];
    const n = rng.chance(0.5) ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const kind = rng.pick(kinds);
      const capW = kind === 'dead' ? rng.range(150, 190) : rng.range(170, 230);
      let best = null;
      for (let tries = 0; tries < 60 && !best; tries++) {
        const x = rng.range(200, WORLD_W - 200);
        if (Math.abs(T.hAt(x - 20) - T.hAt(x + 20)) > 18) continue; // a footing it can stand on
        if ((avoid || []).some((a) => Math.abs(a - x) < 120)) continue; // nobody starts inside its trunk
        if (T.giants.some((G) => Math.abs(G.x - x) < 700) || (T.towers || []).some((t) => Math.abs(t.x - x) < 300)) continue;
        if ((T.bridges || []).some((b) => x > b.x0 - 120 && x < b.x1 + 120)) continue;
        best = x;
      }
      if (best === null) continue;
      T.giants.push({
        x: best, kind, autumn: rng.int(0, 2), seed: rng.int(0, 1e6),
        stemH: kind === 'mushroom' ? rng.range(130, 170) : rng.range(170, 220),
        stemW: kind === 'mushroom' ? 28 : kind === 'dead' ? 18 : 22,
        capW, capH: kind === 'mushroom' ? 56 : kind === 'dead' ? 70 : 90,
        stemHp: GIANT_STEM_HP, capHp: GIANT_CAP_HP, state: 'up', dy: 0, vy: 0,
        desert: this.biome.id === 'desert', pastel: this.biome.id === 'alstroemeria',
      });
      T.fellTrees(best, T.hAt(best) - 20, capW / 2); // it shades out the little trees under it
    }
  },

  // a blast wears the canopy and the stem down
  blastGiants(x, y, def) {
    const T = this.terrain;
    const r = Math.max(30, def.dmgR * 0.7);
    for (const G of T.giants || []) {
      if (G.state !== 'up' && G.state !== 'bare') continue;
      const g = T.hAt(G.x);
      const hit = (d) => (d < r ? (def.dmg * 0.5 + 40) * (1 - d / r) : 0);
      // the stem: nearest point on it
      const sy = clamp(y, g - G.stemH, g);
      G.stemHp -= hit(Math.max(0, Math.abs(x - G.x) - G.stemW / 2) + Math.abs(y - sy) * 0.6);
      if (G.capHp > 0 && G.state === 'up') {
        const c = giantCap(G, g);
        const dx = Math.max(c.x0 - x, 0, x - c.x1), dy = Math.max(c.y0 - y, 0, y - c.y1);
        G.capHp -= hit(Math.hypot(dx, dy));
        if (G.capHp <= 0) this.shatterCap(G, g);
      }
      if (G.stemHp <= 0) {
        if (G.state === 'up') { G.state = 'falling'; G.vy = 0; this.sfx.thud(); this.ui.notice(`The ${giantName(G)} is coming down!`); }
        else { G.state = 'gone'; for (let i = 0; i < 10; i++) this.particles.puff(G.x, g - Math.random() * G.stemH, giantCols(G).stem); }
      }
    }
  },

  // its canopy blown apart: leaves (or cap) everywhere, and the cover is gone
  shatterCap(G, g) {
    G.state = 'bare';
    const c = giantCap(G, g);
    const col = giantCols(G).cap;
    for (let i = 0; i < 40; i++) {
      this.particles.add({ x: lerp(c.x0, c.x1, Math.random()), y: lerp(c.y0, c.y1, Math.random()), vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, g: 0.15, drag: 0.97, life: 1 + Math.random(), size: 4 + Math.random() * 5, color: col });
    }
    this.events.push(`The ${giantName(G)}'s ${G.kind === 'mushroom' ? 'cap' : 'canopy'} is shot away.`);
  },

  // a falling top drops, and crushes whatever is under it when it lands
  stepGiants() {
    const T = this.terrain;
    for (const G of T.giants || []) {
      if (G.state !== 'falling') continue;
      const g = T.hAt(G.x);
      G.vy += GRAV * 0.6;
      G.dy += G.vy;
      const c = giantCap(G, g);
      let ground = Infinity;
      for (let x = c.x0 + 10; x < c.x1; x += 20) ground = Math.min(ground, T.hAt(clamp(x, 0, WORLD_W - 1)));
      if (c.y1 < ground - 2) continue;
      G.state = 'down';
      for (const v of this.tanks.concat(this.mobs.filter((m) => m.alive && !m.flying))) {
        if (!v.alive || v.x < c.x0 - 6 || v.x > c.x1 + 6) continue;
        if (v.y < c.y0 - 10) continue; // up on something above it
        this.particles.text(v.x, v.y - 70, 'CRUSHED', '#e8c890');
        this.damage(v, GIANT_CRUSH, null);
      }
      T.fellTrees(G.x, ground - 10, G.capW / 2);
      for (let x = c.x0; x < c.x1; x += 10) this.particles.puff(x, T.hAt(clamp(x, 0, WORLD_W - 1)), giantCols(G).cap);
      this.shake = Math.max(this.shake, 9);
      this.sfx.explosion(30);
      this.events.push(`The ${giantName(G)} came down.`);
    }
  },

  drawGiants(ctx) {
    for (const G of this.terrain.giants || []) if (G.state !== 'gone') drawGiant(ctx, G, this.terrain);
  },
});

function giantName(G) { return { pine: 'great pine', oak: 'great oak', dead: 'dead tree', mushroom: 'giant toadstool' }[G.kind]; }

// colours by kind and biome
function giantCols(G) {
  if (G.kind === 'pine') return { stem: [74, 56, 44], cap: [38, 70, 66], snow: [238, 242, 248] };
  if (G.kind === 'dead') return G.desert ? { stem: [190, 176, 150], cap: [170, 154, 128] } : { stem: [96, 86, 80], cap: [86, 76, 70] };
  if (G.kind === 'oak') return { stem: [96, 66, 44], cap: G.pastel ? [140, 196, 110] : [[214, 110, 40], [196, 72, 40], [222, 160, 60]][G.autumn] };
  return G.pastel ? { stem: [246, 236, 226], cap: [244, 140, 180], spot: [255, 246, 250] } : { stem: [238, 228, 212], cap: [200, 58, 50], spot: [250, 246, 238] };
}

const rgbStr = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

// boxes only (the art rule): a trunk, then the canopy or cap built from stacked rects; a fallen top
// lies squashed on the ground beside its stump
function drawGiant(ctx, G, T) {
  const g = T.hAt(G.x);
  const C = giantCols(G);
  const x = Math.round(G.x);
  const stemH = G.state === 'up' || G.state === 'bare' ? G.stemH : G.stemH * 0.3;
  // the stem
  ctx.fillStyle = rgbStr(C.stem);
  if (G.kind === 'dead') { // crooked: it leans a little as it climbs
    for (let y = 0; y < stemH; y += 6) ctx.fillRect(Math.round(x - G.stemW / 2 + Math.sin(y / 40 + G.seed) * 5), Math.round(g - y - 6), G.stemW, 7);
  } else {
    ctx.fillRect(Math.round(x - G.stemW / 2), Math.round(g - stemH), G.stemW, Math.round(stemH));
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(Math.round(x + G.stemW / 2 - 6), Math.round(g - stemH), 6, Math.round(stemH)); // shade side
    if (G.kind === 'mushroom') { ctx.fillStyle = rgbStr(C.stem); ctx.fillRect(x - G.stemW / 2 - 8, Math.round(g - stemH * 0.7), G.stemW + 16, 6); } // the ring
    if (G.kind !== 'mushroom') { ctx.fillStyle = rgbStr(C.stem); ctx.fillRect(x - G.stemW / 2 - 6, Math.round(g - 6), G.stemW + 12, 6); } // root flare
  }
  if (G.state !== 'stump' && stemH < G.stemH) { // the snapped end
    ctx.fillStyle = '#e8d8b8';
    ctx.fillRect(Math.round(x - G.stemW / 2), Math.round(g - stemH - 3), G.stemW, 3);
  }
  if (G.state === 'bare' || G.capHp <= 0 && G.state !== 'falling' && G.state !== 'down') return;
  // the top: standing, falling (G.dy) or lying flattened on the ground
  const c = giantCap(G, g);
  if (G.state === 'down') {
    const y1 = Math.min(c.y1, T.hAt(x));
    drawGiantTop(ctx, G, C, c.x0, y1 - G.capH * 0.45, c.x1 - c.x0, G.capH * 0.45);
  } else drawGiantTop(ctx, G, C, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
}

function drawGiantTop(ctx, G, C, x0, y0, w, h) {
  const R = (fx, fy, fw, fh, col) => { ctx.fillStyle = rgbStr(col); ctx.fillRect(Math.round(x0 + fx * w), Math.round(y0 + fy * h), Math.max(1, Math.round(fw * w)), Math.max(1, Math.round(fh * h))); };
  const dark = (c, k) => c.map((v) => v * k);
  if (G.kind === 'mushroom') { // a domed cap: narrow at the top, its spots, the gills under it
    R(0.3, 0, 0.4, 0.2, C.cap); R(0.14, 0.18, 0.72, 0.22, C.cap); R(0.04, 0.38, 0.92, 0.3, C.cap); R(0, 0.66, 1, 0.18, C.cap);
    R(0.02, 0.84, 0.96, 0.16, dark(C.stem, 0.8));
    for (const [sx, sy] of [[0.38, 0.06], [0.22, 0.3], [0.62, 0.26], [0.1, 0.52], [0.46, 0.48], [0.8, 0.5]]) R(sx, sy, 0.08, 0.14, C.spot);
  } else if (G.kind === 'pine') { // five tiers, wider toward the bottom, each with a cap of snow
    for (let i = 0; i < 5; i++) {
      const f = 0.3 + 0.7 * (i / 4);
      R(0.5 - f / 2, i * 0.2, f, 0.22, i % 2 ? dark(C.cap, 0.85) : C.cap);
      R(0.5 - f / 2 + 0.04, i * 0.2, f * 0.6, 0.05, C.snow);
    }
  } else if (G.kind === 'oak') { // a lumpy crown
    const dk = dark(C.cap, 0.8);
    R(0.2, 0, 0.5, 0.3, C.cap); R(0.05, 0.2, 0.9, 0.45, C.cap); R(0, 0.45, 1, 0.35, dk); R(0.1, 0.75, 0.8, 0.25, dk);
    R(0.6, 0.06, 0.3, 0.3, dk); R(0.28, 0.1, 0.2, 0.12, C.cap.map((v) => Math.min(255, v * 1.15)));
  } else { // dead: bare branches reaching out of the trunk, as lines of squares
    ctx.fillStyle = rgbStr(C.stem);
    const bs = [[0.5, 1, 0.08, 0.1], [0.5, 1, 0.92, 0.2], [0.5, 0.8, 0.2, 0.05], [0.5, 0.75, 0.8, 0], [0.5, 1, 0.35, 0], [0.5, 0.9, 0.68, 0.02]];
    for (const [ax, ay, bx, by] of bs) for (let k = 0; k <= 1; k += 0.08) sq(ctx, x0 + lerp(ax, bx, k) * w, y0 + lerp(ay, by, k) * h, 6 - 3 * k);
  }
}
