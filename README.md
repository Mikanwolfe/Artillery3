

# Artillery 3

--

### Update: web rewrite

The C# / SwinGame version below no longer builds, so there is now a playable rewrite in [`web/`](web/): plain HTML canvas + vanilla JS, no build step or dependencies. The only assets are the original's: the Maven Pro font and its sounds and music (`web/sounds`, transcoded to MP3 from `Resources/sounds`; firing, hits and the charge hum are synthesised, as A3 had no samples for them).
Open `web/index.html` in a browser, or serve the folder (e.g. `python3 -m http.server -d web`).

It lifts as much as it can from A3s, in the original's world units (2400-wide terrain, 1600x900 camera, gravity 0.6, muzzle speed = charge):

- **Maps** (menu: random or pick one; `web/js/biomes.js`): A3's **Snowy Day** (lavender sky, navy ridges, pines, snow), an **Autumn Forest** (dense broadleaf woods, falling leaves, timber forts), a **Dune Sea** (smooth dunes, cacti, blowing sand) and **Alstroemeria** (a meadow of Peruvian lilies under a peach sky, drifting petals, pollen haze). Terrain is A3's midpoint displacement made rougher and deeper, with two or three massifs on top, so there is usually a ridge between you and the target.
- **Arcade damage for high shots**: a shell's blast is scaled up by how far it fell from the top of its arc, capped at +50% and scaled by the launch angle (full straight up, half at the horizon), so high-angle guns earn more of it ("altitude +N%" pops up). Fast impacts add **kinetic** damage concentrated in 40% of the blast radius. Lasers get neither. Tune `ALTITUDE_*` / `KINETIC_*` in `web/js/game.js`.
- **Snow slides and falls**: a blast on a steep face makes the loose snow around it slide downhill for a moment, and a vehicle whose ground drops away takes fall damage past a short drop (credited to whoever fired).
- **Abilities** (bought once in the shop and kept; none of them uses your turn): `1` **Double Shot** fires your next shot twice, `2` **Overcharge** lets the charge bar run 35% further, `3` **Deflector** halves damage you take until your next turn. Each is ready at the start of every round and recharges over 3-4 of your own turns after use (`cd` in `ABILITIES`, `web/js/weapons.js`); the label shows the turns left. CPUs buy and use Double Shot and Deflector.
- **Bulwark Barrier** (key `4`, late game: the second half of a match, from round 4 in infinite mode): raises a wall of plates toward where you aim that stops 80% of blast damage coming from that side (direct hits count from the side the shell arrived), until your next turn. CPUs point theirs up and toward whoever they expect fire from.
- **Smoke and soot**: every shell leaves a smoke trace that drifts with the wind and fades over a few seconds, and sheds brown soot flecks that fall away behind it; ground hits leave a faint scorch.
- **Bounties**: a kill pays the killer $250 at once, and the match leader (most round wins) carries an extra $400 bounty per win of lead, shown next to their label.
- **Characters**: G.W. Tiger, Object 15X and Innocentia, each with health + armour (armour soaks hits first) and their original starting gun.
- **The MAIA satellite** ("Maia-Class Low Orbit Ion Cannon": a round box-built body with arms curling round to the emitter and a wing of antennas on one side, turning as a whole to aim) sits above the map, gains damage every turn, and fires on wherever a satellite-enabled shell lands.
- **Satellite tiers**: MAIA is upgraded through the match (three levels spread over the rounds: 70 / 120 / 190 damage, growing radius, plus A3's +0.5 per turn within a round), and each level adds arms, wing layers and orbiting rings.
- **Repair kits**: a consumable from the shop (carry up to 3, $450). Press `R` on your turn to restore 40% of health and armour; it uses that turn's shot. CPUs buy and use them too.
- **Supply drops** (crates were on A3's design list but never built): a crate parachutes in now and then, drifting with the wind. Drive into it, or catch it in any blast, to claim it: a field repair, cash, an armour plate, or a **MAIA uplink** that makes your next shot call the satellite even with an ordinary gun. CPUs detour for crates in reach. Between rounds CPUs restock repair kits and buy a gun only when it is a clear upgrade on their best (trading in the weakest once all four slots are full). They save up, rather than settle, when something much stronger is within a round's pay (two for Hard), and only spend what they aren't saving on abilities and Health++ / Armour++ (Easy doesn't plan ahead and sometimes buys at random). Guns are ranked by `weaponValue` in `web/js/weapons.js`: damage over the whole clip and salvo, scaled by blast radius and spread, plus acid and MAIA strikes, with a little extra per rarity tier. `CRATE_CHANCE` in `web/js/game.js` sets how often they fall.
- **Economy**: prize money counts only damage that actually came off a target (no overkill, nothing past armour), with acid drip at half rate, so acid and huge shells can no longer flood the payout.
- **Weapons: rebalanced or classic** (menu). Classic is A3's numbers throughout. Rebalanced keeps every gun's original specs (clips, rounds per shot, spread, radius, range: Terminus Est is still 4×3, the B.C. 155 still holds five) and replaces the exponential prices ($1.2k to $195k) with a tiered curve ($1.2k Common to $52k Godly); damage is then fitted so a gun's worth per turn is proportional to its price (a little extra per rarity tier, less per autoloader shot), acid guns lose a further 10% because the drip comes on top, and the starting guns sit just under the cheapest Common. Health++ / Armour++ cost a flat $7.50 per point gained instead of A3's exponential curve. See `REBALANCE` in `web/js/weapons.js` and `Game.upgradeCost`.
- **Events** (menu, on by default) build up as the match goes on, reaching the full set by the last round (in infinite mode, by round 7):
  - **Forts** (`forts.js`): neutral strongholds of square blocks. Shells stop on them and vehicles can't drive through, until blasts knock the blocks out (blocks above a gap drop down).
  - **Weather fronts** (`hazards.js`, after GunBound's weather): coloured bands across the sky that form, drift with the wind, change width and break up after a few turns. Wider is stronger, and they come in levels I–III. Each map has its own set: **Force** (shells hit harder), **Storm** (shells throw lightning at whatever is nearest where they land), **Updraft / Thermal** (lifts shells), **Gale** (blows them sideways), **Blizzard** (slows them), **Rain** (damps blasts: cover from fire) and **Sandstorm** (buffets them).
  - **Hostiles** (`mobs.js`), named after A3's shelved Hatsuyuki AI project: **drones** fly up to a limited distance each turn cycle toward the nearest vehicle and bomb it if they get over it; **gunner drones** close in and fire a burst when they have a line of sight; **shore batteries** are emplacements built into the ground that lob a shell every cycle. Once a round drags on, **reinforcements** arrive every cycle and keep growing, so players who are hard to hit still get hunted. In the last round (every 5th in infinite mode) the **Mothership Shirayuki** boss arrives: it launches drones, rains bombs on the leaders and fires a heavy beam every third cycle. Everything hostile can be shot (CPUs will) and pays a bounty, the mothership a big one.
  - **Sudden death**: a few cycles into a late round, the map's hazard rises from the bottom every cycle (whiteout fog, flood water or quicksand) and hurts anything inside it at the start of its turn. CPUs head uphill.
- **Flak** (four new guns, after KanColle's anti-air legends: the Hagoita Bofors, the Akizuki battery, Maya Kai Ni and the Sanshikidan Type 3 shell): proximity-fused shells that burst near drones and other hostiles (double damage to them) or just above the ground, raining shrapnel on whatever is under them.
- **NXi**, a rival manufacturer to CLS-T (after the November Division of the United Aurora Federation: guardians of an interdimensional gate, "Built Like A Battlecruiser"): seven NXi guns from the triple-redundant Mk.I *Bulkhead* to the ARCH-7 *Battlecruiser*, the SEC-9 *Veto* point-defence flak, the INTEL-3 *Gatewatch* lance, the *Aeria Charlotte* royal battery and the Godly *Void Between Stars* rift lance, plus a fourth turret girl, **November** (heavily armoured, slow, a triple-barrel starter). NXi items and her card use an NXi look in the shop (void-navy armour plate, an aurora seam, royal gold; `--nxi-*` tokens in `web/style.css`).
- **Story** (`web/js/story.js`): two arms makers, CLS-T and NXi, hold weapons trials beside the gate, the Hatsuyuki project's drones and its carrier wake up, and MAIA keeps watch. A prologue in the menu, a dispatch at the start of every round that escalates with the events, a transmission when the boss arrives, and an epilogue naming who wins the contract.
- **Eye candy**: the turret girls lean into each shot, flinch when hit and celebrate a round win; barrels glow hot and smoke after firing, laser lenses gather light as they charge, flak rings tick along the barrel; Force fronts are beams coming down from orbit, Storm fronts throw visible lightning strikes (with a flash and thunder), and storm-charged shells arc a bright bolt to their victim.
- **Vehicle upgrades** besides A3's Health++ / Armour++: **Engine & tracks** (3 levels: +40% fuel and steeper climbs each), **Ballistic computer** (the aim guide and target marker account for wind and the guide arc runs 60% further; CPUs with one aim 30% tighter) and **Field workshop** (3 levels: repairs 5% of max armour per level at the start of each of your turns). `VEHICLE_UPGRADES` in `web/js/entities.js`.
- **Match length**: 3, 5, 7 or 10 rounds, or **∞** (infinite: play on until you press "end match" on the round-end or pause screen; MAIA reaches Level 2 at round 3 and Level 3 at round 6). Prize money grows every round, so long matches are how you reach the Mythical-to-Godly guns.
- **Save / load**: the match autosaves between rounds; the menu's **load** button (which never worked in A3) resumes it.
- **Weapons and shop**: the full A3RData roster with its names, flavour text, rarity colours (and the original shop badges: rarity + type letters such as "Cs" or "Gl" in a square outlined in the rarity colour), autoloader clips, multi-round salvos, aim dispersion, lasers and acid; four equip slots; Health++ / Armour++ on the original cost curve; everyone is paid 500 + half the round's damage (scaled up each round).
- **Camera**: proportional control (closes 1/10 of the distance per frame) following the tank, the shell and the satellite; drag to look around.
- **Aim guide** (human players): a dotted line along the barrel that fades out; hold Space and it bends into the predicted arc for the current charge (gravity only, no wind), still fading before the landing point. Tune with `AIM_LINE_LEN`, `AIM_ARC_LEN` and `AIM_GUIDE_WIND` in `web/js/game.js`.
- **Target marker** (human players): click or tap anywhere to drop a crosshair; a label over it (and a green tick on the charge bar) shows the power needed to land there at your current angle, updating as you aim, or says it's out of reach or blocked by terrain. Same physics as the aim guide (no wind unless `AIM_GUIDE_WIND`). Click your own vehicle to clear it.
- **Trees**: stands on the battlefield stop shells (they burst in the branches) and get knocked down by explosions. Driving through one knocks it over but hurts. The AI and the aim guide both account for them.
- **Vehicles sit on slopes** (now much steeper ones, and they can climb steeper too): tilt follows the average gradient under each vehicle. As in A3, elevation is measured from the hull, so every slope pitches your whole elevation range (nose-up lifts the arc, nose-down can stop you lobbing at all).
- **HUD**: player | vehicle labels with armour / health, minimap, wind marker, charge bar with last-charge tick, fuel bar.

Everything in the world is drawn as plain axis-aligned boxes that never rotate. The vehicles are **turret girls** (the original concept, after KanColle's shipgirls), drawn as slim, posed MapleStory-style sprites after the original illustrations from the first Artillery game: big glossy eyes and blush, colour-matched outlines, compact rigging: G.W. Tiger (blonde twin-tails, field grey, a gun block on her back), Object 15X (silver hair, ushanka, greatcoat, a tall armoured gun housing) and Innocentia (pink hair, sailor uniform, twin barrels and a satellite uplink mast). Each wears the player's colour, looks battered below half health and kneels in a wreck when destroyed (`web/js/girls.js`). Every weapon has its own skin on her rigging and in flight, from its stats (barrels, length, calibre, rarity band, lens / acid tank / flak rings) with signature looks for the big guns (`web/js/weaponskins.js`). Also box-built: the MAIA satellite, drones, batteries and the mothership, trees, forts, a windsock, lasers, explosions and weather.

| Command | Key |
| --- | --- |
| Move | `←` `→` (uses fuel) |
| Aim | `↑` `↓` (`Shift` = fine) |
| Charge / fire | hold `Space` / release |
| Switch weapon | `S` (before firing) |
| Repair kit | `R` (uses your turn) |
| Abilities | `1` double shot · `2` overcharge · `3` deflector |
| End turn | `Enter` |
| Look around | drag (either mouse button) |
| Target marker | click / tap |
| Mute / music / pause | `M` / `N` / `Esc` |

**CPU players** come in Easy / Normal / Hard (the default match is you against Ace (Normal), Rookie (Easy) and Sarge (Hard)). They hold grudges: a CPU goes after whoever last damaged it (a square in that player's colour by its label), even for a somewhat worse shot (`RETALIATE` in `web/js/ai.js`). The solver is a brute-force ballistic one that tries shots against the real physics and weighs the altitude / kinetic bonuses, so among shots that land it prefers high plunging lobs (Hard most, Easy least; `arc` in `DIFFICULTY`). It then adds aim error that grows with range (deadly up close, shaky across the map; tune `RANGE_ERR_BASE` / `RANGE_ERR_SCALE` in `web/js/ai.js`). Weapon dispersion adds more.
Each CPU has a fixed personality picked by name (Ace: cocky, Major: polite, Rookie: nervous, Sarge: deadpan, Byron: poet, Unit 7: robot; custom names get one at random) and reacts to what actually happened, e.g. "that was close" after a near miss or "missed me!" when someone fires wide of them. The ~450 pre-written lines live in `web/js/taunts.js`; tune how often CPUs speak with `CHATTINESS` in `web/js/game.js`.

Layout: `web/js/` — `terrain.js` (midpoint displacement + craters), `biomes.js` (maps), `forts.js`, `weapons.js` (vehicles, weapon table, rebalance, shared ballistic stepper), `weaponskins.js`, `girls.js` (turret-girl sprites), `entities.js` (vehicle, projectile, acid, laser, satellite, crates), `mobs.js` (hostiles), `hazards.js` (events, weather fronts, sudden death), `ai.js` (solver, CPU controller), `taunts.js` (banter), `story.js`, `game.js` (camera, rules, turn flow, rendering, HUD), `ui.js` (menu, character select, shop), plus `background.js`, `particles.js`, `audio.js`.
The menu shows the build: the publish workflow writes the short git hash into `web/js/version.js` (it reads "dev build" locally).
Test hooks: `?seed=N` (deterministic), `?auto=N&types=hard,normal&speed=40` (all-CPU match).

### Update: 7/08/19
This repository seems to be broken, things got lost along the way. Recently, my machine has been formatted/reset and I've lost the source code. The release still works and all the files should still be here, however, something's broken. Will update when fixed.

by mikanwolfe, 03-2019, mikanwolfe@nekox.net.

------

**Artillery 3** is a 2D physics-based shooter where players take turns controlling vehicles on a map of varying elevation. Players will be able to move their *artillery pieces* across the map and fire in large arcs towards enemy players, with the explicit goal of destroying all other players.

Artillery 3 is a complete re-write of the original Artillery 2 project found [here](https://github.com/Mikanwolfe/artillery). 

**Features:**

- Complete rewrite of the original game; significantly extends on the original combat aesthetics Artillery II provided
- Multiple Weapons per-character
- Weapons have more effects, notably Acid, Lasers, and even multi-shot weapons.
- Games don't end after one round--players can purchase additional weapons in the shop and are no longer locked to their selected characters
- Functioning Menus and UIs using OO principles.
- Sound Effects! 
- Proper introduction of backgrounds and a theme to the game -- the background is now a snowy mountainplace themed after the simple UIs within A3.
- The backgrounds are parallax -- they move at different rates based on the camera position.



**Controls:**

| Command         | Key                         |
| --------------- | --------------------------- |
| Move            | `Left, Right`               |
| Aim Weapon      | `Up, Down`                  |
| Change Weapon   | `s`                         |
| Move Camera/Pan | `Right Mouse Button` (Hold) |
| Charge Weapon   | `Spacebar` (Hold)           |
| Fire Weapon     | `Spacebar` (Release)        |

**Note:**

- Saving and Loading don't work yet, nor the options buttons. They should throw errors since they're not tied to any events at current. They're present on the menu because... design... 

------

### The goal of this project

Artillery 3 (A3) is a complete rewrite yet a successor of the Artillery Series, improving on the more interesting aspects of the game and generally expanding upon what Artillery II did well. The highlight of A3 is the polish of the game, with more weapons came some balance and a more aesthetic appearance, ditching the blue-green kiddy palette for a more refined, cooler experience. 

Artillery3 is designed to satisfy the Unit Learning Outcomes of COS20007: Object Oriented Programming, with a large number of design patterns, decisions, and mistakes-that-were-learnt from. With most of the development starting early in the unit, A3L shows that the logical method of designing OO programs isn't always the best--sure, A3L portrays the World of Artillery as a literal `world.cs`, but that doesn't make it helpful. The many branches of Artillery are the many experiments that Artillery has undergone in an effort to improve and extend on the understanding that currently exists. 

As of writing (10/06/2019), Artillery 3, in it's current form, Artillery 3s, is finished and will receive no further development but will act as a learning experience to develop from and branch off from further.



### The many branches of Artillery

* `artillery3-legacy`

Also known as A3L, the version of Artillery before the A3X revision that aimed to rewrite Artillery. Contains most of the core systems but is not very OO.

* `artillery3x`

Coined A3x, an attempt to rewrite artillery (read: rewrite, not refactor) from the ground up with a more OO-approach, notably including GameStates and what was intended to be a proper implementation of the MVC paradigm. Did not work out due to time constraints.

* `artillery3r`

Taking ideas from A3X, A3R aimed to quickly fix the Command and Command Processor systems that handled input, whilst cleaning up major aspects of code which created a more dynamic and more OO-program. The goal was to set the playing field for the Hatsuyuki Concept.

* `artillery3r-hatsuyuki`

An attempt to model and research into AI systems in an OO-fashion, dropped for two reasons: the complexity of Artillery meant that it would have been very difficult to create a functional AI; the writing of Hatsuyuki, whilst interesting, would have been nothing more than a simple state machine with high coupling due to limited technical know-how. The systems still exist in A3s, however, a lot more about Artillery3 needs to change re: the design before a proper implementation of AI can be achieved.

* `artillery3rx`

Artillery3R + ideas from Artillery 3X. This is the final branch of Artillery if it weren't for Point2Ds making a ruckus near the end which ended up being almost impossible to fix. Hence, a new branch was created as a compromise -- "Point2D is awful, but we'll have to use it anyway"

* `artillery-3s`

The final branch and current iteration of Artillery, recently merged to master via natural and alternative means. Branched from 3RX after the debacle with Vectors, contains the final implementation of all the menus and includes the new theme for Artillery alongside all the other, more polished, more modern goodies seen in A3 such as music, sound effects, and even an easter egg.

### Screenshots

**The menu:**

![menu.jpg](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/menu.jpg)

**In-game:**

![ingame playing.gif](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/gameplay.gif)

Health Animation

![healthanimation](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/animatedhealth.gif)

**In the Shop:**

Scrolling through the shop items

![wepdesc.gif](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/scrolling.gif)

Weapon Descriptions

![wepdesc.gif](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/wepdesc.gif)

Buying Weapons

![buyingweps.gif](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/buyingweps.gif)

---

### Further Development of the Artillery Concept

At current, Artillery is complete aside from minor tweaks. The game structure has become a bit rigid due to poor decisions at the start and it will take a lot more effort than I have available to achieve more meaningful goals. For now, it's completely playable.

---

## Acknowledgements

Most sounds from the Sonniss Audio Library -- Awesome shoutout to those guys for releasing a huge sound library for free! No attribution required!

"Koiken Menu" -- notably `koikenmenu.ogg` is mercilessly utilised from *Eufonie*'s *__Koiken Otome__* [translated, original title 恋剣乙女]. If there are any concerns about this, contact me in any way, shape or form to have this removed immediately!

The easter egg embedded within this game is tip-of-the-hat to _Team Salvato_, again, if there are any concerns here,  contact me in any way, shape or form to have this removed immediately!

Artillery3 runs on the SwinGame API (for better or for worse), you'll fine more information [here.](http://swingame.com/)











