'use strict';
// Who you are. Three layers, all from the original's notes:
//   Ability     the birthright you pick at the start ("descendant of the Sniper"): the original's twelve
//               starting abilities, rebalanced to the same budget (two +25%, two -15%, one trait)
//   Class       Adventurer, then a Blessing bought in the Classes shop (the original's stubbed
//               p1.shop.classes): Eweca, Laceda, Falias, and the once admin-only Luminous
//   Awakening   the Class Modes Update's second rank (Silence / Fury / Valkyrie / Demigod)
//   Embodiment  The Gods' Concept's demigods (Morrighan, Macha, Neamhain, Cichol), after the Morrigan falls

// mods: % on trained primary stats. extra: anything computeStats understands. trait: shown text; flags read in battle.
const ABILITIES = {
  sniper: { name: 'Sniper', plus: ['+Dexterity', '+Strength'], minus: ['+MP cost', '-Defence'],
    mods: { dex: 0.25, str: 0.25 }, extra: { costPct: 0.12, defPct: -0.15, acc: 10 }, trait: 'Steady aim: +10 accuracy.' },
  thief: { name: 'Thief', plus: ['+Dexterity', '+Intelligence'], minus: ['-Strength', '-Defence'],
    mods: { dex: 0.25, int: 0.25, str: -0.15 }, extra: { defPct: -0.15, scPct: 0.25 }, trait: 'Light fingers: +25% Soul Coins.' },
  warrior: { name: 'Warrior', plus: ['+Defence', '+Defence pen.'], minus: ['-Luck', '-Intelligence'],
    mods: { luk: -0.15, int: -0.15 }, extra: { defPct: 0.25, dfpPct: 0.25, hpPct: 0.1 }, trait: 'Hardened: +10% max health.' },
  knight: { name: 'Knight', plus: ['+Willpower', '+Strength'], minus: ['-Dexterity', '-Intelligence'],
    mods: { wil: 0.25, str: 0.25, dex: -0.15, int: -0.15 }, extra: { prot: 0.05 }, trait: 'Oathbound: 5% protection.' },
  mage: { name: 'Mage', plus: ['+Intelligence', '-MP cost'], minus: ['-Defence', '-Strength'],
    mods: { int: 0.25, str: -0.15 }, extra: { costPct: -0.15, defPct: -0.15, magPct: 0.1 }, trait: 'Arcane study: +10% magic damage.' },
  alchemist: { name: 'Alchemist', plus: ['+Luck', '+Crit multiplier'], minus: ['-Defence', '-Intelligence'],
    mods: { luk: 0.25, int: -0.15 }, extra: { critMult: 0.3, defPct: -0.15 }, potionPct: 0.35, trait: 'Brewer: potions are 35% stronger.' },
  reaper: { name: 'Reaper', plus: ['+Defence pen.', '+Strength'], minus: ['-Crit rate', '-Intelligence'],
    mods: { str: 0.25, int: -0.15 }, extra: { dfpPct: 0.25, crit: -5 }, execute: 0.3, trait: 'Harvest: +30% damage to foes under 30% health.' },
  hero: { name: 'Hero', plus: ['+Willpower', '+Luck'], minus: ['-Intelligence', '+MP cost'],
    mods: { wil: 0.25, luk: 0.25, int: -0.15 }, extra: { costPct: 0.12, xpPct: 0.15 }, trait: 'Destined: +15% experience.' },
  ranger: { name: 'Ranger', plus: ['+Defence pen.', '+Dexterity'], minus: ['-Intelligence', '-Defence'],
    mods: { dex: 0.25, int: -0.15 }, extra: { dfpPct: 0.25, defPct: -0.15 }, firstCrit: true, trait: 'Ambush: your first hit of every fight is a critical.' },
  assassin: { name: 'Assassin', plus: ['+Crit rate', '+Luck'], minus: ['-Defence', '-Willpower'],
    mods: { luk: 0.25, wil: -0.15 }, extra: { crit: 6, defPct: -0.15 }, critBleed: true, trait: 'Opened veins: critical hits make them bleed.' },
  wizard: { name: 'Wizard', plus: ['+Intelligence', '-MP cost'], minus: ['-Dexterity', '-Willpower'],
    mods: { int: 0.25, dex: -0.15, wil: -0.15 }, extra: { costPct: -0.15 }, restBonus: 0.5, trait: 'Deep meditation: Rest restores 50% more.' },
  shadowhunter: { name: 'Shadowhunter', plus: ['+Willpower', '+Strength'], minus: ['-Crit rate', '+MP cost'],
    mods: { wil: 0.25, str: 0.25 }, extra: { crit: -5, costPct: 0.12, lifesteal: 0.06 }, trait: 'Night feeder: 6% lifesteal.' },
};
for (const [id, a] of Object.entries(ABILITIES)) a.id = id;
const ABILITY_KEYS = { sniper: 'S', thief: 'T', warrior: 'W', knight: 'K', mage: 'M', alchemist: 'A', reaper: 'R', hero: 'H',
  ranger: 'N', assassin: 'I', wizard: 'Z', shadowhunter: 'D' }; // the original's selection letters

const CLASSES = {
  adventurer: {
    name: 'Adventurer', role: 'Normal', art: 'pl_adventurer',
    blurb: 'A normal adventurer, with magic and melee skills, you are a force to be reckoned with.',
    hp: 100, mp: 60, def: 4, dfp: 0, bal: 40, crit: 5, stats: { str: 5, dex: 5, int: 5, luk: 5, wil: 5 },
    skills: ['att', 'hea', 'res', 'fus', 'mga', 'mgc', 'sok', 'hdr', 'lig', 'enl', 'dbl'],
  },
  eweca: {
    name: 'Eweca', role: 'Energy class', art: 'pl_eweca', unlockFloor: 11, price: { sc: 900, xp: 700 },
    blurb: 'Blessed with the energy of Eweca, the pale moon. Your attacks cost far less than the damage they do: you keep going, and keep throwing huge attacks without stopping.',
    hp: 120, mp: 150, def: 4, dfp: 8, bal: 70, crit: 5, stats: { int: 14, wil: 6, dex: 4 }, mods: { costPct: -0.25 }, mpRegen: 0.02,
    skills: ['ice', 'fir', 'esc', 'cla', 'hly'],
    awaken: { title: 'Silence', ult: 'sil', hpMult: 1.3, mpMult: 1.4, stats: { int: 20, wil: 10 }, mods: { magPct: 0.15 } },
  },
  laceda: {
    name: 'Laceda', role: 'Attack class', art: 'pl_laceda', unlockFloor: 11, price: { sc: 900, xp: 700 },
    blurb: 'Given the strength of Laceda, the red moon. Your damage barely varies: constant, huge damage. Your mana is small and slow to return, so every attack must count.',
    hp: 170, mp: 50, def: 8, dfp: 4, bal: 95, crit: 5, stats: { str: 14, dex: 6, wil: 4 }, mods: { physPct: 0.1 }, mpRegen: -0.01,
    skills: ['cer', 'lsc', 'lsp', 'shm', 'lac'],
    awaken: { title: 'Fury', ult: 'fur', hpMult: 1.35, mpMult: 1.3, stats: { str: 20, dex: 10 }, mods: { physPct: 0.15 } },
  },
  falias: {
    name: 'Falias', role: 'Defence class', art: 'pl_falias', unlockFloor: 11, price: { sc: 900, xp: 700 },
    blurb: 'Bestowed with the force of Falias. Huge defence, huge health, low attack: the ultimate survivor. Not just anyone can beat a Falias.',
    hp: 230, mp: 80, def: 18, dfp: 4, bal: 50, crit: 3, stats: { str: 8, wil: 14 }, mods: { prot: 0.08 },
    skills: ['smh', 'fhl', 'fsh', 'fbr', 'fsl'],
    awaken: { title: 'Valkyrie', ult: 'gods', hpMult: 1.45, mpMult: 1.25, stats: { wil: 20, str: 10 }, mods: { prot: 0.06 } },
  },
  luminous: {
    name: 'Luminous', role: 'Demigod class', art: 'pl_luminous', unlockFloor: 41, price: { sc: 40000, xp: 32000 },
    blurb: 'Through the hidden power of the goddesses Morrighan and Neamhain, nothing is impossible. The strongest attacks of any class and the best defence penetration, on low health and wild balance.',
    hp: 110, mp: 140, def: 4, dfp: 24, bal: 20, crit: 15, stats: { str: 8, dex: 8, int: 8, luk: 8, wil: 8 }, mods: { critMult: 0.3 },
    skills: ['wow', 'dkl', 'wor', 'wit', 'arc'],
    awaken: { title: 'Demigod', ult: 'wol', hpMult: 1.4, mpMult: 1.4, stats: { str: 12, dex: 12, int: 12, luk: 12, wil: 12 }, mods: { dmgPct: 0.15 } },
  },
};
for (const [id, c] of Object.entries(CLASSES)) c.id = id;
const AWAKEN_FLOOR = 61;
const AWAKEN_PRICE = { sc: 90000, xp: 70000 };

// The Gods' Concept: "Wolfe, Alchemist of the Luminous, Embodiment of Morrighan."
const EMBODIMENT_FLOOR = 71;
const EMBODIMENT_PRICE = { sc: 120000, xp: 0 };
const EMBODIMENTS = {
  morrighan: { name: 'Morrighan', aspect: 'damage', desc: '+25% damage with everything.', mods: { dmgPct: 0.25 } },
  macha: { name: 'Macha', aspect: 'health', desc: '+30% max health.', mods: { hpPct: 0.3 } },
  neamhain: { name: 'Neamhain', aspect: 'mana', desc: '+40% max mana, skills cost 15% less.', mods: { mpPct: 0.4, costPct: -0.15 } },
  cichol: { name: 'Cichol', aspect: 'defence', desc: '+30% defence and 8% protection.', mods: { defPct: 0.3, prot: 0.08 } },
};

// Perks, from Perks SS2 and the Skills and Perks Update. One is offered (pick 1 of 3) after every
// boss; each goes to rank III. `mods` scale with rank; the rest is read by the battle code.
const PERKS = {
  adrenaline: { name: 'Adrenaline', desc: 'Below 25% health: +15% crit chance a rank.', max: 3 },
  potential: { name: 'Potential', desc: '12% a rank that a skill costs half its mana.', max: 3 },
  bloodthirst: { name: 'Bloodthirst', desc: '+4% lifesteal a rank.', max: 3, mods: { lifesteal: 0.04 } },
  deadeye: { name: 'Deadeye', desc: '8% a rank that an attack cannot miss and hits 25% harder.', max: 3 },
  sixthsense: { name: 'Sixth Sense', desc: '6% a rank to slip any attack completely.', max: 3 },
  concentration: { name: 'Concentration', desc: '+3% damage a rank for every turn of a fight (up to 10 turns).', max: 3 },
  gifted: { name: 'Gifted', desc: '5% a rank that a skill costs nothing and has no cooldown.', max: 3 },
  hunter: { name: 'Hunter', desc: 'Each hit in a row: +4% damage a rank (up to 10), lost on a miss.', max: 3 },
  zen: { name: 'Zen', desc: '+1.5% mana a turn a rank.', max: 3, mods: { mpRegen: 0.015 } },
  healthy: { name: 'Healthy', desc: '+1% health a turn a rank.', max: 3, mods: { hpRegen: 0.01 } },
  mythical: { name: 'Mythical', desc: '+10% magic damage a rank.', max: 3, mods: { magPct: 0.1 } },
  powerful: { name: 'Powerful', desc: '+10% physical damage a rank.', max: 3, mods: { physPct: 0.1 } },
  final: { name: 'Final', desc: '8% a rank to strike a second time at half power.', max: 3 },
  lucky: { name: 'Lucky', desc: '+10% Soul Coins and experience a rank.', max: 3, mods: { scPct: 0.1, xpPct: 0.1 } },
};
for (const [id, p] of Object.entries(PERKS)) p.id = id;
const perkRank = (p, id) => (p.perks && p.perks[id]) || 0;

// The title, the original's way: "Alph, Sniper of the Eweca" / "the descendant of the Sniper"
function titleOf(p) {
  const ab = ABILITIES[p.ability].name;
  const cls = CLASSES[p.cls];
  let t = cls.id === 'adventurer' ? `${p.name}, descendant of the ${ab}` : `${p.name}, ${ab} of the ${cls.name}`;
  if (p.awakened && p.awakened[p.cls]) t = `${p.name} "${cls.awaken.title}", ${ab} of the ${cls.name}`;
  if (p.embodiment) t += `, Embodiment of ${EMBODIMENTS[p.embodiment].name}`;
  return t;
}
