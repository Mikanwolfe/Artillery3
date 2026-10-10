'use strict';
// Giants: one or two huge growths on every map that you can hide under. Each biome has its own:
// a great snow pine or a dead tree in the Far Territories, a great oak or a giant toadstool in the Autumn
// Forest, a bleached dead tree in the Dune Sea, and a pastel toadstool or an oak in Alstroemeria.
// Shells, beams and hostile fire stop on the canopy (or cap) and burst there, so whoever is under
// it is covered. Blasts wear down the canopy and the stem: shoot the canopy away and the cover is
// gone; break the stem and the whole top comes down, crushing whatever is underneath (the stump
// stays). Hooks: stepBallistic / beamTrace / lineOfSight (giantAt), Game.explode (blastGiants),
// Game.step (stepGiants), the world draw (drawGiants), placeInfra (placeGiants).

const GIANT_KINDS = { snow: ['pine', 'dead'], forest: ['oak', 'mushroom'], desert: ['dead'], alstroemeria: ['mushroom', 'oak'], aesru: ['hx'], aesrl: ['pillar'], astmg: ['stilt', 'dead'] };
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
        stemW: { mushroom: 28, dead: 18, hx: 30, pillar: 34, stilt: 14 }[kind] || 22,
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

function giantName(G) { return { pine: 'great pine', oak: 'great oak', dead: 'dead tree', mushroom: 'giant toadstool', hx: 'exchanger tower', pillar: 'hall pillar', stilt: 'stilt-house' }[G.kind]; }

// colours by kind and biome
function giantCols(G) {
  if (G.kind === 'hx') return { stem: [96, 100, 118], cap: [120, 124, 142], glow: [255, 150, 80] };
  if (G.kind === 'pillar') return { stem: [60, 56, 60], cap: [44, 46, 56], glow: [110, 240, 200] };
  if (G.kind === 'stilt') return { stem: [86, 90, 104], cap: [70, 72, 86], glow: [255, 190, 110] };
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
  if (G.kind === 'hx') { // an exchanger's crown: a drum of radiator fins with a warm band
    R(0.1, 0, 0.8, 0.12, C.cap); R(0, 0.12, 1, 0.7, dark(C.cap, 0.85)); R(0.08, 0.82, 0.84, 0.18, C.cap);
    for (let f = 0.04; f < 0.96; f += 0.08) R(f, 0.16, 0.03, 0.6, C.cap);
    R(0, 0.46, 1, 0.05, C.glow);
    return;
  }
  if (G.kind === 'pillar') { // a hall pillar's head: cable trays and a row of status lights
    R(0, 0.2, 1, 0.5, C.cap); R(0.04, 0.1, 0.92, 0.12, dark(C.cap, 1.3)); R(0.04, 0.7, 0.92, 0.12, dark(C.cap, 1.3));
    for (let f = 0.08; f < 0.92; f += 0.07) R(f, 0.42, 0.025, 0.06, hash2(Math.round(f * 100), G.seed % 97) > 0.3 ? C.glow : [60, 60, 70]);
    return;
  }
  if (G.kind === 'stilt') { // a stilt-house: a boxy home up on its leg, warm windows, a little roof
    R(0.08, 0.22, 0.84, 0.66, C.cap); R(0, 0.08, 1, 0.16, dark(C.cap, 0.8)); R(0.04, 0.86, 0.92, 0.14, dark(C.cap, 0.7));
    for (const fx of [0.16, 0.36, 0.56, 0.76]) R(fx, 0.38, 0.1, 0.2, hash2(Math.round(fx * 10), G.seed % 89) > 0.25 ? C.glow : [40, 40, 50]);
    return;
  }
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

// ------------------------------------------------------------------ the Warm Meadows' AHU
// An old-world air-handling unit near the middle of the map, older than anyone's records, keeping
// the meadow warm (not what an AHU does: nobody has ever explained this one). Shells stop on it and
// blasts wear it down; destroy it and the warmth goes: the sky cools, snow starts to fall and frost
// creeps over the meadow for the rest of the round (Background.cold, Terrain.frost).
const AHU_HP = 900;
const AHU_W = 96, AHU_H = 62;

Object.assign(Terrain.prototype, {
  ahuAt(x, y) {
    const A = this.ahu;
    if (!A || !A.alive) return null;
    const g = this.hAt(A.x);
    return Math.abs(x - A.x) < AHU_W / 2 && y <= g && y > g - AHU_H ? A : null;
  },
});

Object.assign(Game.prototype, {
  placeAhu(avoid) {
    const T = this.terrain;
    T.ahu = null;
    if (!this.biome.ahu) return;
    for (let d = 0; d < 900; d += 30) for (const x of [WORLD_W / 2 + d, WORLD_W / 2 - d]) {
      if (T.ahu) break;
      if ((avoid || []).some((a) => Math.abs(a - x) < 110)) continue;
      if ((T.bridges || []).some((b) => x > b.x0 - 80 && x < b.x1 + 80) || (T.towers || []).some((t) => Math.abs(t.x - x) < 140)) continue;
      T.flatten(x, AHU_W / 2 + 12);
      T.ahu = { x, hp: AHU_HP, alive: true };
    }
    if (T.ahu) T.fellTrees(T.ahu.x, T.hAt(T.ahu.x) - 20, AHU_W / 2 + 10);
  },

  blastAhu(x, y, def) {
    const A = this.terrain.ahu;
    if (!A || !A.alive) return;
    const g = this.terrain.hAt(A.x);
    const dx = Math.max(0, Math.abs(x - A.x) - AHU_W / 2), dy = Math.max(0, g - AHU_H - y, y - g);
    const r = Math.max(30, def.dmgR * 0.7), d = Math.hypot(dx, dy);
    if (d >= r) return;
    A.hp -= (def.dmg * 0.5 + 40) * (1 - d / r);
    A.flash = 1;
    if (A.hp > 0) return;
    A.alive = false;
    this.particles.explosion(A.x, g - AHU_H / 2, 140, 'shell');
    this.shake = Math.max(this.shake, 10);
    this.sfx.explosion(45);
    this.bg.coldSnap = true;
    this.ui.notice('The AHU is down. The warmth is going: snow is coming.');
    this.events.push('The old-world AHU was destroyed. The meadow goes cold.');
  },

  // the cold settles over a few seconds once the AHU is gone
  stepCold() {
    const bg = this.bg;
    if (!bg.coldSnap || bg.cold >= 1) return;
    bg.cold = Math.min(1, (bg.cold || 0) + 0.0025);
    this.terrain.frost = bg.cold;
    if (bg.cold > 0.15 && !bg.particleOverride) bg.letItSnow();
  },

  drawAhu(ctx) {
    const A = this.terrain.ahu;
    if (!A) return;
    const g = Math.round(this.terrain.hAt(A.x)), x = Math.round(A.x), t = this.time;
    if (!A.alive) { // a burnt-out shell, still smoking
      ctx.fillStyle = 'rgb(46,40,40)'; ctx.fillRect(x - AHU_W / 2, g - 26, AHU_W, 26);
      ctx.fillStyle = 'rgb(30,26,26)'; ctx.fillRect(x - AHU_W / 2 + 10, g - 38, 30, 12); ctx.fillRect(x + 8, g - 32, 22, 6);
      if (Math.random() < 0.08) this.particles.puff(x + (Math.random() - 0.5) * 60, g - 30, [70, 66, 70]);
      return;
    }
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.3); // its warmth comes and goes, slowly
    for (let k = 4; k >= 1; k--) { ctx.fillStyle = `rgba(255,170,90,${(0.035 * (5 - k) * (0.6 + 0.4 * breathe)).toFixed(3)})`; ctx.fillRect(x - AHU_W / 2 - k * 26, g - AHU_H - k * 22, AHU_W + k * 52, AHU_H + k * 22); }
    const white = A.flash > 0.3;
    A.flash = Math.max(0, (A.flash || 0) - 0.08);
    const C = (c) => (white ? '#ffffff' : c);
    ctx.fillStyle = C('#6e6a62'); ctx.fillRect(x - AHU_W / 2, g - AHU_H, AHU_W, AHU_H); // the casing, weathered
    ctx.fillStyle = C('#878278'); ctx.fillRect(x - AHU_W / 2, g - AHU_H, AHU_W, 5);
    ctx.fillStyle = C('#4e4a44'); ctx.fillRect(x - AHU_W / 2, g - 6, AHU_W, 6); // its plinth
    ctx.fillStyle = C('#3a3632'); // the intake louvres
    for (let i = 0; i < 6; i++) ctx.fillRect(x - AHU_W / 2 + 8, g - AHU_H + 12 + i * 7, 30, 3);
    ctx.fillStyle = C('#2e2a28'); ctx.fillRect(x + 4, g - AHU_H + 10, 38, 38); // the fan housing
    ctx.fillStyle = `rgba(255,170,90,${(0.5 + 0.4 * breathe).toFixed(2)})`; ctx.fillRect(x + 8, g - AHU_H + 14, 30, 30); // warm light through it
    ctx.fillStyle = C('#3a3632'); // the fan, turning
    const f = (t * 6 | 0) % 2;
    ctx.fillRect(x + 21, g - AHU_H + 14, 4, 30); ctx.fillRect(x + 8, g - AHU_H + 27, 30, 4);
    if (f) { for (let i = 0; i < 4; i++) { sq(ctx, x + 13 + i * 7, g - AHU_H + 19 + i * 7, 3); sq(ctx, x + 34 - i * 7, g - AHU_H + 19 + i * 7, 3); } }
    ctx.fillStyle = C('#5a564e'); ctx.fillRect(x - AHU_W / 2 - 10, g - 20, 12, 20); ctx.fillRect(x + AHU_W / 2 - 2, g - 28, 12, 28); // pipes into the ground
    ctx.fillStyle = 'rgba(230,226,214,0.8)'; ctx.font = `8px ${HUD_FONT}`; ctx.textAlign = 'left';
    ctx.fillText('AHU · ????', x - AHU_W / 2 + 8, g - 10); // no date on the plate
    if (A.hp < AHU_HP) { // its health, once it has been hit
      ctx.fillStyle = 'rgba(18,17,25,0.8)'; ctx.fillRect(x - 30, g - AHU_H - 14, 60, 6);
      ctx.fillStyle = '#ff9a4a'; ctx.fillRect(x - 29, g - AHU_H - 13, Math.round(58 * clamp(A.hp / AHU_HP, 0, 1)), 4);
    }
  },
});
