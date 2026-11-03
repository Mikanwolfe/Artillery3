'use strict';
// The arena. The original was PVP (two players, '+' and '-'); this is PVE: an endless climb through
// ten strata of foes that grow more arcane and mythical, a boss at every tenth floor, then the Beyond,
// where the strata come round again Ascended, without end.
//
// Template numbers are multipliers on the floor's baseline (rules.js): hp, dmg, def, avd, acc.
// Moves (picked by weight; `cd` turns between uses):
//   hit / multi (hits) / drain (lifesteal) / mpburn (burns a share of your mana)
//   charge     spends a turn winding up (shown as the intent), then lands `then` next turn
//   buff       self buff {mods, turns}; shield (pow = share of max HP); heal (pow = share of max HP)
//   debuff     statuses on you without damage; dispel strips your buffs
// eff: statuses a move can apply: burn, poison (stacks), bleed, stun, silence, weaken, vuln, blind, chill, doom

const hit = (name, pow, o = {}) => ({ kind: 'hit', name, pow, w: 3, ...o });
const multi = (name, hits, pow, o = {}) => ({ kind: 'multi', name, hits, pow, w: 2, ...o });
const charge = (name, then, o = {}) => ({ kind: 'charge', name, then: { kind: 'hit', ...then }, w: 1.2, cd: 3, ...o });
const buff = (name, mods, turns, o = {}) => ({ kind: 'buff', name, mods, turns, w: 1, cd: 4, ...o });
const shield = (name, pow, o = {}) => ({ kind: 'shield', name, pow, w: 1, cd: 4, ...o });
const heal = (name, pow, o = {}) => ({ kind: 'heal', name, pow, w: 1.5, cd: 3, hpBelow: 0.6, ...o });
const debuff = (name, eff, o = {}) => ({ kind: 'debuff', name, eff, w: 1, cd: 3, ...o });
const E = (id, chance = 1, turns = 2, more = {}) => ({ id, chance, turns, ...more });

const STRATA = [
  { n: 1, name: 'The Outskirts', color: '#c8b48a', regulars: ['cutpurse', 'wolf', 'brute', 'spearman', 'hedgewitch'], boss: 'grell',
    intro: 'The road to the arena runs through the Outskirts. Thieves, wolves and deserters: the stream has not touched them yet.' },
  { n: 2, name: 'The Barrow', color: '#a8c79a', regulars: ['skeleton', 'ghoul', 'wisp', 'cultist', 'wight'], boss: 'barrowking',
    intro: 'Under the hill the dead keep their own court. The soulstream runs thin and cold here, and something drinks from it.' },
  { n: 3, name: 'The Arcane Spire', color: '#8fa8ff', regulars: ['armour', 'golem', 'manawraith', 'battlemage', 'mimic'], boss: 'archon',
    intro: 'A tower built to bottle the stream. Its makers are gone; their engines still guard the stair.' },
  { n: 4, name: 'The Fomorian Shore', color: '#6fd0c0', regulars: ['kelpie', 'redcap', 'dullahan', 'fomorian', 'banshee'], boss: 'balor',
    intro: 'Grey water, black rock. The old sea-giants came ashore here, and the fae of the dark came with them.' },
  { n: 5, name: 'The Wild Mythos', color: '#ff8a5c', regulars: ['wyvern', 'manticore', 'basilisk', 'griffin', 'chimera'], boss: 'hydra',
    intro: 'Past the shore the stories stop being stories. Every beast here was once only a word.' },
  { n: 6, name: 'The Elemental Planes', color: '#ffc04d', regulars: ['ifrit', 'undine', 'thunderbird', 'frostgiant', 'sanddjinn'], boss: 'phoenix',
    intro: 'The stream splits into fire, water, storm, ice and sand. Each current has a keeper.' },
  { n: 7, name: 'The Otherworld', color: '#b6e3a0', regulars: ['sidhe', 'cusith', 'nuckelavee', 'leanan', 'wildhunt'], boss: 'morrigan',
    intro: 'Tir na nOg, the land under the wave. Time runs wrong here, and the courts of the Sidhe do not forgive guests.' },
  { n: 8, name: 'The Celestial Host', color: '#fff1b8', regulars: ['cherub', 'ophanim', 'seraph', 'dominion', 'grigori'], boss: 'twinmoons',
    intro: 'Above the Otherworld the stream turns to light. Be not afraid, they say, and then they open their eyes.' },
  { n: 9, name: 'The Abyss', color: '#c38bff', regulars: ['maw', 'larva', 'choir', 'nullknight', 'hollow'], boss: 'leviathan',
    intro: 'Below everything, where the stream drains away. The things here were never named, because no one came back to name them.' },
  { n: 10, name: 'The Primordial Throne', color: '#ffd6f0', regulars: ['ashtitan', 'chaosserpent', 'wyrm', 'warden', 'timewraith'], boss: 'luminous',
    intro: 'The source. The first powers sit here, and at the top of the stair, the Final Light.' },
];

const ENEMIES = {
  // ============================================================ 1 The Outskirts
  cutpurse: { hp: 0.8, dmg: 0.9, def: 0.6, avd: 1.3, acc: 1.1, moves: [
    hit('Stab', 1.0), hit('Pickpocket', 0.6, { steal: 0.04, w: 1.5, cd: 2 }), debuff('Dirt in the Eyes', [E('blind', 1, 2)]) ] },
  wolf: { hp: 0.9, dmg: 1.0, avd: 1.15, moves: [
    hit('Bite', 1.0, { eff: [E('bleed', 0.3, 2, { pow: 0.08 })] }), multi('Lunge', 2, 0.6), buff('Howl', { dmgPct: 0.3 }, 3, { cd: 5 }) ] },
  brute: { hp: 1.4, dmg: 1.15, def: 1.3, avd: 0.7, acc: 0.85, moves: [
    hit('Club', 1.1), charge('Wind Up', { name: 'Crushing Blow', pow: 2.6, eff: [E('stun', 0.4, 1)] }), debuff('Bellow', [E('weaken', 1, 2)], { cd: 4 }) ] },
  spearman: { hp: 1.1, dmg: 1.0, def: 1.2, moves: [
    hit('Thrust', 1.0, { pierce: 40 }), buff('Shield Wall', { defPct: 0.6 }, 2, { cd: 3 }), hit('Impale', 1.6, { cd: 2, w: 1.5, eff: [E('bleed', 1, 2, { pow: 0.08 })] }) ] },
  hedgewitch: { hp: 0.9, dmg: 0.9, type: 'mag', moves: [
    hit('Hex Bolt', 1.0), debuff('Withering Curse', [E('weaken', 1, 2), E('vuln', 1, 2)]), heal('Bitter Brew', 0.2), multi('Crow Peck', 3, 0.35) ] },
  grell: { boss: true, hp: 2.4, dmg: 1.05, def: 1.3, acc: 1.2, moves: [
    multi('Cutlass Flurry', 3, 0.55), hit('Flintlock', 1.6, { acc: 20, pierce: 60, cd: 2 }), buff('Rally the Red Hand', { dmgPct: 0.4 }, 3, { cd: 5 }),
    charge('Light the Powder Keg', { name: 'Powder Keg', pow: 3.0, eff: [E('burn', 1, 3, { pow: 0.06 })] }, { cd: 4 }) ],
    phases: [{ below: 0.5, msg: 'Grell draws his second pistol.', mods: { dmgPct: 0.2 }, add: [hit('Brace of Pistols', 0.9, { kind: 'multi', hits: 2, acc: 20, pierce: 60, w: 2 })] }] },

  // ============================================================ 2 The Barrow
  skeleton: { hp: 1.0, def: 1.25, moves: [
    hit('Rusty Slash', 1.0, { eff: [E('bleed', 0.2, 2, { pow: 0.08 })] }), hit('Shield Bash', 0.8, { cd: 3, eff: [E('stun', 0.25, 1)] }), buff('Rattle', { defPct: 0.4 }, 2) ] },
  ghoul: { hp: 1.1, dmg: 1.1, moves: [
    hit('Rend', 1.0, { eff: [E('poison', 0.5, 3, { pow: 0.04 })] }), hit('Feast', 1.2, { kind: 'drain', lifesteal: 0.6, cd: 2 }), multi('Frenzy', 3, 0.4) ] },
  wisp: { hp: 0.7, avd: 1.6, type: 'mag', moves: [
    hit('Soul Siphon', 0.8, { kind: 'mpburn', mpBurn: 0.15 }), hit('Ghostlight', 1.2), buff('Flicker', { avdPct: 0.5 }, 2) ] },
  cultist: { hp: 0.9, type: 'mag', moves: [
    hit('Dark Bolt', 1.0), buff('Blood Pact', { dmgPct: 0.5 }, 3, { selfCost: 0.1 }), debuff('Grave Curse', [E('vuln', 1, 3), E('poison', 1, 3, { pow: 0.04 })], { cd: 4 }) ] },
  wight: { hp: 1.3, dmg: 1.1, def: 1.3, moves: [
    hit('Grave Blade', 1.1), hit('Life Drain', 0.9, { kind: 'drain', lifesteal: 1.0, cd: 2 }), debuff('Dread', [E('weaken', 1, 2), E('chill', 1, 2)]) ] },
  barrowking: { boss: true, hp: 3.0, dmg: 1.15, def: 1.4, type: 'mag', moves: [
    hit('Sceptre of Bones', 1.2), hit('Soul Rend', 1.0, { kind: 'mpburn', mpBurn: 0.25, cd: 2 }), debuff('Grave Chill', [E('chill', 1, 3), E('weaken', 1, 3)], { cd: 4 }),
    shield('Raise the Barrow', 0.25), charge("Death's Decree", { name: "Death's Decree", pow: 3.2 }, { cd: 4 }) ],
    passive: { revive: 0.3, reviveMsg: 'The Barrow King rises again.' } },

  // ============================================================ 3 The Arcane Spire
  armour: { hp: 1.2, def: 2.0, avd: 0.6, moves: [
    hit('Halberd Sweep', 1.1, { pierce: 30 }), buff('Hollow Guard', { prot: 0.4 }, 2, { cd: 3 }), heal('Reforge', 0.15, { cd: 4 }) ] },
  golem: { hp: 1.6, def: 1.6, avd: 0.5, acc: 0.8, dmg: 1.2, moves: [
    hit('Stone Fist', 1.1), charge('Runes Ignite', { name: 'Rune Slam', pow: 3.0, eff: [E('stun', 0.5, 1)] }), shield('Runeskin', 0.2) ] },
  manawraith: { hp: 0.9, avd: 1.4, type: 'mag', moves: [
    hit('Mana Burn', 1.0, { kind: 'mpburn', mpBurn: 0.25 }), debuff('Null Field', [E('silence', 1, 2)], { cd: 4 }), multi('Arcane Lash', 2, 0.65) ] },
  battlemage: { hp: 1.0, dmg: 1.15, type: 'mag', moves: [
    hit('Fireball', 1.2, { eff: [E('burn', 0.5, 3, { pow: 0.06 })] }), hit('Frost Nova', 0.8, { eff: [E('chill', 1, 2)] }), shield('Arcane Barrier', 0.25),
    multi('Chain Lightning', 3, 0.45, { eff: [E('stun', 0.1, 1)] }) ] },
  mimic: { hp: 1.1, def: 1.4, dmg: 1.2, moves: [
    hit('Chomp', 1.3, { eff: [E('bleed', 0.6, 2, { pow: 0.08 })] }), multi('Gold Spray', 4, 0.3), hit('Lid Slam', 1.0, { cd: 3, eff: [E('stun', 0.3, 1)] }) ],
    passive: { gilded: 1.5 } },
  archon: { boss: true, hp: 2.6, dmg: 1.15, avd: 1.2, type: 'mag', moves: [shield('Arcane Ward', 0.2)],
    passive: { cycle: { every: 2, sets: [
      { name: 'Fire', color: '#ff7a4d', moves: [hit('Inferno', 1.3, { eff: [E('burn', 1, 3, { pow: 0.07 })] })] },
      { name: 'Frost', color: '#7fe3ff', moves: [hit('Glacial Lance', 1.2, { eff: [E('chill', 1, 2), E('stun', 0.1, 1)] })] },
      { name: 'Storm', color: '#ffe066', moves: [multi('Arc Storm', 3, 0.5, { eff: [E('stun', 0.1, 1)] })] },
    ] } },
    phases: [{ below: 0.5, msg: 'The Archon unseals the Spire.', add: [charge('Rune Cataclysm', { name: 'Rune Cataclysm', pow: 3.5 }, { cd: 4, w: 2 })] }] },

  // ============================================================ 4 The Fomorian Shore
  kelpie: { hp: 1.1, dmg: 1.1, moves: [
    hit('Trample', 1.1), hit('Drag Under', 0.9, { cd: 3, eff: [E('stun', 0.35, 1)] }), heal('Tidal Mane', 0.15) ] },
  redcap: { hp: 0.9, dmg: 1.25, avd: 1.2, moves: [
    hit('Pike Jab', 1.0, { eff: [E('bleed', 0.4, 2, { pow: 0.08 })] }), hit('Iron Stomp', 1.2), buff('Dip the Cap', { dmgPct: 0.6 }, 9, { once: true, hpBelow: 0.5, w: 9 }) ],
    passive: { lifesteal: 0.15 } },
  dullahan: { hp: 1.3, dmg: 1.2, moves: [
    hit('Spine Whip', 1.0, { eff: [E('bleed', 0.5, 2, { pow: 0.08 })] }), debuff('Speak Your Name', [E('doom', 1, 3, { pow: 0.45 })], { cd: 7, w: 1.5 }), multi('Gallop', 2, 0.7) ] },
  fomorian: { hp: 1.6, def: 1.3, dmg: 1.3, avd: 0.7, moves: [
    hit('Anchor Smash', 1.2), charge('Heave the Anchor', { name: 'Anchor Sweep', pow: 2.8 }), debuff('Brine Roar', [E('weaken', 1, 2)]) ] },
  banshee: { hp: 0.9, avd: 1.4, type: 'mag', moves: [
    hit('Keening Wail', 1.0, { eff: [E('silence', 0.3, 1)] }), debuff('Sorrow', [E('weaken', 1, 2), E('vuln', 1, 2)]), charge('Draws Breath', { name: 'Death Shriek', pow: 2.8 }) ] },
  balor: { boss: true, hp: 4.0, dmg: 1.35, def: 1.5, avd: 0.6, moves: [
    hit("Giant's Fist", 1.2), multi('Fomorian Rage', 2, 0.8), charge('The Eye Opens', { name: 'Baleful Gaze', pow: 3.2, type: 'mag', pierce: 200 }, { wind: 2, cd: 5, w: 2 }) ],
    phases: [{ below: 0.5, msg: "The hooks tear free: Balor's eye will not close.", replace: { 'The Eye Opens': { wind: 1, cd: 3 } } }] },

  // ============================================================ 5 The Wild Mythos
  wyvern: { hp: 1.2, dmg: 1.2, avd: 1.1, moves: [
    hit('Tail Barb', 1.0, { eff: [E('poison', 1, 3, { pow: 0.04, stacks: 2 })] }), hit('Wing Buffet', 0.8, { eff: [E('blind', 0.6, 2)] }), charge('Climbs High', { name: 'Dive', pow: 2.6 }) ] },
  manticore: { hp: 1.3, dmg: 1.25, moves: [
    multi('Spike Volley', 4, 0.35, { eff: [E('poison', 0.2, 3, { pow: 0.04 })] }), hit('Maul', 1.2, { eff: [E('bleed', 0.5, 2, { pow: 0.08 })] }), debuff('Roar', [E('weaken', 1, 2)]) ] },
  basilisk: { hp: 1.3, def: 1.4, dmg: 1.1, moves: [
    hit('Venom Fang', 1.0, { eff: [E('poison', 1, 3, { pow: 0.04, stacks: 2 })] }), debuff('Petrifying Gaze', [E('stun', 0.5, 1), E('chill', 1, 2)], { cd: 4 }), shield('Coil', 0.2) ] },
  griffin: { hp: 1.1, avd: 1.3, dmg: 1.2, acc: 1.2, moves: [
    multi('Talon Rake', 2, 0.7, { eff: [E('bleed', 0.3, 2, { pow: 0.08 })] }), charge('Soars', { name: 'Skystrike', pow: 2.5 }), buff('Gale Wings', { avdPct: 0.5 }, 2) ] },
  chimera: { hp: 1.4, dmg: 1.25, moves: [],
    passive: { cycle: { every: 1, sets: [
      { name: 'Lion', moves: [hit('Lion Maul', 1.2)] },
      { name: 'Goat', moves: [hit('Goat Fire', 1.0, { type: 'mag', eff: [E('burn', 1, 3, { pow: 0.06 })] })] },
      { name: 'Serpent', moves: [hit('Serpent Bite', 0.8, { eff: [E('poison', 1, 3, { pow: 0.04, stacks: 2 })] })] },
    ] } } },
  hydra: { boss: true, hp: 4.2, dmg: 1.0, def: 1.3, moves: [
    multi('Many Jaws', 3, 0.42, { heads: true, w: 3 }), debuff('Venom Spray', [E('poison', 1, 4, { pow: 0.04, stacks: 3 })], { cd: 4 }) ],
    passive: { heads: { start: 3, max: 9, every: 3 } } },

  // ============================================================ 6 The Elemental Planes
  ifrit: { hp: 1.2, dmg: 1.3, type: 'mag', moves: [
    hit('Flame Lash', 1.0, { eff: [E('burn', 0.6, 3, { pow: 0.06 })] }), charge('Stokes the Fire', { name: 'Inferno', pow: 2.8, eff: [E('burn', 1, 3, { pow: 0.06 })] }), buff('Smoke Form', { avdPct: 0.6 }, 2) ] },
  undine: { hp: 1.1, avd: 1.2, type: 'mag', moves: [
    hit('Riptide', 1.0), debuff('Drown', [E('stun', 0.4, 1), E('silence', 1, 2)], { cd: 4 }), heal('Tidal Mend', 0.25) ] },
  thunderbird: { hp: 1.1, acc: 1.2, dmg: 1.3, type: 'mag', moves: [
    hit('Thunderclap', 1.1, { eff: [E('stun', 0.2, 1)] }), multi('Storm Wings', 3, 0.45), buff('Static Charge', { dmgPct: 0.5 }, 2) ] },
  frostgiant: { hp: 1.7, def: 1.5, dmg: 1.35, avd: 0.6, moves: [
    hit('Ice Axe', 1.2, { eff: [E('chill', 0.6, 2)] }), charge('Raises the Glacier', { name: 'Avalanche', pow: 3.0, eff: [E('stun', 0.3, 1)] }), buff('Rime Armour', { defPct: 0.6 }, 3) ] },
  sanddjinn: { hp: 1.2, avd: 1.4, type: 'mag', moves: [
    hit('Sandblast', 0.9, { eff: [E('blind', 0.5, 2)] }), multi('Scimitar Whirl', 3, 0.45, { type: 'phys' }), shield('Dune Shroud', 0.2) ] },
  phoenix: { boss: true, hp: 2.7, dmg: 1.15, type: 'mag', moves: [
    hit('Searing Talons', 1.1, { eff: [E('burn', 1, 3, { pow: 0.06 })] }), multi('Firestorm Wings', 3, 0.5, { eff: [E('burn', 0.4, 3, { pow: 0.06 })] }),
    charge('Gathers the Sun', { name: 'Solar Flare', pow: 3.2, eff: [E('blind', 1, 2)] }, { cd: 4 }) ],
    passive: { rebirth: 0.4, rebirthMsg: 'The Phoenix rises from the ashes.' } },

  // ============================================================ 7 The Otherworld
  sidhe: { hp: 1.1, avd: 1.2, acc: 1.2, dmg: 1.2, moves: [
    hit('Riposte', 1.0), multi('Flurry', 3, 0.45), debuff('Glamour', [E('blind', 1, 2)]) ] },
  cusith: { hp: 1.3, dmg: 1.2, moves: [
    hit('Spectral Bite', 1.1, { eff: [E('bleed', 0.5, 2, { pow: 0.08 })] }), debuff('Three Barks', [E('weaken', 1, 2), E('vuln', 1, 2)]), charge('Lowers Its Head', { name: 'Pounce', pow: 2.4, eff: [E('stun', 0.3, 1)] }) ] },
  nuckelavee: { hp: 1.4, dmg: 1.2, moves: [
    debuff('Rotting Breath', [E('poison', 1, 3, { pow: 0.04, stacks: 3 }), E('weaken', 1, 2)]), multi('Flaying Arms', 2, 0.8, { eff: [E('bleed', 0.5, 2, { pow: 0.08 })] }), hit('Plague Gallop', 1.4) ] },
  leanan: { hp: 1.0, avd: 1.2, type: 'mag', moves: [
    hit('Siren Song', 1.0, { kind: 'drain', lifesteal: 0.8 }), hit("Muse's Price", 0.7, { kind: 'mpburn', mpBurn: 0.3, cd: 2 }), debuff('Enthrall', [E('stun', 0.3, 1), E('silence', 1, 2)], { cd: 4 }) ] },
  wildhunt: { hp: 1.3, dmg: 1.25, acc: 1.1, moves: [
    hit('Hunting Spear', 1.2, { pierce: 60 }), buff('Horn of the Hunt', { dmgPct: 0.4 }, 3), multi('The Chase', 3, 0.5) ] },
  morrigan: { boss: true, hp: 3.3, dmg: 1.2, type: 'hyb', moves: [
    debuff('Crow Curse', [E('weaken', 1, 3), E('vuln', 1, 3)], { cd: 4 }), hit('Fate-Spear', 1.2), multi('Carrion', 4, 0.3) ],
    phases: [
      { below: 0.66, msg: 'Badb falls silent. Macha takes up the spear.', name: 'Macha', set: [
        hit('War Spear', 1.3, { pierce: 80 }), buff('Battle Fury', { dmgPct: 0.3 }, 3), charge("Sovereign's Due", { name: "Sovereign's Due", pow: 2.8 }) ] },
      { below: 0.33, msg: 'Macha yields to Nemain, and Nemain is frenzy.', name: 'Nemain', set: [
        multi('Frenzy', 5, 0.4, { lifesteal: 0.3, w: 3 }), debuff('Madness', [E('blind', 1, 2), E('weaken', 1, 2)]) ] },
    ] },

  // ============================================================ 8 The Celestial Host
  cherub: { hp: 1.3, dmg: 1.3, moves: [
    multi('Four Faces', 4, 0.4), hit('Wheel of Fire', 1.0, { type: 'mag', eff: [E('burn', 1, 3, { pow: 0.06 })] }), buff('Guard the Gate', { prot: 0.4 }, 2) ] },
  ophanim: { hp: 1.1, avd: 1.5, type: 'mag', moves: [
    debuff('Thousand Eyes', [E('blind', 1, 3)]), multi('Turning Wheels', 3, 0.5), hit('Gaze of Heaven', 1.3) ] },
  seraph: { hp: 1.2, dmg: 1.3, type: 'mag', moves: [
    hit('The Burning One', 1.2, { eff: [E('burn', 0.8, 3, { pow: 0.06 })] }), buff('Six Wings', { avdPct: 0.4, defPct: 0.4 }, 2), charge('Seraphic Hymn', { name: 'Seraphic Hymn', pow: 3.0, eff: [E('burn', 1, 3, { pow: 0.06 })] }) ] },
  dominion: { hp: 1.5, def: 1.6, dmg: 1.3, moves: [
    hit('Judgement', 1.2), debuff('Weigh the Soul', [E('vuln', 1, 3)]), hit('Sword of Order', 1.6, { pierce: 100, cd: 2 }) ] },
  grigori: { hp: 1.3, dmg: 1.3, moves: [
    debuff('Forbidden Knowledge', [E('silence', 1, 2), E('weaken', 1, 2)], { cd: 4 }), multi('Broken Chains', 2, 0.9), heal('Lament', 0.2) ] },
  twinmoons: { boss: true, hp: 5.0, dmg: 1.4, avd: 1.2, type: 'hyb', moves: [],
    passive: { cycle: { every: 2, sets: [
      { name: 'Eweca, the Pale Moon', color: '#cfe8ff', moves: [hit('Moonlight Lance', 1.3, { type: 'mag' }), heal('Tidal Calm', 0.06, { hpBelow: 0.9, cd: 3 }), debuff('Lunar Frost', [E('chill', 1, 2), E('silence', 0.5, 1)])] },
      { name: 'Laceda, the Red Moon', color: '#ff5a5a', moves: [hit('Crimson Cero', 1.4, { type: 'phys' }), multi('Lunar Scythe', 2, 0.9, { type: 'phys' }), charge('Blood Moon Rising', { name: 'Blood Moon', pow: 3.2, type: 'phys' })] },
    ] } } },

  // ============================================================ 9 The Abyss
  maw: { hp: 1.4, dmg: 1.4, moves: [
    hit('Devour', 1.3, { kind: 'drain', lifesteal: 0.5 }), hit('Tentacle Grasp', 0.8, { eff: [E('stun', 0.3, 1)], cd: 3 }), multi('Gnash', 3, 0.5, { eff: [E('bleed', 0.3, 2, { pow: 0.08 })] }) ] },
  larva: { hp: 1.6, def: 1.3, dmg: 1.2, moves: [
    hit('Mandibles', 1.1), hit('Star-Eating', 0.6, { kind: 'mpburn', mpBurn: 0.25 }), heal('Molt', 0.25, { cd: 4 }) ] },
  choir: { hp: 1.2, dmg: 1.35, type: 'mag', moves: [
    multi('Discordant Hymn', 3, 0.5, { eff: [E('silence', 0.2, 1)] }), debuff('Hollow Note', [E('weaken', 1, 2), E('vuln', 1, 2)]), charge('Draws a Breath', { name: 'Crescendo', pow: 3.0 }) ] },
  nullknight: { hp: 1.5, def: 1.5, dmg: 1.4, moves: [
    hit('Rift Blade', 1.2, { pierce: 120 }), debuff('Nullify', [E('silence', 1, 1)], { dispel: true, cd: 4 }), buff('Void Step', { avdPct: 0.8 }, 1, { cd: 3 }) ] },
  hollow: { hp: 1.3, dmg: 1.35, type: 'mag', moves: [
    hit('Hollow Light', 1.2, { eff: [E('blind', 0.5, 2)] }), hit('Lost Grace', 1.0, { kind: 'drain', lifesteal: 0.7 }), charge('Broken Halo', { name: 'Fall From Grace', pow: 2.8 }) ] },
  leviathan: { boss: true, hp: 4.4, def: 1.7, dmg: 1.45, moves: [
    charge('The Deep Rises', { name: 'Tidal Crush', pow: 3.6 }, { cd: 3, w: 1.6 }), debuff('Drown', [E('stun', 1, 1), E('silence', 1, 2)], { cd: 5 }),
    hit('Abyssal Maw', 1.3, { kind: 'drain', lifesteal: 0.5 }), shield('Coils', 0.25) ] },

  // ============================================================ 10 The Primordial Throne
  ashtitan: { hp: 1.8, def: 1.6, dmg: 1.45, avd: 0.7, moves: [
    hit('Magma Fist', 1.2, { eff: [E('burn', 0.6, 3, { pow: 0.06 })] }), charge('The Mountain Wakes', { name: 'Eruption', pow: 3.2, eff: [E('burn', 1, 3, { pow: 0.06 })] }), debuff('Ash Cloud', [E('blind', 1, 2)]) ] },
  chaosserpent: { hp: 1.5, dmg: 1.4, type: 'hyb', moves: [
    hit('Chaos Bite', 1.2, { randomEff: true }), debuff('Unmaking', [E('vuln', 1, 3)], { dispel: true, cd: 4 }), multi('Coil and Strike', 2, 0.8) ],
    passive: { regen: 0.04 } },
  wyrm: { hp: 1.7, dmg: 1.55, moves: [
    hit('Elder Flame', 1.3, { type: 'mag', eff: [E('burn', 1, 3, { pow: 0.06 })] }), multi('Claw and Tail', 2, 0.9), charge('Breath Gathers', { name: "Dragon's Breath", pow: 3.4, type: 'mag', eff: [E('burn', 1, 3, { pow: 0.06 })] }) ] },
  warden: { hp: 1.9, def: 1.6, dmg: 1.3, moves: [
    hit('Root Bind', 0.8, { eff: [E('stun', 0.35, 1)], cd: 3 }), heal('World-Sap', 0.2), hit('Branch Crush', 1.4) ] },
  timewraith: { hp: 1.3, avd: 1.5, dmg: 1.45, type: 'mag', moves: [
    { kind: 'rewind', name: 'Rewind', w: 1.5, cd: 4, hpBelow: 0.7 }, multi('Clockwork Hands', 2, 0.8), debuff('Stop', [E('stun', 0.4, 1)], { cd: 4 }),
    debuff('Entropy', [E('weaken', 1, 2), E('chill', 1, 2)]) ] },
  luminous: { boss: true, hp: 5.5, dmg: 1.4, avd: 1.3, crit: 3, type: 'mag', moves: [
    hit('Wings of White', 1.2, { pierce: 80 }), hit('Dark Light', 1.6, { cd: 1 }), debuff('Wither', [E('weaken', 1, 2), E('vuln', 1, 2)]) ],
    phases: [
      { below: 0.5, msg: 'Final Light.', name: 'Final Light', add: [multi('Luminous Arc', 5, 0.5, { pierce: 200, w: 3, cd: 1 }), hit('Wings of Rage', 1.8, { type: 'phys', cd: 2 })] },
      { below: 0.2, msg: 'End Luminous.', name: 'End Luminous', add: [charge('Final Luminous', { name: 'End Luminous', pow: 5.0, pierce: 250 }, { cd: 3, w: 4 })] },
    ] },
};
// the boss of each stratum, and names from the art files (filled in when the art loads)
for (const [id, t] of Object.entries(ENEMIES)) {
  t.id = id;
  t.type = t.type || 'phys';
  t.stratum = STRATA.findIndex((s) => s.regulars.includes(id) || s.boss === id) + 1;
}
const enemyName = (id) => (ART[id] && ART[id].name) || id.replace(/^\w/, (c) => c.toUpperCase());

// Affixes: champions (every fifth floor) carry two, regulars pick them up deeper down, and the Beyond
// makes everything Ascended.
const AFFIXES = {
  vampiric: { name: 'Vampiric', desc: 'Heals for a quarter of the damage it deals.', lifesteal: 0.25 },
  ironclad: { name: 'Ironclad', desc: 'Much higher defence.', defMult: 1.6, defAdd: 20 },
  swift: { name: 'Swift', desc: 'Acts first; harder to hit.', first: true, avdMult: 1.3 },
  arcane: { name: 'Arcane', desc: 'Its hits burn your mana.', mpBurn: 0.08, dmgMult: 1.1 },
  enraged: { name: 'Enraged', desc: '+50% damage below half health.', enrage: 0.5 },
  spectral: { name: 'Spectral', desc: 'Very hard to hit.', avdMult: 1.6 },
  thorned: { name: 'Thorned', desc: 'Returns 15% of the damage it takes.', thorns: 0.15 },
  regenerating: { name: 'Regenerating', desc: 'Regains 4% health every turn.', regen: 0.04 },
  venomous: { name: 'Venomous', desc: 'Its hits poison.', eff: E('poison', 0.6, 3, { pow: 0.03 }) },
  blazing: { name: 'Blazing', desc: 'Its hits burn.', eff: E('burn', 0.5, 2, { pow: 0.05 }) },
  frostbound: { name: 'Frostbound', desc: 'Its hits chill.', eff: E('chill', 0.6, 2) },
  gilded: { name: 'Gilded', desc: 'Carries a fortune: far more Soul Coins and loot.', gilded: 2.5, hpMult: 1.15 },
  elder: { name: 'Elder', desc: '30% stronger in every way; pays 30% more.', allMult: 1.3 },
  cursed: { name: 'Cursed', desc: 'Weakens you every few turns.', curse: true },
  warded: { name: 'Warded', desc: 'Starts behind a barrier of 30% of its health.', ward: 0.3 },
  ascended: { name: 'Ascended', desc: 'Returned from the source, stronger with every cycle.', ascended: true },
};
for (const [id, a] of Object.entries(AFFIXES)) a.id = id;
const BOSS_HP = 0.9, BOSS_DMG = 0.8; // global boss trim, tuned with tools/sim.mjs
const AFFIX_POOL = Object.keys(AFFIXES).filter((k) => k !== 'ascended');

// --------------------------------------------------------------------------------- floor plan
// Floors 1-100 walk the strata, ten floors each: 1-4 and 6-9 regular, 5 a champion, 10 the boss.
// Past 100, the Beyond: stratum (cycle) comes round again, every foe Ascended.
function floorInfo(f) {
  const beyond = f > 100;
  const cycle = beyond ? Math.floor((f - 101) / 100) + 1 : 0; // first cycle of the Beyond is cycle 1
  const local = beyond ? ((f - 101) % 100) + 1 : f;
  const sIdx = Math.floor((local - 1) / 10);
  const stratum = STRATA[sIdx];
  const step = ((local - 1) % 10) + 1;
  const kind = step === 10 ? 'boss' : step === 5 ? 'elite' : 'regular';
  return { f, beyond, cycle, stratum, sIdx, step, kind };
}
function stratumName(info) {
  return info.beyond ? `The Beyond ${toRoman(info.cycle)}: ${info.stratum.name}` : info.stratum.name;
}
function toRoman(n) {
  const r = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, l] of r) while (n >= v) { s += l; n -= v; }
  return s;
}

// Build the enemy for a floor. opts.training: an easier rerun of an earlier floor.
function makeEnemy(f, opts = {}, r = rng) {
  const info = floorInfo(f);
  const tplId = opts.tplId || (info.kind === 'boss' ? info.stratum.boss : r.pick(info.stratum.regulars));
  const t = ENEMIES[tplId];
  const kind = opts.kind || info.kind;
  // affixes
  const affixes = [];
  let n = 0;
  if (kind === 'elite') n = 1 + (f > 30 ? 1 : 0) + (f > 70 ? 1 : 0);
  else if (kind === 'regular' && f > 6) {
    const p1 = Math.min(0.55, (f - 6) / 70), p2 = Math.min(0.35, Math.max(0, (f - 40) / 120));
    n = (r.chance(p1) ? 1 : 0) + (r.chance(p2) ? 1 : 0);
  }
  const pool = AFFIX_POOL.filter((a) => !(t.passive && t.passive.gilded && a === 'gilded'));
  for (let i = 0; i < n; i++) {
    const a = r.pick(pool.filter((x) => !affixes.includes(x)));
    if (a) affixes.push(a);
  }
  if (info.beyond) affixes.unshift('ascended');

  const S = floorScale(f);
  let hpMult = (t.hp || 1) * (kind === 'elite' ? 1.5 : 1) * (t.boss ? BOSS_HP : 1), dmgMult = (t.dmg || 1) * (kind === 'elite' ? 1.05 : 1) * (t.boss ? BOSS_DMG : 1);
  let defMult = t.def || 1, avdMult = t.avd || 1, accMult = t.acc || 1, defAdd = 0;
  let reward = KIND_REWARD[kind] * (1 + AFFIX_REWARD * affixes.length);
  for (const id of affixes) {
    const a = AFFIXES[id];
    if (a.defMult) defMult *= a.defMult;
    if (a.defAdd) defAdd += a.defAdd;
    if (a.avdMult) avdMult *= a.avdMult;
    if (a.dmgMult) dmgMult *= a.dmgMult;
    if (a.hpMult) hpMult *= a.hpMult;
    if (a.allMult) { hpMult *= a.allMult; dmgMult *= a.allMult; defMult *= a.allMult; reward *= a.allMult; }
    if (a.gilded) reward *= a.gilded;
    if (a.ascended) { const k = 1 + 0.25 * info.cycle; hpMult *= k; dmgMult *= k; }
  }
  if (t.passive && t.passive.gilded) reward *= t.passive.gilded;
  if (opts.training) reward *= TRAINING_REWARD;
  const RS = Math.pow(S, REWARD_EXP);
  const hpMax = Math.round(ENEMY_HP * Math.pow(S, ENEMY_HP_EXP) * hpMult);
  const e = {
    id: tplId, name: (affixes.length ? affixes.map((a) => AFFIXES[a].name).join(' ') + ' ' : '') + enemyName(tplId),
    baseName: enemyName(tplId), kind, floor: f, stratum: info.stratum.n, boss: !!t.boss, type: t.type,
    hpMax, hp: hpMax, mpBurnAffix: 0,
    dmg: ENEMY_DMG * Math.pow(S, ENEMY_DMG_EXP) * dmgMult,
    def: Math.round(ENEMY_DEF(f) * defMult + defAdd), dfp: Math.round(ENEMY_DFP(f)),
    acc: Math.round(ENEMY_ACC(f) * accMult), avd: Math.round(ENEMY_AVD(f) * avdMult),
    crit: 5 + (t.crit || 0) * 5 + (t.boss ? 5 : 0), critMult: 1.5,
    bal: 40, affixes,
    reward: { sc: Math.round(REWARD_SC * RS * reward), xp: Math.round(REWARD_XP * RS * reward), loot: 0 },
    moves: t.moves.map((m) => ({ ...m })), phases: (t.phases || []).map((p) => ({ ...p })), passive: { ...(t.passive || {}) },
  };
  for (const id of affixes) {
    const a = AFFIXES[id];
    if (a.lifesteal) e.passive.lifesteal = (e.passive.lifesteal || 0) + a.lifesteal;
    if (a.regen) e.passive.regen = (e.passive.regen || 0) + a.regen;
    if (a.thorns) e.passive.thorns = a.thorns;
    if (a.mpBurn) e.mpBurnAffix = a.mpBurn;
    if (a.enrage) e.passive.enrage = a.enrage;
    if (a.first) e.passive.first = true;
    if (a.eff) e.passive.onHit = (e.passive.onHit || []).concat([a.eff]);
    if (a.curse) e.passive.curse = true;
    if (a.ward) e.ward = a.ward;
  }
  // loot: regular 18%, champions 60%, bosses always
  e.reward.loot = kind === 'boss' ? 1 : kind === 'elite' ? 0.6 : 0.18;
  if (affixes.includes('gilded') || (t.passive && t.passive.gilded)) e.reward.loot = Math.min(1, e.reward.loot + 0.5);
  return e;
}
