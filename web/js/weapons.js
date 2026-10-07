'use strict';
// Weapon roster (a trimmed version of the original A3 shop) and the shared
// ballistic stepper used by both live projectiles and the AI's simulations.

const SPEED_PER_POWER = 0.135; // px/step of muzzle velocity per point of power (0-100)

const WEAPONS = [
  {
    id: 'howitzer', name: 'Howitzer', tag: 'Shell', kind: 'shell', infinite: true,
    desc: 'Reliable high-arc shell. Always in stock.',
    cost: 0, pack: 0, elevMin: -5, elevMax: 85,
    speed: 1, grav: 1, wind: 1, dmg: 45, blast: 26, dmgR: 46, color: '#ffd27a',
  },
  {
    id: 'claymore', name: 'Cluster Bomb', tag: 'Cluster', kind: 'cluster',
    desc: 'Splits into five bomblets at the top of its arc.',
    cost: 700, pack: 3, elevMin: 10, elevMax: 85,
    speed: 1, grav: 1, wind: 1, dmg: 0, blast: 0, dmgR: 0, color: '#ffb36b',
    sub: { dmg: 22, blast: 15, dmgR: 32, count: 5 },
  },
  {
    id: 'lance', name: 'Sniper Shell', tag: 'Fast', kind: 'shell',
    desc: 'High muzzle velocity. Wind barely moves it.',
    cost: 900, pack: 3, elevMin: -10, elevMax: 60,
    speed: 1.5, grav: 1, wind: 0.35, dmg: 62, blast: 20, dmgR: 38, color: '#bfe4ff',
  },
  {
    id: 'acid', name: 'Acid Shell', tag: 'Acid', kind: 'acid',
    desc: 'Bursts into corrosive droplets that eat terrain and armour.',
    cost: 1200, pack: 3, elevMin: -5, elevMax: 80,
    speed: 1, grav: 1, wind: 1, dmg: 22, blast: 12, dmgR: 28, color: '#a6f06a',
  },
  {
    id: 'coil', name: 'Railgun', tag: 'Railgun', kind: 'shell',
    desc: 'Near-flat, near-instant slug. Ignores wind.',
    cost: 1400, pack: 3, elevMin: -15, elevMax: 30,
    speed: 3.4, grav: 0.06, wind: 0, dmg: 72, blast: 11, dmgR: 26, color: '#9fe8ff',
  },
  {
    id: 'signal', name: 'Orbital Strike', tag: 'Orbital', kind: 'marker',
    desc: 'Marks a spot. A satellite beam strikes it a moment later and bores a shaft.',
    cost: 1700, pack: 2, elevMin: -5, elevMax: 85,
    speed: 1, grav: 1, wind: 1, dmg: 95, blast: 0, dmgR: 0, beamHalf: 10, color: '#ff8fd8',
  },
  {
    id: 'terminus', name: 'Big Bertha', tag: 'Heavy', kind: 'shell',
    desc: 'Enormous shell. Enormous crater. Slow to fall out of the sky.',
    cost: 2800, pack: 1, elevMin: -5, elevMax: 85,
    speed: 1.05, grav: 1.15, wind: 1, dmg: 150, blast: 60, dmgR: 100, color: '#ff7a5c',
  },
];
const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

const UPGRADES = [
  { id: 'armor', name: 'Armour plating', desc: '+20 max HP per level', cost: 800, max: 3 },
  { id: 'engine', name: 'Engine tuning', desc: '+40 fuel per level', cost: 500, max: 3 },
];

// Rough expected damage, used by the AI to rank weapons.
function weaponValue(w) {
  if (w.kind === 'cluster') return w.sub.dmg * w.sub.count * 0.55;
  if (w.kind === 'marker') return w.dmg;
  return w.dmg + w.blast * 0.3;
}

// Advance a ballistic body by one simulation step.
// `p` = {x, y, vx, vy, age}. Returns null while in flight, or
// {hit:'terrain'|'tank'|'out', tank?} when it ends. Used for real shots AND AI search.
function stepBallistic(p, w, terrain, wind, tanks, owner) {
  p.vy += GRAV * w.grav;
  p.vx += wind * w.wind;
  const speed = Math.hypot(p.vx, p.vy);
  const sub = Math.max(1, Math.ceil(speed / 4));
  const sx = p.vx / sub;
  const sy = p.vy / sub;
  for (let i = 0; i < sub; i++) {
    p.x += sx;
    p.y += sy;
    if (p.x < -80 || p.x > W + 80 || p.y > H + 60) return { hit: 'out' };
    if (p.x >= 0 && p.x < W && p.y >= terrain.hAt(p.x)) return { hit: 'terrain' };
    for (const t of tanks) {
      if (!t.alive) continue;
      if (t === owner && p.age < 12) continue;
      if (Math.abs(p.x - t.x) < 13 && p.y > t.y - 15 && p.y < t.y + 2) return { hit: 'tank', tank: t };
    }
  }
  p.age++;
  return null;
}

// Fire a hypothetical shot and return where it lands. Pure; used by the AI solver.
function simulateShot(terrain, wind, w, tanks, owner, mx, my, vx, vy) {
  const p = { x: mx, y: my, vx, vy, age: 0 };
  for (let i = 0; i < 1200; i++) {
    const r = stepBallistic(p, w, terrain, wind, tanks, owner);
    if (r) return { x: p.x, y: p.y, hit: r.hit, tank: r.tank || null, steps: i };
  }
  return { x: p.x, y: p.y, hit: 'out', tank: null, steps: 1200 };
}
