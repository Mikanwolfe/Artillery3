'use strict';
// Skills. Codes are the original's three-letter codes (SKILLCODES.txt, Variables SS2.txt, Deity and
// Ranking Update), with the original's ideas for what each one does; the numbers are new.
//
//   type   phys (scales with STR) | mag (INT) | hyb (both) | heal | rest | buff
//   bd     base damage per hit at rank F          hits   number of hits
//   mp     MP cost at rank F                      hpCost share of max HP spent to cast
//   acc    base hit chance (100 = never misses)   bal    the original's skill balance (raises min damage)
//   pierce the original's skill defence penetration (SP)
//   crit   the skill's own crit chance, added to yours (capped at 50% overall)
//   cd     turns before it can be used again      eff    statuses it can apply
//   learn  Soul Coins to learn it (class skills: once the class is yours)   cost  base rank-up price
//   minFloor  deepest floor you must have reached before the shop offers it
const SKILLS = {
  // ------------------------------------------------------------------ Adventurer (always available)
  att: { name: 'Attack', cls: 'adventurer', type: 'phys', bd: 12, mp: 0, acc: 88, bal: 50, pierce: 10, crit: 15, cost: 14,
    fx: 'slash', desc: 'A plain strike. Costs nothing.' },
  hea: { name: 'Heal', cls: 'adventurer', type: 'heal', heal: 0.14, healRank: 0.02, healFlat: 10, mp: 18, acc: 100, cost: 18,
    fx: 'heal', desc: 'Restore 14% of your max health (+2% a rank) and a little more.' },
  res: { name: 'Rest', cls: 'adventurer', type: 'rest', restore: 0.25, restoreRank: 0.015, mp: 0, acc: 100, cost: 14,
    fx: 'rest', desc: 'Recover a quarter of your mana (more with rank) and shake off one debuff.' },
  fus: { name: 'Fusion', cls: 'adventurer', type: 'hyb', bd: 30, mp: 10, hpCost: 0.06, acc: 76, bal: 20, pierce: 25, crit: 20, cost: 20,
    fx: 'fusion', desc: 'Burn your own health and mana into one heavy blow (STR and INT).' },
  mga: { name: 'Magic Arrow', cls: 'adventurer', type: 'mag', bd: 26, mp: 9, acc: 95, bal: 70, pierce: 20, crit: 25, learn: 120, cost: 24,
    fx: 'arrow', desc: 'A reliable bolt of mana. Rarely misses.' },
  mgc: { name: 'Magic Claw', cls: 'adventurer', type: 'mag', bd: 21, hits: 2, mp: 16, acc: 82, bal: 80, pierce: 60, crit: 10, learn: 220, cost: 30, minFloor: 3,
    fx: 'claw', desc: 'Two raking claws of force that bite through defence.' },
  sok: { name: 'Sokatsui', cls: 'adventurer', type: 'hyb', bd: 50, mp: 18, cd: 1, acc: 84, bal: 60, pierce: 50, crit: 10, learn: 160, cost: 34, minFloor: 2,
    fx: 'sokatsui', desc: 'A blue fire blast from the palm. Cooldown 1.' },
  hdr: { name: 'Heart Drain', cls: 'adventurer', type: 'mag', bd: 36, mp: 22, cd: 1, lifesteal: 0.6, acc: 85, bal: 50, pierce: 30, crit: 10, learn: 250, cost: 34, minFloor: 4,
    fx: 'drain', desc: 'Steal life: heals you for 60% of the damage. Cooldown 1.' },
  lig: { name: 'Lightning', cls: 'adventurer', type: 'mag', bd: 72, mp: 32, acc: 72, bal: 30, pierce: 100, crit: 20, learn: 450, cost: 48, minFloor: 5,
    eff: [{ id: 'stun', chance: 0.2, turns: 1 }], fx: 'lightning', desc: 'A wild bolt that ignores much of their defence. 20% to stun.' },
  enl: { name: 'Enlightenment', cls: 'adventurer', type: 'buff', mp: 25, cd: 6, acc: 100, learn: 300, cost: 26, minFloor: 6,
    buff: { name: 'Enlightened', turns: 4, mods: { statPct: 0.15 }, rankMods: { statPct: 0.012 } },
    fx: 'buff', desc: 'All five stats +15% (+1.2% a rank) for 4 turns.' },
  dbl: { name: 'Dire Blade', cls: 'adventurer', type: 'phys', bd: 105, mp: 45, cd: 2, acc: 78, bal: 50, pierce: 60, crit: 15, learn: 600, cost: 60, minFloor: 8,
    eff: [{ id: 'bleed', chance: 1, turns: 3, pow: 0.12 }], fx: 'direblade', desc: 'A cursed great-slash that leaves them bleeding. Cooldown 2.' },

  // ------------------------------------------------------------------ Eweca: energy, magic that keeps going
  ice: { name: 'Ice Spear', cls: 'eweca', type: 'mag', bd: 80, mp: 20, acc: 88, bal: 100, pierce: 40, crit: 10, learn: 0, cost: 60,
    eff: [{ id: 'chill', chance: 0.6, turns: 2 }], fx: 'ice', desc: 'A lance of ice. Very steady damage; often chills (-avoid, -accuracy).' },
  fir: { name: 'Firestorm', cls: 'eweca', type: 'mag', bd: 112, mp: 40, hpCost: 0.04, cd: 1, acc: 80, bal: 80, pierce: 45, crit: 20, learn: 900, cost: 80,
    eff: [{ id: 'burn', chance: 1, turns: 3, pow: 0.1 }], fx: 'fire', desc: 'Drains health and mana; sets them burning. Cooldown 1.' },
  esc: { name: 'Eweca Scythe', cls: 'eweca', type: 'mag', bd: 150, mp: 55, acc: 72, bal: 70, pierce: 120, crit: 5, learn: 1500, cost: 100,
    fx: 'scythe', desc: 'A pale crescent that cuts through almost any armour.' },
  cla: { name: 'Clairvoyance', cls: 'eweca', type: 'buff', mp: 35, cd: 6, acc: 100, learn: 1200, cost: 70,
    buff: { name: 'Clairvoyant', turns: 4, mods: { 'int%': 0.25, 'dex%': 0.25, dfpPct: 0.25 }, rankMods: { 'int%': 0.015, 'dex%': 0.015, dfpPct: 0.015 } },
    fx: 'buff', desc: 'INT, DEX and defence penetration +25% for 4 turns.' },
  hly: { name: 'Holy Arrow', cls: 'eweca', type: 'mag', bd: 285, mp: 110, hpCost: 0.05, cd: 2, acc: 82, bal: 40, pierce: 50, crit: 5, learn: 3000, cost: 160,
    fx: 'holy', desc: 'Very strong. Drains health and mana. Cooldown 2.' },
  sil: { name: 'Silence of Eternity', cls: 'eweca', ult: true, type: 'mag', bd: 620, mp: 180, cd: 4, acc: 90, bal: 80, pierce: 120, crit: 10, learn: 25000, cost: 600,
    eff: [{ id: 'silence', chance: 1, turns: 2 }, { id: 'chill', chance: 1, turns: 3 }], fx: 'silence', desc: 'Awakened. The night stops. Silences and freezes. Cooldown 4.' },

  // ------------------------------------------------------------------ Laceda: constant, huge physical damage
  cer: { name: 'Cero', cls: 'laceda', type: 'phys', bd: 95, mp: 12, acc: 90, bal: 40, pierce: 30, crit: 5, learn: 0, cost: 60,
    fx: 'cero', desc: 'A crimson blast with a low drain. The Laceda staple.' },
  lsc: { name: 'Lunar Scythe', cls: 'laceda', type: 'phys', bd: 78, hits: 2, mp: 30, cd: 1, acc: 84, bal: 30, pierce: 10, crit: 5, learn: 900, cost: 80,
    fx: 'scythe', desc: 'Two great sweeps under the red moon. Cooldown 1.' },
  lsp: { name: 'Lunar Spear', cls: 'laceda', type: 'phys', bd: 165, mp: 32, acc: 85, bal: 40, pierce: 120, crit: 5, learn: 1500, cost: 100,
    fx: 'spear', desc: 'Pierces nearly all defence.' },
  shm: { name: 'Sharp Mind', cls: 'laceda', type: 'buff', mp: 25, cd: 6, acc: 100, learn: 1200, cost: 70,
    buff: { name: 'Sharp Mind', turns: 4, mods: { avdPct: 0.4, acc: 30, 'dex%': 0.25 }, rankMods: { avdPct: 0.02, 'dex%': 0.015 } },
    fx: 'buff', desc: 'Avoidance +40%, accuracy +30 and DEX +25% for 4 turns.' },
  lac: { name: 'Laceda Blade', cls: 'laceda', type: 'phys', bd: 345, mp: 55, hpCost: 0.12, cd: 2, acc: 86, bal: 40, pierce: 20, crit: 5, learn: 3000, cost: 160,
    fx: 'bigslash', desc: 'Spends your blood for very, very high damage. Cooldown 2.' },
  fur: { name: 'Fury of Infinity', cls: 'laceda', ult: true, type: 'phys', bd: 175, hits: 4, mp: 90, hpCost: 0.1, cd: 4, acc: 90, bal: 60, pierce: 60, crit: 10, learn: 25000, cost: 600,
    fx: 'fury', desc: 'Awakened. Four strokes that do not stop. Cooldown 4.' },

  // ------------------------------------------------------------------ Falias: the ultimate survivor
  smh: { name: 'Smash', cls: 'falias', type: 'phys', bd: 76, mp: 8, acc: 86, bal: 50, pierce: 20, crit: 5, learn: 0, cost: 60,
    eff: [{ id: 'stun', chance: 0.15, turns: 1 }], fx: 'smash', desc: 'A shield-first slam. 15% to stun.' },
  fhl: { name: 'Falias Heal', cls: 'falias', type: 'heal', heal: 0.28, healRank: 0.015, healFlat: 30, mp: 30, cd: 1, acc: 100, learn: 900, cost: 80,
    cleanse: 1, fx: 'heal', desc: 'A big heal that also lifts one debuff. Cooldown 1.' },
  fsh: { name: 'Falias Shield', cls: 'falias', type: 'buff', mp: 35, cd: 5, acc: 100, learn: 1200, cost: 70, shield: 0.15,
    buff: { name: 'Falias Shield', turns: 3, mods: { prot: 0.3, defPct: 0.4 }, rankMods: { prot: 0.008 } },
    fx: 'shield', desc: 'Protection +30%, defence +40% for 3 turns, and a barrier of 15% max health.' },
  fbr: { name: 'Light Brandish', cls: 'falias', type: 'hyb', bd: 190, mp: 40, hpCost: 0.08, cd: 1, acc: 82, bal: 60, pierce: 60, crit: 10, learn: 1500, cost: 100,
    fx: 'brandish', desc: 'A blade of light swung with everything you have. Cooldown 1.' },
  fsl: { name: "Falias' Wrath", cls: 'falias', type: 'phys', bd: 120, defScale: 2.2, hpScale: 0.08, mp: 60, cd: 3, acc: 90, bal: 80, pierce: 40, crit: 5, learn: 3000, cost: 160,
    fx: 'wrath', desc: 'Grows with your defence and max health. Cooldown 3.' },
  gods: { name: 'Way of the Gods', cls: 'falias', ult: true, type: 'phys', bd: 380, defScale: 3, hpScale: 0.12, mp: 120, cd: 4, acc: 95, bal: 90, pierce: 80, crit: 5, learn: 25000, cost: 600,
    selfHeal: 0.2, fx: 'wrath', desc: 'Awakened. Strikes with the weight of your armour and heals 20%. Cooldown 4.' },

  // ------------------------------------------------------------------ Luminous: the strongest attacks, the least stable
  wow: { name: 'Wings of White', cls: 'luminous', type: 'mag', bd: 185, mp: 30, acc: 76, bal: 10, pierce: 80, crit: 25, learn: 0, cost: 90,
    fx: 'wings', desc: 'High penetration, wild damage.' },
  dkl: { name: 'Dark Light', cls: 'luminous', type: 'mag', bd: 330, mp: 50, hpCost: 0.06, cd: 1, acc: 70, bal: 0, pierce: 100, crit: 25, learn: 1800, cost: 120,
    fx: 'darklight', desc: 'Insane damage potential; no balance at all. Cooldown 1.' },
  wor: { name: 'Wings of Rage', cls: 'luminous', type: 'phys', bd: 350, mp: 45, hpCost: 0.1, cd: 1, acc: 74, bal: 40, pierce: 60, crit: 25, learn: 2400, cost: 140,
    fx: 'wings', desc: 'For a Luminous skill, good balance. Cooldown 1.' },
  wit: { name: 'Wither', cls: 'luminous', type: 'buff', mp: 40, cd: 6, acc: 100, learn: 2000, cost: 90,
    buff: { name: 'Wither', turns: 4, mods: { bal: 60, defPct: 0.4, avdPct: 0.4 }, rankMods: { bal: 4 } },
    eff: [{ id: 'weaken', chance: 1, turns: 2, target: 'foe' }],
    fx: 'buff', desc: 'Balance +60, defence and avoidance +40% for 4 turns; weakens them.' },
  arc: { name: 'Luminous Arc', cls: 'luminous', type: 'mag', bd: 125, hits: 5, mp: 130, hpCost: 0.15, cd: 2, acc: 76, bal: 10, pierce: 200, crit: 25, learn: 5000, cost: 220,
    fx: 'arc', desc: 'A barrage. If they survive, well, gg. Cooldown 2.' },
  wol: { name: 'Wings of Luminous', cls: 'luminous', ult: true, type: 'mag', bd: 160, hits: 7, mp: 220, hpCost: 0.2, cd: 4, acc: 85, bal: 30, pierce: 250, crit: 30, learn: 30000, cost: 700,
    fx: 'arc', desc: 'Awakened. Every wing at once. Cooldown 4.' },
};
// Skills wear A3's tiers too: the basics are Common, the Adventurer's locked skills Uncommon to Rare,
// the blessings Epic to Mythical, Luminous Legendary, the awakened ultimates Godly (Wings of
// Luminous is the one Luminous-tier skill).
const SKILL_TIER = {'att': 'common', 'hea': 'common', 'res': 'common', 'fus': 'common', 'mga': 'uncommon', 'sok': 'uncommon', 'mgc': 'uncommon', 'hdr': 'uncommon', 'lig': 'rare', 'enl': 'rare', 'dbl': 'rare', 'ice': 'epic', 'fir': 'epic', 'esc': 'epic', 'cla': 'epic', 'hly': 'mythical', 'cer': 'epic', 'lsc': 'epic', 'lsp': 'epic', 'shm': 'epic', 'lac': 'mythical', 'smh': 'epic', 'fhl': 'epic', 'fsh': 'epic', 'fbr': 'epic', 'fsl': 'mythical', 'wow': 'legendary', 'dkl': 'legendary', 'wor': 'legendary', 'wit': 'legendary', 'arc': 'legendary', 'sil': 'godly', 'fur': 'godly', 'gods': 'godly', 'wol': 'luminous'};
const SKILL_LETTER = { phys: 'k', mag: 'e', hyb: 'h', heal: '+', rest: 'z', buff: 'b' }; // badge type letters
for (const [id, s] of Object.entries(SKILLS)) {
  s.id = id;
  s.tier = SKILL_TIER[id] || 'common';
  s.hits = s.hits || 1;
  s.cd = s.cd || 0;
  s.bal = s.bal || 0; s.pierce = s.pierce || 0; s.crit = s.crit || 0;
}
const SKILL_KEYS = ['A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V']; // the original's key set (ASDFZXCV)

// Skill numbers at a given rank, for the shop and the battle
function skillMp(s, rank, st) {
  const base = (s.mp || 0) * RANK_MP[Math.max(0, rank)];
  return Math.max(0, Math.round(base * (1 + (st ? st.costPct : 0))));
}
function rankUpCost(s, rank) {
  const next = rank + 1;
  if (next >= RANKS.length) return null;
  const k = RANK_COST[next] * s.cost;
  return { sc: Math.round(k), xp: Math.round(k * RANK_XP) };
}
// expected damage range for display: [min, max] per hit against no defence
function skillRange(s, rank, st) {
  if (!s.bd) return null;
  let max = s.bd * RANK_MULT[Math.max(0, rank)] * powerOf(st, s.type);
  if (s.defScale) max += (st.def * s.defScale + st.hpMax * s.hpScale) * RANK_MULT[Math.max(0, rank)];
  max *= 1 + st.dmgPct + (s.type === 'phys' ? st.physPct : s.type === 'mag' ? st.magPct : (st.physPct + st.magPct) / 2);
  const min = max * (st.bal + s.bal) / (100 + st.bal + s.bal);
  return [min, max];
}
