# Soulstream II (web)

A browser rebuild of **Soulstream II**, Wolfe Lumi's 2014 turn-based ASCII RPG written in Windows batch. The original was a duel between a `+` and a `-` on an 80-column console. This version is an endless PVE arena: ten strata of new foes, each more arcane and mythical than the last, up to Luminous, the Final Light at floor 100, and then the Beyond.

Open `index.html` through a web server (it loads the shared Cascadia Mono from `../fonts`), for example:

```bash
python3 -m http.server -d web 8000
```

Then go to http://localhost:8000/soulstream/. It is plain HTML canvas and vanilla JS with no build step, the same way as Artillery 3's web rewrite. The Pages workflow publishes it at `/soulstream/`.

## What is in it

- **From the original, kept and finished:**
  - **Abilities.** The twelve starting abilities ("descendant of the Sniper"), rebalanced to one budget.
  - **Masteries.** All fourteen, with no limit.
  - **Skill ranks.** F to 1, with the original's skill codes: Attack, Heal, Rest, Fusion, Magic Arrow, Magic Claw, Sokatsui, Lightning, Enlightenment, Dire Blade and Heart Drain.
  - **Blessings.** The skill sets of Eweca, Laceda, Falias and Luminous, plus the Class Modes Update's awakenings (Silence, Fury, Valkyrie, Demigod).
  - **Embodiment.** The Gods' Concept's demigod Embodiment (Morrighan, Macha, Neamhain, Cichol).
  - **Perks.** Those from Perks SS2 and the Skills and Perks Update.
  - **The Emporium.** Armoury, Potion Store (To do.txt's potions, Stone Tonic and Kydos Elixir included), Enchanting Room (the Enchants SS2 verbs), and the Soulstream exchange at the drifting `ssii.rate`.
  - **Inventory, controls and labels.** The inventory layout, the ASDFZXCV keys, the original's leaderboard names as legends to beat, and the "Luminous skill steps" as hit labels (Fatal, Deadly, Godly, Overkill, Annihilation, Incineration, Final Hit).
- **New:**
  - **The arena and its foes.** The climb, 60 foes with new ASCII art (`js/art/`), 16 affixes, and bosses with phases, revives and telegraphed charges.
  - **Fighting.** Intents (the foe's next move shows above it), Guard, the streak and pity systems, and Training.
  - **Ranks and badges.** Artillery 3's eight-tier rank and badge system for weapons, accessories, potions and skills.
  - **The Codex** (title menu, `X`), after Artillery 3's: pick a class, birthright, floor, skill rank and dummy (none, regular, champion, boss), then browse every skill and every weapon (6 types x 8 tiers). Each has a card with its numbers measured over 60 turns, a short note on how it plays, and a chart ranking it against the rest. Try it on a training dummy that never falls and keeps a tally (last, best, average, total, hit and crit rates). Nothing there touches your save.
  - **Around the game.** Achievements, a bestiary of foes met, and synthesised sound.
- **The look.** It is meant to feel like it is running in a terminal, as the original did. Everything is drawn in the sixteen Windows console colours (Campbell), menus are text with bracketed keys, and the title screen follows the original's layout. There are no glows, flashes, screen shakes or scenery; the art is the foes, the player and a few glyphs for each skill.
- **The balance.** It was rebuilt from the original's formulas. See [BALANCE.md](BALANCE.md) for the assessment of the original's progression, the new curves, and the simulator's results.

## Files

| | |
|---|---|
| `js/rules.js` | formulas, scaling curves, masteries, the character sheet |
| `js/skills.js`, `js/classes.js` | skills; abilities, blessings, awakenings, embodiments, perks |
| `js/items.js` | tiers and badges, weapons and accessories, enchants, potions |
| `js/enemies.js` | strata, foes, moves, affixes, the floor plan |
| `js/battle.js` | one fight, as logic that returns events |
| `js/state.js` | the save, rewards, deaths, every shop action |
| `js/term.js` | the console renderer, the arena scene, effects |
| `js/terminal.js` | the console palette; snaps every colour in the game to it |
| `js/codex.js` | the Codex and its training range |
| `js/ui.js`, `js/hub.js`, `js/fight.js` | screens: title and dialogs, the Sanctum, the arena |
| `js/art/` | ASCII art (see its README). The Emporium sword is the original's. |
| `tools/sim.mjs` | balance simulator: `node tools/sim.mjs --runs 8 --fights 800 --class eweca` |
| `tools/artcheck.mjs` | validates and previews an art file |

URL parameters for testing:

- `?seed=N` fixes the gameplay RNG.
- `?speed=N` sets the animation speed.
- `?test=FLOOR&cls=eweca[&fight=1]` makes a throwaway character built up for that floor. It is never saved and earns no achievements.
- `?codex` opens the Codex.
