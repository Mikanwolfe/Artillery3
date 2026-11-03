'use strict';
// Items: the Emporium (Armoury, Potion Store, Enchanting Room, the Soulstream exchange) and loot.
// The original planned all of this (To do.txt, Items SS2, Enchants SS2) and built the inventory screen:
// four bag slots, three equipment slots and two potion slots. Here: an eight-slot bag, a weapon slot
// plus the three equipment slots, and two quick slots for potions.

// ------------------------------------------------------------------------------- tiers and badges
// Artillery 3's rank system, taken whole: the same eight tiers in the same colours, and the same badge
// (a square outlined in the tier colour, the tier's initial and a type letter: "Cs" is a Common sword).
// Everything that can be ranked uses it: weapons, accessories, potions and skills, so a glance at the
// colours tells you how far you have come. Tiers open as you go deeper (TIER_FLOOR).
const RARITIES = [
  { id: 'common', name: 'Common', color: '#74aee0', mult: 1.0, lines: 1, w: 50 },
  { id: 'uncommon', name: 'Uncommon', color: '#52c45a', mult: 1.3, lines: 2, w: 26 },
  { id: 'rare', name: 'Rare', color: '#ff7040', mult: 1.65, lines: 2, w: 13 },
  { id: 'epic', name: 'Epic', color: '#ff5aae', mult: 2.1, lines: 3, w: 6 },
  { id: 'mythical', name: 'Mythical', color: '#c070ff', mult: 2.7, lines: 3, w: 2.6 },
  { id: 'legendary', name: 'Legendary', color: '#30c8c8', mult: 3.4, lines: 4, w: 1.0, enchant: true },
  { id: 'godly', name: 'Godly', color: '#ffffff', mult: 4.3, lines: 4, w: 0.3, enchant: true },
  // A3's tier above Godly (there, Parallel Night: each girl's final weapon). Here it is the Final Light's
  // own: only Luminous and the bosses of the Beyond drop it.
  { id: 'luminous', name: 'Luminous', color: '#ffd866', mult: 5.5, lines: 5, w: 0, enchant: true },
];
const RARITY_BY_ID = Object.fromEntries(RARITIES.map((r, i) => [r.id, { ...r, i }]));
// the deepest floor cleared before a tier can drop or be sold (Common and Uncommon from the start)
const TIER_FLOOR = { common: 0, uncommon: 0, rare: 5, epic: 15, mythical: 30, legendary: 45, godly: 70, luminous: 99 };
const tierOpen = (id, best) => best >= TIER_FLOOR[id];
const SHOP_TIER_CAP = (best) => (best >= 60 ? 'mythical' : best >= 25 ? 'epic' : best >= 10 ? 'rare' : 'uncommon');

// ------------------------------------------------------------------------------- equipment
// One weapon and three accessories (the original's three equipment slots). Weapon types decide what
// they boost; classes have favourites, which roll their damage line 25% higher.
const WEAPON_TYPES = {
  sword: { name: 'Sword', letter: 's', pat: ['Sword of %', '% Sword', '% Blade'], dmg: ['physPct'], lean: ['str', 'bal', 'crit'], fav: ['adventurer', 'laceda', 'falias'] },
  spear: { name: 'Spear', letter: 'p', pat: ['Spear of %', '% Lance', '% Pike'], dmg: ['physPct'], lean: ['dfp', 'str', 'acc'], fav: ['laceda', 'falias'] },
  bow: { name: 'Bow', letter: 'w', pat: ['Bow of %', '% Longbow'], dmg: ['physPct'], lean: ['dex', 'crit', 'critMult', 'acc'], fav: ['adventurer', 'luminous'] },
  scythe: { name: 'Scythe', letter: 'y', pat: ['Scythe of %', '% Reaper'], dmg: ['physPct', 'magPct'], lean: ['dfp', 'critMult', 'str', 'int'], fav: ['laceda', 'luminous'] },
  staff: { name: 'Staff', letter: 't', pat: ['Staff of %', '% Staff'], dmg: ['magPct'], lean: ['int', 'mpFlat', 'wil'], fav: ['adventurer', 'eweca'] },
  tome: { name: 'Tome', letter: 'm', pat: ['Tome of %', '% Grimoire', '% Scrolls'], dmg: ['magPct'], lean: ['int', 'mpPct', 'costPct', 'luk'], fav: ['eweca', 'luminous'] },
};
// The original's 35 name patterns ("Ring of %%", "%% Wear", ...), grouped into accessory types that
// lean toward certain stats so a Glove reads differently from a Rune.
const ACCESSORY_TYPES = {
  ring: { name: 'Ring', letter: 'r', pat: ['Ring of %', '% Ring'], lean: ['luk', 'crit', 'critMult', 'scPct'] },
  neck: { name: 'Necklace', letter: 'n', pat: ['Necklace of %', '% Necklace', 'Pendant of %', '% Pendant', 'Amulet of %', '% Amulet'], lean: ['wil', 'hpFlat', 'hpPct', 'mpFlat'] },
  attire: { name: 'Attire', letter: 'a', pat: ['Robe of %', '% Wear', '% Uniform', '% Outfit', 'Scarf of %', '% Scarf'], lean: ['def', 'hpFlat', 'prot', 'avd'] },
  glove: { name: 'Glove', letter: 'g', pat: ['Glove of %', '% Glove'], lean: ['str', 'dex', 'physPct', 'acc'] },
  glasses: { name: 'Glasses', letter: 'l', pat: ['Glasses of %', '% Glasses'], lean: ['dex', 'acc', 'crit', 'int'] },
  rune: { name: 'Rune', letter: 'u', pat: ['Spell of %', '% Spell', 'Rune of %', '% Rune', 'Hex of %', '% Hex'], lean: ['int', 'magPct', 'mpFlat', 'mpPct'] },
  bane: { name: 'Bane', letter: 'x', pat: ['Bane of %'], lean: ['dfp', 'dmgPct', 'str', 'bossPct'] },
  wings: { name: 'Wings', letter: 'v', pat: ['Wings of %', '% Wings'], lean: ['avd', 'dex', 'int', 'avdPct'] },
  charm: { name: 'Charm', letter: 'c', pat: ['Cross of %', '% Cross', 'Charm of %', '% Charm', 'Mark of %'], lean: ['luk', 'xpPct', 'scPct', 'healPct'] },
};
// %% names: the original's test items (Lorenzo's, Moses, Jason, Anton) and the world's names
const ITEM_NAMES = ["Lorenzo's", 'Moses', 'Jason', 'Anton', 'Erinn', 'Fleta', 'Kydos', 'Meles', 'Nao', 'Lumi', 'Aria', 'Lucia', 'Theo',
  'Morrighan', 'Macha', 'Neamhain', 'Cichol', 'Nuada', 'Lugh', 'the Dagda', 'Brigid', 'Manannan', 'Ogma', 'Danu', 'Aengus', 'Tethra',
  'Elatha', 'Bres', 'Fionn', 'Oisin', 'Niamh', 'Scathach', 'Cuchulainn', 'Emer', 'Deirdre', 'Tuireann', 'Falias', 'Gorias', 'Murias', 'Findias'];

// stat lines: unit value per budget point, how it rolls (flat stats scale with the floor)
const STAT_LINES = {
  str: { name: 'STR', unit: 1.0, flat: 'stat' }, dex: { name: 'DEX', unit: 1.0, flat: 'stat' }, int: { name: 'INT', unit: 1.0, flat: 'stat' },
  luk: { name: 'LUK', unit: 1.0, flat: 'stat' }, wil: { name: 'WIL', unit: 1.0, flat: 'stat' },
  def: { name: 'DEF', unit: 0.6, flat: 'stat' }, dfp: { name: 'DFP', unit: 0.6, flat: 'stat' }, bal: { name: 'BAL', unit: 0.7, flat: 'stat' },
  acc: { name: 'ACC', unit: 0.8, flat: 'stat' }, avd: { name: 'AVD', unit: 0.6, flat: 'stat' },
  hpFlat: { name: 'HP', unit: 1.0, flat: 'hp' }, mpFlat: { name: 'MP', unit: 1.0, flat: 'mp' },
  hpPct: { name: 'HP', pct: 0.08 }, mpPct: { name: 'MP', pct: 0.1 }, avdPct: { name: 'AVD', pct: 0.1 },
  crit: { name: 'Crit', fixed: 3, unitLabel: '%' }, critMult: { name: 'Crit x', fixed: 0.12 },
  prot: { name: 'Prot', pct: 0.03 }, dmgPct: { name: 'Damage', pct: 0.06 }, physPct: { name: 'Phys dmg', pct: 0.08 },
  magPct: { name: 'Magic dmg', pct: 0.08 }, bossPct: { name: 'vs Bosses', pct: 0.12 }, healPct: { name: 'Healing', pct: 0.1 },
  scPct: { name: 'Soul Coins', pct: 0.1 }, xpPct: { name: 'XP', pct: 0.1 }, costPct: { name: 'MP cost', pct: -0.04 },
};
const WEAPON_DMG = 0.1; // a weapon's damage line at Common, floor 1: +10%; it grows with tier and depth
// flat stat per budget point at an item level: grows with the floor so gear keeps up with masteries
const itemStatUnit = (lvl) => 3 + lvl * 0.9;
const itemHpUnit = (lvl) => 14 * Math.pow(floorScale(lvl), 0.8);

// ------------------------------------------------------------------------------- enchants
// Enchants SS2: the verbs. Positive ones roll more often; the Enchanting Room rerolls them for Soul Coins.
const ENCHANTS = {
  magnanimous: { mods: { scPct: 0.3, xpPct: 0.3 }, w: 3 }, // the doc's "Magnanimous Gold Ring - +100% Meso/Exp Gain"
  legendary: { mods: { dmgPct: 0.15 }, w: 1.2, tier: 2 },
  godly: { mods: { dmgPct: 0.25, statPct: 0.1 }, w: 0.4, tier: 3 },
  deadly: { mods: { critMult: 0.35 }, w: 3 },
  fatal: { mods: { crit: 6 }, w: 3 },
  staunch: { mods: { defPct: 0.15, hpPct: 0.08 }, w: 3 },
  vigorous: { mods: { hpPct: 0.12 }, w: 3 },
  enthusiastic: { mods: { mpRegen: 0.02 }, w: 3 },
  noble: { mods: { statPct: 0.08 }, w: 1.5, tier: 1 },
  exalted: { mods: { statPct: 0.12 }, w: 0.8, tier: 2 },
  affable: { mods: { healPct: 0.2 }, w: 3 },
  delightful: { mods: { potionPct: 0.3 }, w: 3 },
  experienced: { mods: { xpPct: 0.25 }, w: 3 },
  luxurious: { mods: { scPct: 0.25 }, w: 3 },
  authentic: { mods: { acc: 15 }, w: 3 },
  symbolic: { mods: { costPct: -0.1 }, w: 2.5 },
  strong: { mods: { 'str%': 0.12 }, w: 3 },
  archaic: { mods: { magPct: 0.2 }, w: 2 },
  grisly: { mods: { bleedOnHit: 0.15 }, w: 2 },
  rapturous: { mods: { lifesteal: 0.05 }, w: 2 },
  ecstatic: { mods: { avdPct: 0.15 }, w: 3 },
  incredible: { mods: { bossPct: 0.25 }, w: 2 },
  significant: { mods: { dfpPct: 0.15 }, w: 3 },
  vigilant: { mods: { prot: 0.04 }, w: 2 },
  fair: { mods: { statPct: 0.03 }, w: 4 },
  good: { mods: { hpPct: 0.04, mpPct: 0.04 }, w: 4 },
  satisfactory: { mods: { dmgPct: 0.03 }, w: 4 },
  // negative
  clumsy: { mods: { 'dex%': -0.12 }, neg: true, w: 2 },
  fragile: { mods: { defPct: -0.15 }, neg: true, w: 2 },
  sluggish: { mods: { avdPct: -0.15 }, neg: true, w: 2 },
  sickly: { mods: { hpPct: -0.1 }, neg: true, w: 2 },
  puny: { mods: { 'str%': -0.1 }, neg: true, w: 2 },
  dull: { mods: { 'int%': -0.1 }, neg: true, w: 2 },
  awkward: { mods: { acc: -10 }, neg: true, w: 2 },
  haughty: { mods: { healPct: -0.15 }, neg: true, w: 2 },
  lethargic: { mods: { mpRegen: -0.01 }, neg: true, w: 2 },
  blunt: { mods: { dmgPct: -0.08 }, neg: true, w: 2 },
  shaky: { mods: { crit: -5 }, neg: true, w: 2 },
  stinky: { mods: { scPct: -0.1 }, neg: true, w: 2 },
  broken: { scaleStats: 0.7, neg: true, w: 1.2 },
  worn: { scaleStats: 0.85, neg: true, w: 2 },
  useless: { scaleStats: 0.5, neg: true, w: 0.5 },
};
for (const [id, e] of Object.entries(ENCHANTS)) { e.id = id; e.name = id[0].toUpperCase() + id.slice(1); }
const ENCHANT_NEG_CHANCE = 0.22;
const enchantPrice = (it) => Math.round(60 * Math.pow(floorScale(it.lvl), REWARD_EXP) * (1 + RARITY_BY_ID[it.rarity].i * 0.5));

function rollEnchant(r = rng, opts = {}) {
  const pool = Object.values(ENCHANTS).filter((e) => (opts.positive ? !e.neg : true) && (!e.tier || (opts.lvl || 0) >= e.tier * 20));
  const neg = !opts.positive && r.chance(ENCHANT_NEG_CHANCE);
  return r.weighted(pool.filter((e) => !!e.neg === neg), (e) => e.w).id;
}

// ------------------------------------------------------------------------------- generation
function rollRarity(lvl, boost = 0, r = rng, cap = 'godly') {
  // deeper floors and champions/bosses shift the weights upward; tiers past `cap` or not yet open don't roll
  const capI = RARITY_BY_ID[cap].i;
  const shift = Math.min(3.5, lvl / 25 + boost);
  const pool = RARITIES.filter((x, i) => i <= capI && x.w > 0 && tierOpen(x.id, lvl - 1));
  return r.weighted(pool, (x) => x.w * Math.pow(1 + 0.3 * shift, RARITIES.indexOf(x))).id;
}
function makeItem(lvl, opts = {}, r = rng) {
  const rarity = opts.rarity || rollRarity(lvl, opts.boost || 0, r, opts.cap);
  const R = RARITY_BY_ID[rarity];
  const slot = opts.slot || (r.chance(0.3) ? 'weapon' : 'acc');
  const typeId = opts.type || r.pick(Object.keys(slot === 'weapon' ? WEAPON_TYPES : ACCESSORY_TYPES));
  const T = slot === 'weapon' ? WEAPON_TYPES[typeId] : ACCESSORY_TYPES[typeId];
  const stats = {};
  const keys = [];
  const allKeys = Object.keys(STAT_LINES).filter((k) => k !== 'costPct');
  const lines = R.lines - (slot === 'weapon' ? 1 : 0); // a weapon's first line is its damage
  for (let i = 0; i < lines; i++) {
    const pool = (i < 2 ? T.lean : allKeys).filter((k) => !keys.includes(k));
    keys.push(r.pick(pool.length ? pool : allKeys.filter((k) => !keys.includes(k))));
  }
  for (const k of keys) {
    const L = STAT_LINES[k];
    const roll = r.range(0.75, 1.25) * R.mult;
    let v;
    if (L.flat === 'stat') v = Math.max(1, Math.round(itemStatUnit(lvl) * L.unit * roll));
    else if (L.flat === 'hp' || L.flat === 'mp') v = Math.max(5, Math.round(itemHpUnit(lvl) * (L.flat === 'mp' ? 0.6 : 1) * roll));
    else if (L.pct) v = +(L.pct * roll * (1 + lvl / 120)).toFixed(3);
    else v = +(L.fixed * roll * (1 + lvl / 150)).toFixed(2);
    if (k === 'costPct') v = Math.max(-0.3, v);
    stats[k] = v;
  }
  const it = { uid: uid(), kind: 'gear', slot, type: typeId, base: r.pick(T.pat), nm: r.pick(ITEM_NAMES), rarity, lvl, stats, rate: +r.range(0.8, 1.25).toFixed(2) };
  if (slot === 'weapon') {
    it.dmg = +(WEAPON_DMG * R.mult * r.range(0.85, 1.15) * (1 + lvl / 60)).toFixed(3);
  }
  if (R.enchant) it.enchant = rollEnchant(r, { positive: true, lvl });
  else if (opts.enchant) it.enchant = opts.enchant;
  return it;
}
let _uid = 1;
function uid() { return Date.now().toString(36) + (_uid++).toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

function itemType(it) { return it.slot === 'weapon' ? WEAPON_TYPES[it.type] : ACCESSORY_TYPES[it.type]; }
// the badge: tier initial + type letter, A3 style
function badgeOf(thing) {
  if (thing.kind === 'potion') { const t = POTION_RARITY[POTIONS[thing.id].tier]; return { text: RARITY_BY_ID[t].name[0] + 'q', rarity: t }; }
  if (thing.kind === 'gear') return { text: thing.rarity[0].toUpperCase() + itemType(thing).letter, rarity: thing.rarity };
  if (thing.kind === 'skill') { const s = SKILLS[thing.id]; return { text: RARITY_BY_ID[s.tier].name[0] + SKILL_LETTER[s.type], rarity: s.tier }; }
  return { text: '-', rarity: 'common' };
}
function itemName(it) {
  if (it.kind === 'potion') return POTIONS[it.id].name;
  const n = it.base.replace('%', it.nm);
  return (it.enchant ? ENCHANTS[it.enchant].name + ' ' : '') + n;
}
function itemMods(it, cls) {
  if (!it || it.kind !== 'gear') return null;
  const e = it.enchant && ENCHANTS[it.enchant];
  const scale = e && e.scaleStats ? e.scaleStats : 1;
  const m = {};
  if (it.slot === 'weapon') {
    const T = WEAPON_TYPES[it.type];
    const fav = cls && T.fav.includes(cls) ? 1.25 : 1;
    for (const k of T.dmg) m[k] = (m[k] || 0) + it.dmg * scale * fav / T.dmg.length * (T.dmg.length > 1 ? 1.5 : 1);
  }
  for (const [k, v] of Object.entries(it.stats)) m[k] = (m[k] || 0) + (STAT_LINES[k].flat ? Math.round(v * scale) : v * scale);
  if (e && e.mods) for (const [k, v] of Object.entries(e.mods)) m[k] = (m[k] || 0) + v;
  return m;
}
function fmtMod(k, v) {
  const L = STAT_LINES[k];
  const name = L ? L.name : (STAT_NAMES[k] || ({ costPct: 'MP cost', potionPct: 'Potions', mpRegen: 'MP/turn', hpRegen: 'HP/turn', lifesteal: 'Lifesteal',
    statPct: 'All stats', bleedOnHit: 'Bleed on hit', defPct: 'DEF', dfpPct: 'DFP', avdPct: 'AVD' }[k]) || k.replace('%', ''));
  if (k.endsWith('%')) return `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${(STAT_NAMES[k.slice(0, -1)] || k)}`;
  if (k === 'crit') return `${v > 0 ? '+' : ''}${v.toFixed(1)}% ${name}`;
  if (k === 'costPct') return `${Math.round(v * 100)}% MP cost`;
  if (k === 'critMult') return `${v > 0 ? '+' : ''}${v.toFixed(2)} ${name}`;
  if ((L && (L.pct)) || /Pct$|prot|Regen|lifesteal|bleedOnHit/.test(k)) return `${v > 0 ? '+' : ''}${(v * 100).toFixed(k === 'mpRegen' || k === 'hpRegen' ? 1 : 0)}% ${name}`;
  return `${v > 0 ? '+' : ''}${fmt(v)} ${name}`;
}
function itemValue(it) {
  if (it.kind === 'potion') return POTIONS[it.id].price * priceScale(it.lvl || 1);
  const R = RARITY_BY_ID[it.rarity];
  return Math.round(55 * Math.pow(floorScale(it.lvl), REWARD_EXP) * Math.pow(R.mult, 1.6) * (it.slot === 'weapon' ? 1.3 : 1) * (it.rate || 1) * (it.enchant && !ENCHANTS[it.enchant].neg ? 1.25 : 1));
}
const priceScale = (f) => Math.pow(floorScale(f), REWARD_EXP);

// ------------------------------------------------------------------------------- potions
// To do.txt's potion list, with its limits (3 / 2 / 1 / 1 per stack). heal/mp are shares of max.
const POTIONS = {
  hp: { name: 'HP Potion', tier: 'common', stack: 3, price: 30, heal: 0.35, desc: 'Restores 35% health.' },
  mp: { name: 'MP Potion', tier: 'common', stack: 3, price: 30, mpGain: 0.4, desc: 'Restores 40% mana.' },
  hybrid: { name: 'Hybrid Potion', tier: 'common', stack: 3, price: 45, heal: 0.25, mpGain: 0.25, desc: 'Restores 25% health and mana.' },
  ironskin: { name: 'Ironskin Potion', tier: 'common', stack: 3, price: 40, buff: { name: 'Ironskin', turns: 2, mods: { defPct: 0.6 } }, desc: 'Defence +60% for 2 turns.' },
  sniper: { name: 'Sniper Potion', tier: 'common', stack: 3, price: 40, buff: { name: 'Sniper', turns: 2, mods: { acc: 40, 'dex%': 0.2 } }, desc: 'Accuracy +40, DEX +20% for 2 turns.' },
  invis: { name: 'Invisibility Potion', tier: 'common', stack: 3, price: 40, buff: { name: 'Invisible', turns: 2, mods: { avdPct: 0.6 } }, desc: 'Avoidance +60% for 2 turns.' },
  tonic: { name: 'Damage Tonic', tier: 'common', stack: 3, price: 50, buff: { name: 'Tonic', turns: 2, mods: { dmgPct: 0.25 } }, desc: 'Damage +25% for 2 turns.' },
  elixir: { name: 'Elixir', tier: 'rare', stack: 2, price: 120, heal: 0.4, mpGain: 0.4, desc: 'Restores 40% health and mana.' },
  soul: { name: 'Soul Elixir', tier: 'rare', stack: 2, price: 90, setHalf: true, desc: 'Sets health and mana to exactly 50%. A gamble when low; a waste when high.' },
  stone: { name: 'Stone Tonic', tier: 'rare', stack: 2, price: 140, buff: { name: 'Stone', turns: 2, mods: { 'str%': 2.0, defPct: 4.0, 'int%': -0.8, 'luk%': -0.8, 'wil%': -0.8 } },
    desc: 'STR x3 and defence x5, but INT, LUK and WIL fall to 20%, for 2 turns.' },
  enchanter: { name: 'Enchanter Potion', tier: 'rare', stack: 2, price: 110, buff: { name: 'Enchanted', turns: 2, mods: { crit: 25 } }, desc: '+25% crit chance for 2 turns.' },
  illusive: { name: 'Illusive Potion', tier: 'rare', stack: 2, price: 130, buff: { name: 'Illusive', turns: 2, mods: { costPct: -1 } }, desc: 'Skills cost no mana for 2 turns.' },
  denial: { name: 'Denial Analeptic', tier: 'epic', stack: 1, price: 400, buff: { name: 'Denial', turns: 1, deny: true }, desc: 'Take no damage until your next turn.' },
  corrupt: { name: 'Corrupt Analeptic', tier: 'epic', stack: 1, price: 380, buff: { name: 'Corrupt', turns: 1, mods: { dmgPct: 1.0 }, recoil: 0.1 },
    desc: 'Damage +100% this turn; each hit also costs you 10% of the damage.' },
  restore: { name: 'Restoration Elixir', tier: 'epic', stack: 1, price: 500, heal: 1, mpGain: 1, cleanse: 9, desc: 'Fully restores health and mana and lifts every debuff.' },
  luminous: { name: 'Luminous Elixir', tier: 'godly', stack: 1, price: 1600, buff: { name: 'Luminous', turns: 2, mods: { statPct: 1.0 } }, desc: 'All stats +100% for 2 turns.' },
  kydos: { name: 'Kydos Elixir', tier: 'godly', stack: 1, price: 1800, buff: { name: 'Kydos', turns: 1, mods: { dmgPct: 2.0 } }, desc: 'Triple damage this turn.' },
};
for (const [id, p] of Object.entries(POTIONS)) p.id = id;
const POTION_TIER_FLOOR = { common: 1, rare: 12, epic: 30, godly: 55 };
const POTION_RARITY = { common: 'common', rare: 'rare', epic: 'epic', godly: 'godly' };
const makePotion = (id, lvl, n = 1) => ({ uid: uid(), kind: 'potion', id, lvl, n });
const potionPrice = (id, f) => Math.round(POTIONS[id].price * priceScale(f));
