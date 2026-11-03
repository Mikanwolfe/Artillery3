'use strict';
// The numbers. Every balance knob lives here (or in the data tables in skills.js / enemies.js /
// items.js) under a name, so tools/sim.mjs can be rerun after a change. BALANCE.md explains how the
// curves were chosen against the original's numbers.

// ---------------------------------------------------------------------------------------- ranks
// The original's 15 ranks: F, E, D, C, B, A, then 9 down to 1.
const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', '9', '8', '7', '6', '5', '4', '3', '2', '1'];
// Skill power by rank. The original went 0.5x (F) to 4.0x (1), with Attack starting at rank 4 and
// costing a tenth of everything else; here every skill starts at F = 1.0x and climbs to 4.7x.
const RANK_MULT = [1.00, 1.10, 1.21, 1.33, 1.46, 1.61, 1.78, 1.97, 2.18, 2.42, 2.70, 3.02, 3.40, 3.95, 4.70];
// MP cost by rank: costs grow slowly so ranking up is always a net gain (the original charged a
// quarter of the damage dealt as extra MP, which made big hits and crits punish you).
const RANK_MP = [1.00, 1.04, 1.08, 1.12, 1.16, 1.20, 1.25, 1.30, 1.35, 1.40, 1.46, 1.52, 1.58, 1.65, 1.72];
// Cost of reaching rank i (from i-1), as a multiple of the skill's base cost. Both Soul Coins and XP.
const RANK_COST = [0, 1, 1.6, 2.4, 3.5, 5, 7, 9.5, 13, 17.5, 23.5, 31, 41, 54, 72];
const RANK_XP = 0.8; // XP price relative to the Soul Coin price
const rankName = (r) => (r < 0 ? '-' : RANKS[r]);

// ---------------------------------------------------------------------------------------- scaling
// Floor scale: polynomial for the first hundred floors with a slow exponential underneath, so the
// climb feels steady through the ten strata and then turns into a wall in the Beyond.
const SCALE_LIN = 0.1, SCALE_POW = 1.75, SCALE_EXP = 1.012;
const BEYOND_EXP = 1.035; // past floor 100 every floor is 3.5% harder on top: the wall
function floorScale(f) {
  f = Math.max(1, f);
  return Math.pow(1 + SCALE_LIN * (f - 1), SCALE_POW) * Math.pow(SCALE_EXP, f - 1) * Math.pow(BEYOND_EXP, Math.max(0, f - 100));
}
const ENEMY_HP = 60;        // a template with hp 1 at floor 1
const ENEMY_HP_EXP = 0.92;  // enemy health grows a little slower than the floor scale
const ENEMY_DMG = 10;       // a move with pow 1 at floor 1, before defence
const ENEMY_DMG_EXP = 0.86; // enemy damage grows slower than enemy health
const ENEMY_DEF = (f) => 3 + 1.1 * Math.pow(f, 0.92);
const ENEMY_DFP = (f) => 1 + 0.55 * Math.pow(f, 0.92);
const ENEMY_ACC = (f) => 18 + 2.0 * f;
const ENEMY_AVD = (f) => 8 + 1.25 * f;
const REWARD_EXP = 0.97;    // rewards grow a little slower than the enemies
const REWARD_SC = 22, REWARD_XP = 20;
const KIND_REWARD = { regular: 1, elite: 2.6, boss: 6 };
const AFFIX_REWARD = 0.22;  // per affix

// ---------------------------------------------------------------------------------------- combat
const ENRAGE_ROUND = 20, ENRAGE_STEP = 0.15; // past round 20 a foe hits 15% harder every round (no stalemates)
const HIT_MIN = 15, HIT_MAX = 95;     // the original clamped accuracy to 15-95
const HIT_SPREAD = 30;                // accuracy vs avoidance swing, in points
const CRIT_CAP = 50;                  // the original's ssii.crl: crit chance never above 50%
const CRIT_MULT_CAP = 3.0;            // and never more than 3.0x
const PROT_CAP = 0.6;
const GUARD_CUT = 0.5;                // Guard halves damage taken until your next turn
const GUARD_MP = 0.1;                 // and recovers 10% MP
const MP_REGEN = 0.03;                // per turn, of max MP
const EXECUTE_LABELS = [              // the Luminous skill steps, as hit labels by share of the target's max HP
  [0, ''], [0.35, 'Fatal'], [0.45, 'Deadly'], [0.55, 'Godly'], [0.65, 'Overkill'],
  [0.78, 'Annihilation'], [0.9, 'Incineration'], [1.0, 'Final Hit'],
];
function hitLabel(dmg, maxHp, crit) {
  const s = dmg / Math.max(1, maxHp);
  let label = '';
  for (const [t, l] of EXECUTE_LABELS) if (s >= t) label = l;
  if (crit && !label) label = 'Critical';
  return label;
}

// ---------------------------------------------------------------------------------------- economy
const DEATH_SC_LOSS = 0.25;     // dying scatters a quarter of your unspent Soul Coins
const CHECKPOINT = 5;           // and sends you back to the last floor that was a multiple of 5, +1
const STREAK_BONUS = 0.12;      // each fight in a row without returning to the Sanctum: +12% rewards
const STREAK_MAX = 10;
const STREAK_RECOVER = 0.2;     // pressing on restores 20% HP and MP between fights
const PITY_BONUS = 0.5, PITY_FIGHTS = 3; // the original's loss calculator: after a death, +50% for 3 fights
const SELL_RATE = 0.4;
const TRAINING_REWARD = 0.6;    // training fights (an earlier floor, no streak) pay 60%

// ---------------------------------------------------------------------------------------- masteries
// The original's 14 masteries: infinite levels. Each rank adds a fixed amount (the original added
// 2 x rank, so later ranks were worth more and the costs had to explode to keep up).
const MASTERY_EXP = 1.8;
const MASTERY_STEP = 3;          // primary stat points per rank, to each of the two stats
const MASTERY_COST = (r, k) => Math.round(k * 18 * Math.pow(1 + r, MASTERY_EXP)); // XP to buy rank r+1
const MASTERIES = [
  { id: 'cbt', name: 'Combat', stats: ['str', 'dex'], k: 1.0, desc: 'Strength and Dexterity.' },
  { id: 'mgc', name: 'Magic', stats: ['int', 'wil'], k: 1.0, desc: 'Intelligence and Willpower.' },
  { id: 'fcs', name: 'Focus', stats: ['dex', 'wil'], k: 1.0, desc: 'Dexterity and Willpower.' },
  { id: 'spd', name: 'Speed', stats: ['dex', 'int'], k: 1.1, desc: 'Dexterity and Intelligence.' },
  { id: 'krm', name: 'Karma', stats: ['luk', 'int'], k: 1.1, desc: 'Luck and Intelligence.' },
  { id: 'res', name: 'Resistance', stats: ['wil', 'str'], k: 1.1, desc: 'Willpower and Strength.' },
  { id: 'itu', name: 'Intuition', stats: ['wil', 'luk'], k: 1.15, desc: 'Willpower and Luck.' },
  { id: 'syn', name: 'Synthesis', stats: ['int', 'str'], k: 1.2, desc: 'Intelligence and Strength.' },
  { id: 'exp', name: 'Experience', stats: ['luk', 'dex'], k: 1.2, desc: 'Luck and Dexterity.' },
  { id: 'reg', name: 'Regeneration', regen: 'hp', k: 1.5, desc: 'Restores health every turn.' },
  { id: 'rum', name: 'Rumination', regen: 'mp', k: 1.5, desc: 'Restores mana every turn.' },
  { id: 'hp', name: 'Health', pct: 'hp', step: 0.06, k: 0.9, desc: '+6% max health a rank.' },
  { id: 'mp', name: 'Mana', pct: 'mp', step: 0.06, k: 0.9, desc: '+6% max mana a rank.' },
  { id: 'df', name: 'Defence', flat: 'def', step: 3, k: 1.0, desc: '+3 defence a rank.' },
];
const MASTERY_BY_ID = Object.fromEntries(MASTERIES.map((m) => [m.id, m]));
// regeneration: % of max per turn, with diminishing returns (rank 5 ~ 2.3%, rank 20 ~ 4.4%)
const regenPct = (r) => (r <= 0 ? 0 : 0.06 * r / (r + 7));

// ---------------------------------------------------------------------------------------- stats
const PRIMARY = ['str', 'dex', 'int', 'luk', 'wil'];
const STAT_NAMES = { str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK', wil: 'WIL', def: 'DEF', dfp: 'DFP', bal: 'BAL',
  acc: 'ACC', avd: 'AVD', hp: 'HP', mp: 'MP', crit: 'Crit', critMult: 'Crit x', prot: 'Prot' };
const BASE_PRIMARY = 10;

// The character sheet: primary stats from base + masteries + class + items, scaled by the ability
// (the descendant's birthright) and then everything derived from them. `p` is the player save object.
function computeStats(p, extraBuffs) {
  const cls = CLASSES[p.cls];
  const ab = ABILITIES[p.ability];
  const awake = p.awakened && p.awakened[p.cls];
  const s = { str: 0, dex: 0, int: 0, luk: 0, wil: 0 };
  // base + masteries are the "trained" stats; the ability's percentages apply to these
  for (const k of PRIMARY) s[k] = BASE_PRIMARY + (p.trained[k] || 0);
  for (const k of PRIMARY) s[k] = Math.round(s[k] * (1 + ((ab.mods && ab.mods[k]) || 0)));
  for (const k of PRIMARY) s[k] += (cls.stats[k] || 0) + (awake ? (cls.awaken.stats[k] || 0) : 0);

  // everything else accumulates in a bag of modifiers
  const m = { hpFlat: 0, mpFlat: 0, hpPct: 0, mpPct: 0, def: 0, defPct: 0, dfp: 0, dfpPct: 0, bal: 0, acc: 0, avd: 0, avdPct: 0,
    crit: 0, critMult: 0, prot: 0, dmgPct: 0, physPct: 0, magPct: 0, bossPct: 0, healPct: 0, potionPct: 0,
    costPct: 0, scPct: 0, xpPct: 0, mpRegen: 0, hpRegen: 0, lifesteal: 0, statPct: 0, bleedOnHit: 0, statPctKeys: {} };
  const add = (k, v) => { m[k] = (m[k] || 0) + v; };
  const applyMods = (mods, scale = 1) => {
    if (!mods) return;
    for (const [k, v] of Object.entries(mods)) {
      if (PRIMARY.includes(k)) s[k] += v * scale;
      else if (k.endsWith('%') && PRIMARY.includes(k.slice(0, -1))) m.statPctKeys[k.slice(0, -1)] = (m.statPctKeys[k.slice(0, -1)] || 0) + v * scale;
      else add(k, v * scale);
    }
  };
  applyMods(ab.extra);
  applyMods(cls.mods);
  if (awake) applyMods(cls.awaken.mods);
  if (p.embodiment) applyMods(EMBODIMENTS[p.embodiment].mods);
  for (const it of equippedItems(p)) applyMods(itemMods(it, p.cls));
  for (const [id, r] of Object.entries(p.perks || {})) if (PERKS[id] && PERKS[id].mods) applyMods(PERKS[id].mods, r);
  // masteries that aren't primary stats
  const mr = (id) => (p.mastery && p.mastery[id]) || 0;
  m.hpPct += mr('hp') * MASTERY_BY_ID.hp.step;
  m.mpPct += mr('mp') * MASTERY_BY_ID.mp.step;
  m.def += mr('df') * MASTERY_BY_ID.df.step;
  m.hpRegen += regenPct(mr('reg'));
  m.mpRegen += regenPct(mr('rum'));
  // temporary buffs in battle (multipliers on primary stats and flat bonuses)
  if (extraBuffs) for (const b of extraBuffs) applyMods(b.mods);
  // percentage bonuses to primary stats (items like "Noble", buffs like Enlightenment)
  for (const k of PRIMARY) {
    const pctAll = m.statPct + (m.statPctKeys[k] || 0);
    s[k] = Math.max(1, Math.round(s[k] * (1 + pctAll)));
  }

  const d = { ...s };
  d.hpMax = Math.round((cls.hp * (awake ? cls.awaken.hpMult : 1) + s.wil * 3 + m.hpFlat) * (1 + m.hpPct));
  d.mpMax = Math.round((cls.mp * (awake ? cls.awaken.mpMult : 1) + s.int * 2 + m.mpFlat) * (1 + m.mpPct));
  d.def = Math.round((cls.def + s.str / 4 + m.def) * (1 + m.defPct));
  d.dfp = Math.round((cls.dfp + s.dex / 3 + m.dfp) * (1 + m.dfpPct));
  d.bal = Math.round(cls.bal + s.dex / 4 + s.wil / 8 + m.bal);
  d.acc = Math.round(s.dex + s.luk / 4 + m.acc);
  d.avd = Math.round((s.int / 2 + s.dex / 4 + m.avd) * (1 + m.avdPct));
  d.crit = cls.crit + s.luk / 6 + m.crit;                 // percent, before the skill's own crit
  d.critMult = Math.min(CRIT_MULT_CAP, 1.5 + s.luk / 300 + m.critMult);
  d.prot = Math.min(PROT_CAP, m.prot);
  d.dmgPct = m.dmgPct; d.physPct = m.physPct; d.magPct = m.magPct; d.bossPct = m.bossPct;
  d.healPct = m.healPct; d.potionPct = m.potionPct + (ab.potionPct || 0);
  d.costPct = clamp(m.costPct, -0.6, 1);
  d.scPct = m.scPct; d.xpPct = m.xpPct; d.lifesteal = m.lifesteal; d.bleedOnHit = m.bleedOnHit;
  d.mpRegen = MP_REGEN + (cls.mpRegen || 0) + m.mpRegen;
  d.hpRegen = m.hpRegen;
  return d;
}

// Damage power from the attacker's stats for a skill type
function powerOf(st, type) {
  if (type === 'mag') return 1 + st.int / 100;
  if (type === 'hyb') return 1 + (st.str + st.int) / 200;
  return 1 + st.str / 100;
}

// The original's damage formula: MAX = base * (100 + STR) / 100, MIN = MAX - MAX * 100 / (100 + BAL + skill BAL),
// then defence: dmg * 100 / (100 + DEF - DFP), less protection.
function rollDamage(max, bal, skillBal, r = rng) {
  const min = max * (bal + skillBal) / (100 + bal + skillBal);
  return r.range(min, max);
}
function mitigate(dmg, def, dfp, pierce, prot) {
  // pierce: the skill's own defence penetration (the original's SP), in percent of the target's DEF ignored / 2.5
  const effDef = Math.max(0, def * (1 - Math.min(0.9, pierce / 250)) - dfp);
  return dmg * 100 / (100 + effDef) * (1 - Math.min(PROT_CAP, prot || 0));
}
function hitChance(skillAcc, acc, avd) {
  if (skillAcc >= 100) return 100;
  return clamp(skillAcc + HIT_SPREAD * (acc - avd) / (acc + avd + 20), HIT_MIN, HIT_MAX);
}
