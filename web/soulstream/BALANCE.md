# Soulstream II: progression assessment and rebalance

The batch original (`Soulstream II.bat`, 0.4, June 2014) was a two-player duel. This rebuild is an endless
PVE arena, so its economy needs something the original never had: a difficulty curve. This note covers what
the original's progression did, what was wrong with it, the model that replaces it, and what the simulator
says about the result.

## 1. The original's progression

After every death both players were paid and went to the Store (`:p1.die`, `:p1.shop`):

| | Winner | Loser |
|---|---|---|
| Soul Coins | `td/2 + 250 + LUK/10`, plus half the loser's | `td/2 + 175 + LUK/10`, plus half the winner's |
| Experience | `td/2 + 175 + WIL/10`, plus half the loser's | `td/2 + 200 + WIL/10`, plus half the winner's |

`td` is total damage dealt. Both players got roughly the same income (the loser about 70-80% of the
winner), which made sense for a friendly duel and gave the loser a way to catch up.

There were three places to spend it:

- **Skill ranks** (F, E, D, C, B, A, 9 ... 1): the cost is a table entry times the skill's value / 10, in both
  Soul Coins and XP. The multiplier goes from 0.5x at F to 4.0x at rank 1.
- **Masteries** (14 of them, no cap): rank *n* adds *2n* to two stats. It costs `10 + sv*n + ss/2` in
  both Soul Coins and XP, where `ss` is the total stat already gained (about *n²*).
- **Classes and the Emporium**: placeholders (`:p1.shop.classes` just jumped back to the shop). The
  Emporium had screens but no stock.

## 2. Problems found

Bugs that affected the economy or the balance:

1. **Attack cost almost nothing to rank up.** Its skill value was 1, against 10-60 for every other skill,
   so its ranks cost a tenth or less. It also started at rank "4" (2.4x) while everything else started at F
   or A. Its damage cap was dead code too: `if %dmg% gtr 40 set damage=40` sets the wrong variable.
2. **MP drain grew with the damage you dealt.** The cost was `base x (30-rank)/30 + damage/4`, so more STR,
   a critical hit or a rank-up each made a skill cost more. It was charged on a miss as well, and the check
   for enough MP ran after the damage roll.
3. **The loss calculator doubled the whole bank.** `if %p1.loss% geq 3 set/a p1.sc*=2` doubles the
   player's total Soul Coins and XP, not the reward. It also checked the losses on the wrong player.
4. **Enlightenment never wore off.** `:funct.buff.enl` has no closing logic, so the +stat% buff stacked
   forever.
5. **Recomputing stats fully healed you.** `:funct.stat` writes max HP into the same variable as current
   HP, so every stat recalculation (each turn of the shop, each load) refilled health.
6. **Loading drifted the stats.** `:start.load` adds +25 to every stat on each load, and the loaded branch
   subtracts 50.
7. **Rest read the wrong player's INT.** Player 1's Rest used `%p2.int%`.
8. **Accuracy barely used the defender.** In `:funct.acc` a random number above the accuracy is a *miss*
   (`funct.return=1`). The ratio loop and the `!%2.dx%` typo meant the defender's INT barely mattered;
   hits ended up near the 95 cap.
9. **The twelve abilities had unequal budgets.** The modifiers are float-10 multipliers of the base stat,
   so +5 means +50%.
   - Shadowhunter is +5 STR, +4 DEX, +4 INT, +3 LUK, +5 WIL and +20% health and mana, against -5 crit and
     -10% MP cost reduction: close to strictly best.
   - Thief and Ranger pay for their bonuses.
10. **Masteries split the cost across two currencies that were one.** They charged Soul Coins and XP equally
    while both were earned at the same rate, so the split did nothing. Each rank gave more than the last,
    and costs grew roughly quadratically to keep up.

## 3. The replacement model

Every knob below is named in `js/rules.js`, `js/enemies.js`, `js/skills.js`, `js/classes.js` and `js/items.js`.

**Floor scale.** Floors 1-100 grow polynomially with a slow exponential underneath, and past 100 a steeper
exponential takes over (the Beyond):

```
S(f) = (1 + 0.1(f-1))^1.75 x 1.012^(f-1) x 1.035^max(0, f-100)
enemy HP ~ S^0.92   enemy damage ~ S^0.84   rewards ~ S^0.97
```

Enemy damage grows slower than enemy health, and rewards grow a little slower than enemies, so each stratum
asks for slightly more investment than the last. Defence, defence penetration, accuracy and avoidance grow
linearly with the floor, which keeps the original's hyperbolic defence formula working:
`dmg x 100 / (100 + DEF - DFP)`.

| Floor | S(f) | Regular HP | Hit | DEF | Soul Coins | XP |
|---|---|---|---|---|---|---|
| 1 | 1.0 | 54 | 10 | 4 | 22 | 20 |
| 10 | 3.4 | 168 | 28 | 12 | 73 | 66 |
| 30 | 15.3 | 664 | 99 | 28 | 310 | 282 |
| 50 | 40.1 | 1,611 | 222 | 43 | 789 | 717 |
| 70 | 84.8 | 3,209 | 417 | 58 | 1,992 | 1,811 |
| 100 | 213 | 7,490 | 994 | 79 | 5,745 | 5,223 |
| 150 | 4,182 | 144,862 | 13,767 | (affixes) | 103,158 | 93,780 |

(The Feral Wolf template; the floor-150 row includes Ascended and random affixes.)

**How the player grows**, by layer:

- **Skill ranks.** F = 1.0x up to rank 1 = 4.7x. MP cost rises only 1.0x to 1.72x, so a rank-up is always a
  net gain. Every skill has a real cost value (Attack included). A rank-up costs Soul Coins plus 80% as much
  XP.
- **The skill ladder.** Base damage climbs as you go deeper:

  | Skill | Base damage |
  |---|---|
  | Attack | 12 |
  | Magic Arrow | 26 |
  | Sokatsui | 50 |
  | Lightning | 72 |
  | Dire Blade | 105 |
  | Blessing skills | 75-345 |
  | Luminous skills | 185-350 (Luminous Arc 5 x 125) |
  | Awakened ultimates | 380-620 (or 4-7 hits) |

  This ladder is the main way power grows.
- **Masteries.** These cost XP only (Soul Coins buy gear). Each rank gives a flat +3 to both stats, at
  `18 x k x (1+r)^1.8` XP. Health, Mana and Defence masteries give percentages or flat defence.
  Regeneration and Rumination have diminishing returns.
- **Blessings.** Eweca, Laceda and Falias open after floor 10 for 900 Soul Coins and 700 XP. Luminous opens
  after floor 40 for 22,000 and 18,000. Awakening comes after floor 60, and Embodiment after the Morrigan
  (floor 70).
- **Gear.** This uses Artillery 3's eight tiers, gated by depth:

  | Tier | Opens after floor |
  |---|---|
  | Rare | 5 |
  | Epic | 15 |
  | Mythical | 30 |
  | Legendary | 45 |
  | Godly | 70 |
  | Luminous | 99 (boss drops only) |

  Flat stat lines scale with item level, and the weapon damage line grows with tier and depth. The Armoury
  only stocks up to Uncommon, Rare, Epic or Mythical depending on how deep you are, so the higher tiers come
  from champions and bosses.
- **Perks.** You choose 1 of 3 after every boss (the Perks SS2 and Skills and Perks Update lists), up to
  rank III.

**Risk and recovery**:

- **Winning.** Pressing on keeps your wounds (plus 20% back) and pays +12% per fight in the streak.
  Resting resets the streak.
- **Dying.** You lose 25% of your unspent Soul Coins and go back to the last floor after a multiple of five.
  The original's loss calculator returns as +50% rewards for 3 fights, applied to the reward rather than
  the bank.
- **Training.** Fights a regular from three floors back, at 60% pay, with no risk. This is the grind valve.
- **Enrage.** Past round 18 a foe hits 20% harder every round, so defensive builds can't stall forever.

## 4. Simulator results

`node tools/sim.mjs --runs 8 --fights 800 --class <class> --seed 3000` plays whole runs headless with the
game's own code. The bot plays reasonably: it guards telegraphed blows, heals only when the heal beats the
incoming hit, finishes off foes, and shops greedily by power gained per currency spent. It drinks only health
potions and never plans around cooldowns, so a careful human should do better on bosses.

**Fights to reach a floor** (mean of 8 runs; 12 abilities rotated):

| Class path | 10 | 20 | 30 | 40 | 50 | 60 | Mean best floor |
|---|---|---|---|---|---|---|---|
| Eweca | 13 | 33 | 52 | 74 | 95 | 126 | 111 |
| Laceda | 13 | 38 | 52 | 70 | 93 | 126 | 155 |
| Falias | 13 | 37 | 51 | 68 | 97 | 124 | 118 |
| Luminous (Adventurer until 40) | 13 | 67 | 99 | 129 | | | 108 |

Some runs stall at the Morrigan (floor 70) or the Twin Moons (floor 80) within 800 fights, and others pass
150, so the later columns aren't averaged. Staying an Adventurer to floor 40 roughly doubles the time from
floor 10 to 40, which shows the blessings are the big step they should be.

**Bot win rate by stratum** (Eweca / Laceda / Falias; champions shown where they stand out):

| Stratum | Regular | Champion | Boss |
|---|---|---|---|
| 1 Outskirts | 99 / 94 / 99% | 92 / 100 / 100% | Grell 42 / 70 / 57% |
| 2 Barrow | 90 / 92 / 92% | | Barrow King 58 / 40 / 33% |
| 3 Arcane Spire | 94 / 90 / 98% | | Archon 37 / 50 / 61% |
| 4 Fomorian Shore | 95 / 93 / 96% | | Balor 31 / 23 / 23% |
| 5 Wild Mythos | 84 / 91 / 89% | 52 / 40 / 50% | Hydra 61 / 58 / 42% |
| 6 Elemental Planes | 92 / 96 / 94% | | Phoenix 31 / 19 / 23% |
| 7 Otherworld | 65 / 75 / 69% | | Morrigan 14 / 31 / 16% |
| 8 Celestial Host | 50 / 75 / 58% | 20 / 16 / 18% | Twin Moons 13 / 13 / 21% |

Regular fights last 4-10 rounds and champions 8-16. Bosses last 13-25 rounds; Falias, the defensive class,
runs longest.

**What this means:**

- The early game is quick: floor 10 by about fight 13 (blessings open there), floor 30 by about 50 fights.
- Each boss is a gate you may need two or three tries at. Balor, the Phoenix, the Morrigan and the Twin Moons
  are the hard ones. They are dangerous by design: Balor's telegraphed Gaze, the Phoenix's rebirth, the
  Morrigan's three phases, and the alternating moons. Guard, stuns, shields and potions are the answers.
- The Otherworld and the Celestial Host are where regular fights start to bite (50-75% for the bot). This is
  the mid-to-late difficulty bump. Training and gear from champions are the way through.
- Past floor 100, the 3.5%-a-floor exponential in the Beyond outruns every source of growth, so the climb
  becomes a wall. The leaderboard (deepest floor) is the score there.

## 5. Things a later pass could look at

- **Simulator ceiling.** The bot is the limit: it doesn't use buff windows, cooldown rotations or the
  potions beyond health. A smarter bot would give truer boss win rates.
- **Falias fight length.** Falias fights run long. Its damage skills (Falias' Wrath scales with DEF and HP)
  could grow a little faster, or the enrage could start earlier for it.
- **Laceda's mana.** Laceda's slow mana is felt late (stratum 9 regulars take long when the bot runs dry).
  This is in character ("must use co-ordinated attacks") but worth watching.
