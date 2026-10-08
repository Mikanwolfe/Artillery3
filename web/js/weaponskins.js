'use strict';
// Weapon skins: how each gun looks on a turret girl's rigging and how its shells look in flight.
// Built from the weapon's stats so every gun is distinct (barrels = rounds per shot, length = range,
// thickness = damage, a muzzle brake on big blasts, a rarity-coloured band, a tip by type), with
// hand-made touches for the signature guns. Boxes only, never rotated: a barrel is a line of squares.

const SKIN_OVERRIDES = {
  terminus: { barrels: 4, size: 5, n: 9, gap: 5, color: '#e8e8f4', band: '#4a6aff', glow: '#9ab4ff' }, // white-haired, blue-eyed holy sword
  ragnarok: { barrels: 1, size: 7, n: 10, gap: 6, color: '#4e5464', band: '#ff4a3a', brake: true }, // her gun, with a red marker band
  massdriver: { barrels: 2, size: 4, n: 11, gap: 6, color: '#8a90a0', band: '#ffffff', rail: true, glow: '#c8f0ff' }, // a rail
  cls220: { color: '#c86494', band: '#ffd0e4' }, // Doki-Doki pink
  cls770: { color: '#b45ab4', band: '#ff9ad8', size: 6 }, // Natsuki: pink and purple cupcakes
  laser88: { color: '#3a6a4a', band: '#e8fff0', glow: '#9affc0' }, // Nadeko Snake: green and white
  lfs75: { ears: true }, // Neko Paradise: cat ears on the muzzle
  laser15x: { ears: true, glow: '#ffe0f8' }, // Neko-15X
  horizon: { color: '#3a2a4a', band: '#c8a0ff', glow: '#d0ff90' },
  sanshiki: { color: '#5a4a3a', band: '#ff8a3a', size: 7 },
  maya: { color: '#5a6070' },
  akizuki: { color: '#606a74' },
  katis: { band: 'rgb(255,120,200)' },
};

const KIND_TINT = { shell: null, gun: '#4a4f5a', laser: '#33404e', acid: '#3c5a34', flak: '#5c5c4c', rocket: '#5a6450' };

const skinCache = new Map();
function gunSkin(w) {
  const key = w.id + ':' + w.dmg + ':' + w.salvo;
  if (skinCache.has(key)) return skinCache.get(key);
  // a laser's weapon is its drone (lasers.js): on her rigging there is only the pointer
  const o = w.kind === 'laser' ? { barrels: 1, n: 3, size: 3, brake: false, sat: false } : SKIN_OVERRIDES[w.id] || {};
  const skin = {
    barrels: clamp(w.salvo, 1, 4),
    n: clamp(4 + Math.round(Math.min(w.maxCharge, 140) / 22), 5, 10),
    size: clamp(2.5 + w.dmg / 160, 3, 8),
    step: 0,
    start: 5,
    color: KIND_TINT[w.kind],
    band: RARITY[w.rarity].color,
    brake: w.dmgR >= 120,
    tip: w.kind === 'laser' ? 'lens' : w.kind === 'acid' ? 'acid' : w.kind === 'flak' ? 'flak' : w.kind === 'rocket' ? 'tube' : null,
    sat: w.sat,
    gap: 0,
    ...o,
  };
  if (w.kind === 'rocket') skin.size = Math.max(skin.size, 6); // fat launcher tubes
  skin.step = skin.size * 0.8 + 1;
  if (!skin.gap) skin.gap = skin.size * 0.75 + 1;
  skinCache.set(key, skin);
  return skin;
}

// barrel length from the pivot to the muzzle (world units)
function gunLength(w) {
  const s = gunSkin(w);
  return s.start + s.step * s.n;
}

// draw the gun at pivot p along unit vector v; `deep` is the girl's dark player-colour shade.
// Animated: barrels glow hot just after firing (`recoil` 1 -> 0), a laser lens brightens as the shot
// charges (`charge` 0..1), flak fuse rings and the uplink beacon cycle with time `t`.
function drawGun(ctx, w, p, v, facing, recoil, deep, t, charge = 0) {
  const s = gunSkin(w);
  // recoil: the barrel slams back (the first fifth of the decay) then runs out again slowly; heavy
  // guns travel further (3 world units for the lightest, up to 14)
  const kick = clamp(3 + w.dmg / 120, 3, 14) * (recoil > 0.8 ? (1 - recoil) / 0.2 : recoil / 0.8);
  const body = s.color || deep;
  for (let b = 0; b < s.barrels; b++) {
    const off = (b - (s.barrels - 1) / 2) * s.gap;
    const ox = -v.y * off * facing;
    const oy = v.x * off * facing;
    for (let i = 0; i < s.n; i++) {
      const d = s.start + i * s.step - kick;
      const last = i === s.n - 1;
      let size = s.size;
      if (last && s.brake) size += 2;
      if (s.rail && i % 2) size -= 1;
      ctx.fillStyle = i === 1 ? s.band : body;
      sq(ctx, p.x + ox + v.x * d, p.y + oy + v.y * d, size);
      const heat = recoil * (i / s.n); // hot towards the muzzle
      if (heat > 0.05) {
        ctx.fillStyle = `rgba(255,${140 + 80 * (1 - heat)},60,${heat * 0.85})`;
        sq(ctx, p.x + ox + v.x * d, p.y + oy + v.y * d, size - 1);
      }
    }
  }
  // the muzzle end: lens, acid tank, flak fuse ring, cat ears, a satellite antenna
  const d = s.start + (s.n - 1) * s.step - kick;
  const mx = p.x + v.x * d;
  const my = p.y + v.y * d;
  if (s.tip === 'lens' || s.glow) {
    ctx.fillStyle = s.glow || RARITY[w.rarity].color;
    ctx.globalAlpha = clamp(0.5 + 0.3 * Math.sin(t * 6) + charge * 0.5, 0, 1);
    sq(ctx, mx + v.x * 3, my + v.y * 3, Math.max(3, s.size - 1) + charge * 5);
    if (charge > 0.2) { // gathering light around the lens
      for (let k = 0; k < 4; k++) {
        const a = t * 5 + (k * Math.PI) / 2;
        const r = 10 * (1 - ((t * 2 + k / 4) % 1));
        sq(ctx, mx + v.x * 3 + Math.cos(a) * r, my + v.y * 3 + Math.sin(a) * r, 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (s.tip === 'acid') { // a glass tank of acid on the breech
    ctx.fillStyle = '#7ad04a';
    sq(ctx, p.x - v.x * 4, p.y - v.y * 4 - 5, s.size + 3);
    ctx.fillStyle = '#c8ff90';
    sq(ctx, p.x - v.x * 4 - 1, p.y - v.y * 4 - 7, 2);
  }
  if (s.tip === 'flak') { // fuse rings along the barrels
    ctx.fillStyle = '#c8b46a';
    const shift = ((t * 3) % 1) * 0.12; // the rings tick along the barrel
    for (const k of [0.3 + shift, 0.62 + shift]) sq(ctx, p.x + v.x * d * k, p.y + v.y * d * k, s.size + 2);
  }
  if (s.tip === 'tube') { // launcher tubes: a dark mouth at each muzzle, and a fin band at the breech
    for (let b = 0; b < s.barrels; b++) {
      const off = (b - (s.barrels - 1) / 2) * s.gap;
      ctx.fillStyle = '#1c1a20';
      sq(ctx, mx - v.y * off * facing + v.x * 2, my + v.x * off * facing + v.y * 2, Math.max(2, s.size - 2));
    }
    ctx.fillStyle = '#c4c8b0';
    sq(ctx, p.x + v.x * (s.start + s.step), p.y + v.y * (s.start + s.step), s.size + 2);
  }
  if (s.ears) {
    ctx.fillStyle = s.band;
    sq(ctx, mx - v.y * 4 * facing + v.x * 2, my + v.x * 4 * facing + v.y * 2 - 3, 3);
    sq(ctx, mx + v.y * 4 * facing + v.x * 2, my - v.x * 4 * facing + v.y * 2 - 3, 3);
  }
  if (s.sat) { // a little uplink dish on the breech
    ctx.fillStyle = '#c8ccd8';
    sq(ctx, p.x - v.x * 3, p.y - v.y * 3 - 7, 5);
    ctx.fillStyle = (t * 2) % 2 < 1 ? 'rgb(255,120,200)' : 'rgb(160,60,120)';
    sq(ctx, p.x - v.x * 3, p.y - v.y * 3 - 10, 2);
  }
}

// shells in flight: size from damage, colour from type (and rarity for lasers)
function shellSkin(w) {
  const size = clamp(5 + w.dmg / 140, 5, 12);
  if (w.frag) return { size: 3, body: [70, 60, 50], nose: [140, 110, 80] };
  if (w.id === 'ragnarok') return { size: 8, body: [70, 74, 86], nose: [255, 70, 50] }; // a marker round
  if (w.dark) return { size: 7, body: [14, 10, 18], nose: [150, 30, 60] }; // the black rockets out of Morrighan's tears
  if (w.bomblet) return { size: 5, body: [64, 70, 56], nose: [230, 200, 90] };
  if (w.kind === 'rocket') return { size: clamp(5 + w.dmg / 120, 5, 9), body: [214, 216, 202], nose: [200, 60, 50] };
  if (w.id && w.id.startsWith('mob') || w.id === 'shipbomb') return { size, body: [80, 40, 50], nose: [255, 90, 90] };
  if (w.kind === 'laser') return { size: 4, body: [255, 60, 74], nose: [255, 210, 214] }; // the laser pointer's marker
  if (w.kind === 'acid') return { size, body: [70, 160, 50], nose: [200, 255, 140] };
  if (w.kind === 'flak') return { size, body: [92, 92, 76], nose: [255, 220, 120] };
  if (w.kind === 'gun') return { size: size - 1, body: [60, 64, 74], nose: [200, 200, 210] };
  const o = SKIN_OVERRIDES[w.id];
  return { size, body: o && o.color ? hexToRgb(o.color) : [50, 50, 64], nose: o && o.band && o.band.startsWith('#') ? hexToRgb(o.band) : [150, 150, 170] };
}
