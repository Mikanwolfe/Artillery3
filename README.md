

# Artillery 3

--

### Update: web rewrite

The C# / SwinGame version below no longer builds, so there is now a playable rewrite in [`web/`](web/): plain HTML canvas + vanilla JS, no build step or dependencies. The assets are the original's sounds and music (`web/sounds`, transcoded to MP3 from `Resources/sounds`; firing and hits are synthesised, as A3 had no samples for them; charging is silent, and the menu hover blip and button click are the originals reversed and filtered) and Cascadia Mono (SIL OFL, `web/fonts`). The UI follows the NXi / NEKOX//NET design system's rules (one monospace face, square corners, uppercase micro-labels, hatched meters, engraved plates) in its own ink-and-lilac palette; the weapon badges keep A3's rarity colours, lifted a little to read on dark panels.
Open `web/index.html` in a browser, or serve the folder (e.g. `python3 -m http.server -d web`).

It lifts as much as it can from A3s, in the original's world units (terrain widened from A3's 2400 to 3600, 1600x900 camera, gravity 0.6, muzzle speed = charge):

- **Maps** (menu: random or pick one; `web/js/biomes.js`): A3's **Snowy Day** (lavender sky, navy ridges, pines, snow), an **Autumn Forest** (dense broadleaf woods, falling leaves, timber forts), a **Dune Sea** (smooth dunes, cacti, blowing sand) and **Alstroemeria** (a meadow of Peruvian lilies under a peach sky, drifting petals, pollen haze). Terrain is A3's midpoint displacement made rougher and deeper, with two or three massifs on top, so there is usually a ridge between you and the target.
- **Arcade damage for high shots**: a shell's blast is scaled up by how far it fell from the top of its arc, capped at +50% and scaled by the launch angle (full straight up, half at the horizon), so high-angle guns earn more of it ("altitude +N%" pops up). Fast impacts add **kinetic** damage concentrated in 40% of the blast radius. Lasers get neither. Tune `ALTITUDE_*` / `KINETIC_*` in `web/js/game.js`.
- **Snow slides and falls**: a blast on a steep face makes the loose snow around it slide downhill for a moment, and a vehicle whose ground drops away takes fall damage past a short drop (credited to whoever fired).
- **Abilities** (bought once in the shop and kept; none of them uses your turn): `1` **Double Shot** fires your next shot twice, `2` **Overcharge** lets the charge bar run 35% further, `3` **Deflector** halves damage you take until your next turn. Each is ready at the start of every round and recharges over 3-4 of your own turns after use (`cd` in `ABILITIES`, `web/js/weapons.js`); the label shows the turns left. CPUs buy and use Double Shot and Deflector.
- **Bulwark Barrier** (key `4`, late game: the second half of a match, from round 4 in infinite mode): raises a wall of plates toward where you aim that stops 80% of blast damage coming from that side (direct hits count from the side the shell arrived), until your next turn. CPUs point theirs up and toward whoever they expect fire from.
- **Smoke and soot**: every shell leaves a ragged smoke trail, laid by distance travelled with jittered puffs (so fast shells and salvos don't leave dotted lines), that drifts with the wind and fades over a few seconds, and sheds brown soot flecks that fall away behind it; ground hits leave a faint scorch.
- **Credits**: money is in credits, shown as ¢.
- **Seeded**: every match runs on a seed, shown on the pause screen; open the page with `?seed=N` to replay the first match of a session (all gameplay randomness goes through the seeded RNG; particles and banter don't).
- **Bounties**: a kill pays the killer ¢250 at once, and the match leader (most round wins) carries an extra ¢400 bounty per win of lead, shown next to their label.
- **Characters**: G.W. Tiger, Object 15X and Innocentia, each with health and armour (armour is a second bar on top of health: while any is left it absorbs a whole hit, however big) and their original starting gun.
- **The MAIA satellite** ("Maia-Class Low Orbit Ion Cannon": a round box-built body with arms curling round to the emitter and a wing of antennas on one side, turning as a whole to aim) sits above the map, gains damage every turn, and fires on wherever a satellite-enabled shell lands.
- **Satellite tiers**: MAIA is upgraded through the match (three levels spread over the rounds: 91 / 156 / 247 damage, growing radius, plus A3's +0.5 per turn within a round), and each level adds arms, wing layers and orbiting rings.
- **Repair kits**: a consumable from the shop (carry up to 2, ¢450). Press `R` on your turn to restore 70% of health and armour; it uses that turn's shot. CPUs buy and use them too.
- **Supply drops** (crates were on A3's design list but never built): a crate parachutes in now and then, drifting with the wind. Drive into it, or catch it in any blast, to claim it: a field repair, cash, an armour plate, or a **MAIA uplink** that makes your next shot call the satellite even with an ordinary gun. CPUs detour for crates in reach. Between rounds CPUs restock repair kits and buy a gun only when it is a clear upgrade on their best (trading in the weakest once all four slots are full). They save up, rather than settle, when something much stronger is within a round's pay (two for Hard), and only spend what they aren't saving on abilities and Health++ / Armour++ (Easy doesn't plan ahead and sometimes buys at random). Guns are ranked by `weaponValue` in `web/js/weapons.js`: damage over the whole clip and salvo, scaled by blast radius and spread, plus acid and MAIA strikes, with a little extra per rarity tier. `CRATE_CHANCE` in `web/js/game.js` sets how often they fall.
- **Economy**: prize money counts only damage that actually came off a target (no overkill, nothing past armour), with acid drip at half rate, so acid and huge shells can no longer flood the payout.
- **Weapons: rebalanced or classic** (menu). Classic is A3's numbers throughout. Rebalanced keeps every gun's original specs (clips, rounds per shot, spread, radius, range: Terminus Est is still 4×3, the B.C. 155 still holds five) and replaces the exponential prices (¢1.2k to ¢195k) with a tiered curve (¢700 Common to ¢52k Godly; Commons sit about 40% under it as cheap sidegrades, Uncommons about 15% under); damage is then fitted so a gun's worth per turn is proportional to its price (a little extra per rarity tier, less per autoloader shot), acid guns lose a further 10% because the drip comes on top, and the starting guns sit just under the cheapest Common. Health++ / Armour++ cost a flat ¢6 per point gained instead of A3's exponential curve. See `REBALANCE` in `web/js/weapons.js` and `Game.upgradeCost`.
  - **Reloads** (rebalanced only): after a bought gun fires, it sits out 0–3 of its owner's turns by rarity (Common 0, Uncommon and Rare 1, Epic and Mythical 2, Legendary and Godly 3). Starters never reload and can't be sold, so there is always something loaded. One gun per turn still, but a rack of guns fires a big one every turn by rotating, which is what makes a second, third and fourth gun worth buying. To pay for the turns spent reloading, damage is scaled up by tier (×1.15 for Commons and starters up to ×1.87 for Godly). CPUs buy guns that beat the one they would replace, not only their best. See `RELOAD_BY_RARITY` and `FIREPOWER_BY_RARITY`.
- **Events** (menu, on by default) build up as the match goes on, reaching the full set by the last round (in infinite mode, by round 7):
  - **Forts** (`forts.js`): neutral strongholds of square blocks. Shells stop on them and vehicles can't drive through, until blasts knock the blocks out (blocks above a gap drop down).
  - **Bridges and power lines** (`infra.js`): most maps put a bridge over the deepest valley. Vehicles drive across its deck or underneath it, between the columns; shells stop on the deck and pass between the columns. Blasts break the deck in sections (140 a segment, so a small shell only cracks it): a broken segment falls, and so does any stretch of deck left without support, i.e. further than three segments from a bank or a column; whoever was on it falls too, and the columns stay standing. A power line of three to five wooden poles runs over rolling ground: knock a pole over and the wires either side fall live, shocking anyone under them at once (30) and at the start of each of their turns (16) for six turns.
  - **Highways and radio towers, and materials that toughen** (`infra.js`): structures are timber in rounds 1–2, concrete in rounds 3–4 (×1.5 health) and steel from round 5 (×2.2), each with its own colours. From round 3 a **highway** may run along a long valley (560–900 wide): a thick elevated road on paired piers with lamp posts and a crash barrier, 220 a segment, breaking in sections like a bridge. From round 2 a **radio tower** (one, two from round 4; 280–360 tall) stands on the highest flat ground: a tapering lattice with a blinking red beacon that shells and laser beams stop on. Break a section and it and everything above topple away from the blast, crushing anything on the ground where they land (14 a section, up to 90) and felling trees.
  - **Weather fronts** (`hazards.js`, after GunBound's weather): coloured bands across the sky that form, drift with the wind, change width and break up after a few turns. Wider is stronger, and they come in levels I–III. Each map has its own set: **Force** (shells hit harder), **Storm** (shells throw lightning at whatever is nearest where they land), **Updraft / Thermal** (lifts shells), **Gale** (blows them sideways), **Blizzard** (slows them), **Rain** (damps blasts: cover from fire) and **Sandstorm** (buffets them).
  - **Hostiles** (`mobs.js`), named after A3's shelved Hatsuyuki AI project: **drones** fly up to a limited distance each turn cycle toward the nearest vehicle and bomb it if they get over it; **gunner drones** close in and fire a burst when they have a line of sight; **shore batteries** are emplacements built into the ground that lob a shell every cycle. Once a round drags on, **reinforcements** arrive every cycle and keep growing, so players who are hard to hit still get hunted. In the last round (every 5th in infinite mode) the **Mothership Shirayuki** boss arrives: it launches drones, rains bombs on the leaders and fires a heavy beam every third cycle. Everything hostile can be shot (CPUs will) and pays a bounty, the mothership a big one.
  - **Sudden death**: a few cycles into a late round, the map's hazard rises from the bottom every cycle (whiteout fog, flood water or quicksand) and hurts anything inside it at the start of its turn. CPUs head uphill.
- **Flak** (four new guns, after KanColle's anti-air legends: the Hagoita Bofors, the Akizuki battery, Maya Kai Ni and the Sanshikidan Type 3 shell): proximity-fused shells that burst near drones and other hostiles (double damage to them) or just above the ground, raining shrapnel on whatever is under them.
- **NXi**, a rival manufacturer to CLS-T (after the November Division of the United Aurora Federation: guardians of an interdimensional gate, "Built Like A Battlecruiser"): seven NXi guns from the triple-redundant Mk.I *Bulkhead* to the ARCH-7 *Battlecruiser*, the SEC-9 *Veto* point-defence flak, the INTEL-3 *Gatewatch* lance, the *Aeria Charlotte* royal battery and the Godly *Void Between Stars* rift lance, plus a fourth turret girl, **November** (heavily armoured, slow, a triple-barrel starter). NXi items and her card use an NXi look in the shop (void-navy armour plate, an aurora seam, royal gold; `--nxi-*` tokens in `web/style.css`).
- **Story** (`web/js/story.js`): two arms makers, CLS-T and NXi, hold weapons trials beside the gate, the Hatsuyuki project's drones and its carrier wake up, and MAIA keeps watch. A dispatch at the start of every round that escalates with the events, a transmission when the boss arrives, and an epilogue naming who wins the contract.
- **Eye candy**: the turret girls lean into each shot, flinch when hit and celebrate a round win; barrels glow hot and smoke after firing, laser lenses gather light as they charge, flak rings tick along the barrel; Force fronts are beams coming down from orbit, Storm fronts throw visible lightning strikes (with a flash and thunder), and storm-charged shells arc a bright bolt to their victim.
- **Vehicle upgrades** besides A3's Health++ / Armour++: **Engine & tracks** (3 levels: +40% fuel and steeper climbs each), **Ballistic computer** (the aim guide and target marker account for wind and the guide arc runs 60% further; CPUs with one aim 30% tighter) and **Field workshop** (3 levels: repairs 5% of max armour per level at the start of each of your turns). `VEHICLE_UPGRADES` in `web/js/entities.js`.
- **Match length**: 3, 5, 7 or 10 rounds, or **∞** (the default; infinite: play on until you press "end match" on the round-end or pause screen; MAIA reaches Level 2 at round 3 and Level 3 at round 6). Prize money grows every round, so long matches are how you reach the Mythical-to-Godly guns.
- **Save / load**: the match autosaves between rounds; the menu's **load** button (which never worked in A3) resumes it.
- **Weapons and shop**: the full A3RData roster with its names, flavour text, rarity colours (and the original shop badges: rarity + type letters such as "Cs" or "Gl" in a square outlined in the rarity colour), autoloader clips, multi-round salvos, aim dispersion, lasers and acid; four equip slots; Health++ / Armour++ on the original cost curve; everyone is paid a flat ¢800 (plus ¢200 for each round after the first; A3 paid 500) and the round's damage (scaled up each round).
- **Camera**: proportional control (closes 1/10 of the distance per frame) following the tank, the shell and the satellite; drag to look around.
- **Aim guide** (human players): a dotted line along the barrel that fades out; hold Space and it bends into the predicted arc for the current charge (gravity only, no wind), still fading before the landing point. Tune with `AIM_LINE_LEN`, `AIM_ARC_LEN` and `AIM_GUIDE_WIND` in `web/js/game.js`.
- **Target marker** (human players): click or tap anywhere to drop a crosshair; a label over it (and a green tick on the charge bar) shows the power needed to land there at your current angle, updating as you aim, or says it's out of reach or blocked by terrain. Same physics as the aim guide (no wind unless `AIM_GUIDE_WIND`). Click your own vehicle to clear it.
- **Trees**: stands on the battlefield stop shells (they burst in the branches) and get knocked down by explosions. Driving through one knocks it over but hurts. The AI and the aim guide both account for them.
- **Vehicles sit on slopes** (now much steeper ones, and they can climb steeper too): tilt follows the average gradient under each vehicle. As in A3, elevation is measured from the hull, so every slope pitches your whole elevation range (nose-up lifts the arc, nose-down can stop you lobbing at all).
- **Final weapons**: each girl has one end-game weapon, in a tier of their own above Godly (**Ascendant**, gold, badge "A"), ¢75,000, only in her own shop (`finals.js`). They're spectacle first and balance second. G.W. Tiger's *Ragnarök*: a marker round. The camera whips sideways a long way off the edge of the map, with speed lines, to her platoon 22 km behind the line: four G.W. Tigers drawn from the Artillery II sprite (`GW_Main.png`, scaled down to pixel art) and a Karl-Gerät 040 on its rail siding with a buffer stop, plus sixteen more batteries along the background ridge. They raise their guns and ripple-fire, two rounds a gun, the mortar last; the camera whips back as two dozen rounds come screaming in at a slant across the area (eight full 290mm rounds within 300 of the mark, sixteen half-strength ones wider), and the Karl's round lands last: an enormous blast, a shockwave and an earthquake that hits everyone on the ground within 1,000. Object 15X's *Zero Point*: a railgun probe that goes through up to 240 of ground and cover. Where it stops, the camera goes to MAIA and rushes up past the NXi fleet and the asteroid belt; the scene fades to Jupiter, vast on the left, and something stirs in the Great Red Spot. The view climbs and bleeds to red as the Naito MAIA Containment Satellite (Hatsuyuki's MAIA is their attempt at building one) slides down from above, a deck of barrels pointing down: "Annihilation orders received." It charges; cut to Jupiter from further off, a beam leaving the spot; the camera plunges back to the whole map and the ground 520 either side of the probe is simply deleted, down through the world and the background ridges too. No explosion: sheer black cliffs, molten lips, the beam thinning to mist. Anything that falls in is gone (`NaitoStrike`, `Terrain.erase`); CPUs won't drive off the edge. November's *Queen's Verdict*: a target dot for the November Division fleet. The camera rushes up through streaks of light to orbit 9,000 up, rolling over and back on the way, and comes level on the fleet in formation (escorts and frigates round the flagship, smaller darker battlecruisers in layers behind). The flagship is pixelised from the NXi battlecruiser built in Avorion; as it charges the camera closes in, the plate amidships lifts clear and light gathers under it, and the tachyon lance comes down out of its belly. The camera rides the beam down to a towering blast, then the rest of the fleet opens up: 48 laser shots rain in across 620 either side of the mark. Innocentia's *Constellation*: a laser dot, and for a moment nothing. The camera drifts up to MAIA and the eye at her core opens; in four flashes the whole sky fills with MAIAs (22 in full, 40 distant), a vast hazy one behind them all. They unfold for a Hatsuyuki barrage and charge, the camera comes down to the mark, and five waves of 40 shots hit across 650 either side of it. On the last, the vast MAIA charges and a massive beam comes down (`MaiaArray`). Alban's *Morrighan*: a signal flare that summons the war goddess over the mark (an anime angel on a cloud bank, after the reference art: long black hair, a white off-shoulder gown, gold choker and cuffs, hands clasped, great feathered black wings and a halo, with eyes that open glowing violet as she looses the volley); she looses 26 seeking arrows of light at everything in reach. Ikaros' *Apollon*: a laser. Where it lands, the camera climbs through streaks of light into the dark, slowing as it passes the NXi fleet on station, and comes out in an asteroid belt 15,000 up. It settles on one rock; a yellow outline forms round it and pulses, in silence; then the rock is flung down faster than the climb, glowing, and lands: a vast crater, a mushroom cloud, molten rock thrown out, and the ground melted to lava 640 either side for the rest of the round. Lava burns anyone who starts a turn in it (`LAVA_DMG`), and CPUs drive out of it (`AsteroidStrike`, `Terrain.melt`). The CPU's solver penalises split and carpet rockets that would hit before they transform.
- **Mushroom clouds** scale with the blast and roll: the cap is a rising vortex ring (two rolls turning up the middle and down the outside, a dome over the top), and the biggest blasts push a ring of dust along the ground.
- **Laser drones** (`lasers.js`): a laser is a drone that perches beside its girl's head and only moves up and down. She fires a laser pointer, a small marker lobbed like a shell; where it lands, the drone plays out a shot like a MAIA strike: it rises clear of her name plate, then climbs until it can see the spot (up to its ceiling, 360 for the Common to 780 for the Mass Driver, shown as a rail of ticks above her while you aim) with the camera riding it up, charges with a growing glow, the camera pans to the target, and the beam lands. Later beams in the same volley skip the wind-up. If a ridge still blocks the line at the ceiling, the beam burns into the ridge: lasers can't shoot over a ridge taller than their reach, but in direct fire they land exactly on the pointer at full strength. Whatever is in the beam's path takes it first (vehicles, drones, forts, bridge decks; trees don't stop it). Each laser has its own drone: duct-taped CLS-T box, Kotona bronze relic, cat-eared Neko Paradise, the coiled Nadeko Snake, the white Neko-15X, the Ichor's acid tank, NXi's navy Gatewatch, the Void's tesla core and the Mass Driver's twin rail. The CPU's solver traces the beam too.
- **Hatsuyuki barrage** (Yukikaze): its MAIA call opens the satellite all the way (the wings spread, a mirrored wing unfolds and two antenna masts extend) and it strikes six times at whatever the rocket was locked onto (tracking it, wherever the rocket itself lands; where it landed if it never locked), each pulse 3.5× the rocket's damage whatever MAIA's level or health, and it fires twice a turn, so the call pays from round one instead of scaling with MAIA's weak early tiers. The rocket itself seeks from the top of its arc like the other LFS rockets but never airbrakes, so it dives in fast, and its kinetic damage is ×6 (`kin` on the weapon).
- **The Void Between Stars** is now an Arc Lance: its bolt arcs from whatever it hits to the nearest other thing within 280 (vehicles, drones, MAIA, trees, power poles, crates), four times, each jump doing 80% of the last; a tree or pole in reach soaks a jump.
- **Guided rockets** (Lymilark Future Sciences, after Mabinogi): a sixth weapon type, `rocket`. The seeker wakes at the midpoint of the arc, javelin-style: once the rocket tips over the top of its climb it locks onto the nearest target in any direction, but only within its seeker's reach (280 on the Eiler pod and 310–390 on the early LFS rockets, up to 480–500 on Yukikaze and the Emain Macha, and 200–220 on the carpet rockets); with nothing in reach it carries on as a shell and keeps looking, so a rocket only corrects a near miss (early rockets turn slowly too), turning twice as hard while it dives; that is whatever is nearest in a cone ahead (a rival, a drone, or a supply crate, so crates can steal a shot), then steers at a limited turn rate for the rest of its flight (the motor only lifts while it burns), aiming above the target to allow for drop and airbraking if it is coming in too fast to make the turn, so tall lobs fall onto the target and medium shots land. The fins are a crude P controller on the turn rate (no I or D term), so a rocket swings past its line and fishtails back; each rocket has its own seeded gain, damping and buffeting, and the buffeting grows over the first 150 frames of flight. On shots a steady rocket would land, short flights still hit about 80% of the time, medium ones about 60% (and most of the rest land close), and long lobs 20–40% with misses averaging over 100 units; the CPU aims for the steady average. Rockets have a wide launch spread (3.0 on the Eiler pod, tightening to 1.0–2.0 at the top tiers), and the same spread throws the seeker off: each rocket homes on a point up to 20 units per point of spread off its target (±60 for the pod), so medium shots land in a general area. Motor burn is set by rarity (30 frames for Commons up to 74 for Godly; a rocket's own burn is a ceiling), so cheap rockets coast most of the way. Lighter damage (about 75% of a shell gun's worth for the price) but far fewer misses, and a 60% wind drift. The Dunbarton's long tube elevates only −3° to 12°, so it skims the terrain; when a target is within about 240 ahead it pops up, pulling up hard under full motor, and dives onto it from above. Later models transform in flight on a timer, so you have to lob them long or high enough to open over the target (a rocket that hits before it transforms does half damage): the Tir Chonaill and Avalon Gate start dropping bomblets one after another, each half the rocket's damage (they don't seek: they tumble and drift two and a half times as far in the wind, so a carpet is an area weapon laid by skimming the rocket over the target; a rocket that crashes mid-drop throws out the rest), the Emain Macha splits into three seekers that each go for the nearest target (so all three can land on one), and the Godly **Demigod** stops dead in mid-air, becomes a lance of light, picks the nearest target in any direction and charges it in a straight line with ×2.5 kinetic damage. The CPU's solver and the aim guide simulate the seeker too.
- **Hybrids** (two makers in one gun; a Hybrid shop filter): Hatsuyuki's *Yukikaze* Uplink Seeker (weak warheads that call MAIA; the seeker wakes 2.5 s out and then tracks very hard, so lob it), the G.W.–LFS *Feuerlilie* Seeker Flak (a homing rocket that bursts like flak, double damage to drones) and the KTS-T × CLS-T *Ichor* Acid Lance (a laser that leaves an acid pool).
- **Kagutsuchi** (CLS-T, Godly): an incendiary flak autocannon, four bursts of ten shells a turn with a wide spread and small blasts; every fragment lands burning. CLS-T's napalm.
- **MAIA can be shot**: the satellite has health (its max follows the average health plus armour of the vehicles left) and its strike damage scales with it. A blast on its core does ×1.25, the antenna wings ×1, the emitter ×0.8 and the curled side arms ×0.5. At zero it goes offline and strikes fizzle for two turns (shown on its label), then reboots at half health; it repairs 25% of its max every turn, and every round starts it fully repaired. CPUs shoot it down when a rival can call it and they can't.
- **Mushroom clouds** rise from big blasts.
- **Muzzle effects**: every round fires a flash and a burst of smoke (bigger for heavier guns), guns with a muzzle brake vent gas sideways, and barrels recoil further the heavier the gun, slamming back and running out again.
- **Alban Eiler** (Lymilark Future Sciences), a fifth girl: chestnut braid, green beret with a feather, a white knight-academy coat and a hip rocket pod; 120 health, 140 armour; starts with the 'Eiler' seeker pod. Traits: *Lymilark fire control* (her seekers see 40% further and turn 30% faster) and *Knight telemetry* (her rockets lock onto rivals before drones or crates).
- **Secret character**: finish a first game and **Ikaros** comes through the gate (the unlock is kept in the browser). An angel: pale gold hair, a floating halo, folded white wings, a white and gold dress; 130 health, 110 armour. *Wings*: her jump costs half the fuel and she glides down (no fall damage). *Grace*: once a round, a hit that would bring her down leaves her at 1 health. Her starting gun is the *'Gloria' Halo Lance*, a laser whose drone is a little winged halo. The default player name is P-Chan.
- **Traits**: each girl has two passives (`TRAITS` in `weapons.js`, shown on the character select). G.W. Tiger: *Autoloader drill* (if her first shot of a turn lands a solid hit on a rival, at least 60% of the way to dead centre, she gets the round back) and *Geschützwagen* (no fall or tree damage). Object 15X (built by KTS-T, the most advanced of the makers): *Sloped plate* (blasts from the side she faces do 20% less while she has armour) and *Laser designator* (mark a target with a click and a laser dot sits on it; it does no damage, but every shell and beam she fires veers slightly toward it, and a mark within 70 of a vehicle, drone or the satellite follows it; CPUs designate their plan's target). November: *Triple redundancy* (no single hit takes more than 40% of her max health) and *Gatekeeper* (the Bulwark Barrier from round one, at half price). Innocentia: *Priority uplink* (her MAIA strikes have a 30% bigger blast) and *MAIA re-targeting* (a strike she calls near a rival is nudged up to 70 units onto them).
- **HUD**: player | vehicle labels with an armour bar stacked on the health bar (numbers either side), minimap, wind marker, charge bar with last-charge tick, fuel bar, and the **rack** along the bottom: every gun the active vehicle carries (in hand, loaded, or reloading with a countdown and progress bar, clip pips for autoloaders) and its abilities and repair kits (ready, armed or recharging). Click a slot to pick it; S / Q cycle loaded guns.
- **Wind** is strong: a steady push several times A3's, plus, in a strong wind, air moving at up to 30 px/frame that drags a shell's horizontal speed toward its own, so shots into a headwind stall and drop short (a full headwind takes about a quarter off a 45° lob, and more off a high one) and tailwinds carry. Calm air changes nothing. Each weapon has a **drift** stat for how much the wind moves it: coilgun slugs 45%, lasers' marker shells 70%, flak 115%, acid 130%, the Mass Driver's rail pillars 15%. The aim guide ignores wind unless you have the Ballistic computer. Ambient snow, leaves and sand, smoke trails, explosion smoke and ash, and crate parachutes all ride the same wind, with gusts, so you can read it off the scene.
- **No freeze while a CPU thinks**: its aim search (a grid of simulated shots per gun and target) is a generator that runs a few milliseconds per frame during the CPU's thinking pause, instead of all at once.
- **CPUs range in like a person**: a CPU's first shot at a target misjudges the wind (a persistent error, up to 25–60% by difficulty) and aims loosely; each further shot from the same spot at the same target tightens both and makes it bolder about high lobs it wouldn't risk cold. Either side moving sideways, or the wind changing, resets it (`LEARN`, `LOB_TRUST`, `WIND_GUESS` in `ai.js`).
- **Codex** (menu): pick any character and any weapon, read their description, stats, traits and a meta analysis (value against the tier average per ¢, damage per firing turn, tempo with reloads, reach, consistency, and a verdict on how it plays, plus the armoury's price-against-worth chart of every gun with the chosen one ringed; click a dot to pick that gun), and test fire it at a training dummy on the terrain to the right of the panel. The dummy sits near, mid or far, never dies and keeps a tally (last shot, best, total); wind can be live or calm, reloads and ability cooldowns are off, and Esc goes back (`web/js/codex.js`).
- **Power hint**: until you've placed a target marker once, a small tip above the power bar says that clicking a target shows the power it needs (remembered in the browser).
- **Zoom**: the mouse wheel zooms the battlefield in and out (0.5× to 1.8×) about the centre of the view, easing to each step; the HUD stays the same size, and labels keep their place above each vehicle.
- **CPUs and structures**: before working out a shot, a CPU standing under a live wire drives out past the nearer pole, and one under a bridge or highway deck drives to the nearest open sky; its other moves (crate runs, repositioning) stop short of driving into either.
- **Getting to cover**: vehicles drive faster (2 units a frame, was A3's 1.5) and climb steeper slopes (3.2, was 2.2). **W jumps** the way you face for 30% of a full tank of fuel: about 120 units up and over, enough to clear a ridge or land on top of a fort (fort tops are ground you can stand on, and shooting the blocks out from under you drops you). CPUs jump when they get stuck against a wall. A Jump slot sits in the rack.
- **Selling** a gun refunds its full price, so trying a new one costs nothing.
- **Hostiles fire on alternate turns**: each drone, gunner, battery and the carrier attacks every other hostile turn, staggered so about half of them fire at once; a blinking red pip by an enemy's health bar means it fires next. Drones, gunners, batteries and fort blocks have half the health they used to, and battery shells do half the damage.
- **Hit popups**: damage numbers grow and heat up with accuracy (graze, glancing, solid, direct hit) and the size of the hit, punch in, and list what went into the hit: altitude bonus, kinetic, Force or Rain fronts, MAIA, traits, barrier, deflector, flak against mobs.

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

**CPU players** come in Easy / Normal / Hard (the default match is you against a Normal, an Easy and a Hard CPU, named at random from the game's inspirations: HapyMaher, Land of the Lustrous, Mabinogi, KanColle, the SCP Foundation and Stellaris, e.g. Arisu, Phos, Tarlach, Shimakaze, SCP-079; `AI_NAMES` in `web/js/ai.js`). They hold grudges: a CPU goes after whoever last damaged it (a square in that player's colour by its label), even for a somewhat worse shot (`RETALIATE` in `web/js/ai.js`). The solver is a brute-force ballistic one that tries shots against the real physics and weighs the altitude / kinetic bonuses, so among shots that land it prefers high plunging lobs (Hard most, Easy least; `arc` in `DIFFICULTY`). It then adds aim error that grows with range (deadly up close, shaky across the map; tune `RANGE_ERR_BASE` / `RANGE_ERR_SCALE` in `web/js/ai.js`). Weapon dispersion adds more.
Each CPU has a fixed personality picked by name (cocky, polite, nervous, deadpan, poet or robot, e.g. Shimakaze is cocky, Phos nervous, Tarlach a poet and SCP-079 a robot; `PERSONA_BY_NAME` in `web/js/taunts.js`; custom names get one at random) and reacts to what actually happened, e.g. "that was close" after a near miss or "missed me!" when someone fires wide of them. The ~450 pre-written lines live in `web/js/taunts.js`; tune how often CPUs speak with `CHATTINESS` in `web/js/game.js`.

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











