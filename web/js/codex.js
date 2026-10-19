'use strict';
// The Codex (menu): pick a character and a weapon, read their description, stats and a short meta
// analysis, and test fire on a training dummy in the terrain to the right of the panel. The range
// is a one-player "match": no events, no reloads or ability cooldowns, a dummy that never dies and
// keeps a tally of what it took.

// how each gun actually plays (shared with the armoury page): [verdict, note]
const GUN_NOTES = {
  morser: ['Matches', 'Two shots a turn. It has the widest elevation of any starter, −20° to 90°. It is a good all-round gun.'],
  d76: ['Matches', 'One accurate, long-range shell. The wind has little effect on it. Maximum elevation is 45°, so the shots stay flat and the altitude bonus is hard to get.'],
  nxi0: ['Matches', 'Three shells in a tight group that land as one. It has the lowest worth of the starters, but few shells miss.'],
  katis: ['Matches', 'The shells do very little damage. Each shell calls MAIA, and MAIA does the damage. It is the strongest starter per turn.'],
  howitzer: ['Matches', 'The largest blast of the Commons, at the shortest range. It is the least expensive real upgrade from a starter.'],
  claymore: ['Matches', 'Three small shots a turn. Use them to adjust your aim onto a target. Low value per credit, as expected for a three-shot, low-calibre gun.'],
  lensx2: ['Matches', 'A CLS-T drone with a 120 ceiling. It does high damage in direct fire, but it cannot hit a target behind a ridge. No altitude bonus.'],
  lance: ['Matches', 'Spread 1 and two shots a turn. It is the most reliable Uncommon.'],
  coil: ['Matches', 'A machine gun: eight rounds a turn. Spread 3, so many rounds miss at long range.'],
  obj261: ['Undersells', 'One shot, but it is a heavy shell with a 130 radius at range 90. It is the best value below ¢4,000.'],
  type11: ['Matches', 'Flexible but light. Three accurate shells, and each shell calls MAIA. Full elevation arc, 0–90°.'],
  lensae: ['Matches', 'Three accurate beams from a Kotona drone with a 150 ceiling. High damage for a Rare when the drone can see the target.'],
  type91: ['Matches', 'The acid pools continue to burn after the hit. Its damage was reduced by 10%, because the acid doubled its real damage.'],
  bc155: ['Matches', 'Five small hits a turn, as the description says. It is the lowest Rare per credit, because each autoloader shot costs value.'],
  typ67: ['Undersells', 'Two heavy shells with a 120 radius. It is the best Rare per credit.'],
  gwt290: ['Matches', 'Radius 200 and range 100. It is easy to hit with and has a long reach. It does high damage when it hits, and it usually hits.'],
  cls220: ['Matches', 'Three by three, as the description says. It was the worst outlier in the classic table. Now it is on the fit line.'],
  lfs75: ['Matches', 'Three beams, two times a turn, from a drone with a 170 ceiling. Spread 1 is loose for a laser, but the damage is useful.'],
  triple: ['Matches', 'Spread 4, as the description warns. The 160 radius makes up for most of it.'],
  laser88: ['Matches', 'Six beams a turn, with small blasts. The drone climbs to 180, so a clear line of sight is more important than a good arc.'],
  laser15x: ['Matches', 'One large beam, two times a turn, with spread 0.25. It has the highest Legendary ceiling (220). It is the best value per credit when it has a line of sight.'],
  acid220: ['Matches', 'Two-shell acid salvos, three times a turn. Strong. Its damage was reduced by 10% because of the acid.'],
  cls770: ['Oversells', 'Sixteen shells a turn, but spread 12 scatters them across a wide area. Its real damage is much less than its worth figure.'],
  horizon: ['Matches', 'The strongest acid in the game. The ground it hits stays lethal for several turns.'],
  terminus: ['Matches', 'Kept at 4×3 on purpose. It is the only intentional exception. It is still the strongest shell gun.'],
  flak40: ['Matches', 'Shoots down drones and aircraft: six small shells a turn, with double damage to drones. Weak against vehicles.'],
  akizuki: ['Matches', 'Bursts in the air above ridges and in trenches, so cover does not protect the target. The best anti-drone gun per credit.'],
  maya: ['Matches', 'Six large airbursts a turn. It destroys many drones, and the carrier also takes damage.'],
  sanshiki: ['Matches', 'One large airburst with a 260 radius and many fragments, two times a turn.'],
  nxi105: ['Matches', 'Three inspected shells in a tight group. Consistent results.'],
  nxitv: ['Matches', 'Two tight three-round bursts a turn. The short range (45) is the cost of inspecting every round.'],
  nxisec9: ['Matches', 'Point defence: flak with the tight grouping of NXi guns. It is very effective against drones.'],
  nxiarch7: ['Matches', 'Spread 0.4 with a heavy shell, two times a turn. It loads slowly, but it rarely misses.'],
  nxiintel3: ['Matches', 'Paired beams with spread 0.4 from a drone with a 200 ceiling. It is the most precise Mythical when it has a line of sight.'],
  nxiaeria: ['Matches', 'Three triple turrets: nine shells a turn, radius 150. It is the NXi equivalent of the Terminus Est.'],
  nxivoid: ['Matches', 'Lightning from a void drone (ceiling 240). The lightning jumps four times to the nearest object, and each jump does one fifth less damage. It is strong against groups. Trees and poles absorb it.'],
  lfs0: ['Matches', 'Two small seekers that go to the nearest target. Weak, but easy to hit with. Her traits make them more accurate.'],
  wren: ['Matches', 'The first rocket in the shop: two seekers a turn. Aim near the target, and the seeker does the rest.'],
  kestrel: ['Matches', 'Two pairs of seekers a turn. Consistent and light. Good against drones.'],
  dunbarton: ['Matches', 'Very low elevation. It is a flat cruise rocket that needs a gap in the terrain. Above its target, it climbs and then dives onto it.'],
  tirchonaill: ['Matches', 'Drops seven half-strength bomblets in a line. They do not seek, and the wind moves them. Fly it low over the target and let the line of bomblets hit it.'],
  emain: ['Matches', 'Splits into three seekers, two times a turn. Each seeker goes to the nearest target. If there is one target, all three hit it. If there is a group, they spread out.'],
  avalon: ['Matches', 'Ten half-strength bomblets, two times a turn. They are not guided, and the wind moves them. It is the best area denial in the game if you aim the line correctly.'],
  demigod: ['Matches', 'Flies in an arc like a rocket, stops, then charges the nearest target as a lance with ×2.5 kinetic damage. Armour still absorbs the full hit. It is lethal only after the armour is gone.'],
  kagutsuchi: ['Matches', 'Forty incendiary shells a turn with a wide spread. The blasts are small, but each fragment starts a fire on the ground.'],
  yukikaze: ['Matches', 'The warheads are weak, as the description says. The Hatsuyuki barrage does the damage: six MAIA pulses of 3.5× a warhead, two times a turn. The pulses hit the target that the rocket locked onto, wherever the rocket lands. It seeks from the top of its arc and never airbrakes. Fire it in a high arc to get ×6 kinetic damage.'],
  feuerlilie: ['Matches', 'A homing rocket that bursts like flak: shrapnel, and double damage to drones. It is the easiest anti-air gun to hit with.'],
  ichor: ['Matches', 'A Kotona lens drone on a CLS-T acid tank (170 ceiling). It fires a heavy beam that leaves a pool of acid, two times a turn.'],
  massdriver: ['Matches', 'Range 1000 and zero spread from a rail drone with the highest ceiling (260). It hits where you aim if it has a line of sight.'],
  ragnarok: ['Final', 'G.W. Tiger only. Fires a marker round for her platoon 22 km away. The platoon fires 24 rounds across the area. Then the 60cm gun fires. It makes a very large crater, and an earthquake damages everyone on the ground within 1,200.'],
  zeropoint: ['Final', 'Object 15X only. Fires a railgun probe (1,200 damage). It goes through up to 240 of ground and cover. The Naito MAIA Containment Satellite then removes the ground 520 either side of the probe, through the full depth of the world, with any bridges and radio towers on it. The beam hits everything inside it for 99999 damage, every other frame, for about a second and a half. Anything that falls in is destroyed.'],
  verdict: ['Final', 'November only. Fires a target dot. The fleet moves overhead. The lance of the flagship hits the mark (6,000). Then the fleet fires 60 laser shots (450 each) across 600 either side of the mark.'],
  constellation: ['Final', 'Innocentia only. Fires a laser dot. Many MAIAs appear in the sky. Five waves of 40 shots (320 each) hit across 650 either side of the mark. Then the beam of a very large MAIA hits the mark: 6,000.'],
  morrighan: ['Final', 'Alban Eiler only. Fires a flare. Five openings appear in the sky above the mark. 44 black rockets (600 each) come out of them and seek all targets below.'],
  zui0: ['Matches', 'Three dive bombers from her deck, two squads, then one turn to rearm. Slow and easy to predict, but a target that does not move takes every bomb.'],
  kansen0: ['Matches', 'Fighters. They attack drones and planes over the mark first, at triple damage, and then they strafe the mark. Weak against a girl, very strong against a swarm.'],
  kankou97: ['Matches', 'Torpedoes move along the ground from her side, through the mark. Moving sideways along their line does not help. A ridge in their path does.'],
  suisei: ['Matches', 'The jet successor of the Kanbaku, with a heavier bomb. It dives steeply enough to get a kinetic bonus. It is the best plane per credit below Rare.'],
  tenzan: ['Matches', 'Three torpedoes side by side. Very effective against a target in a valley.'],
  reppuu: ['Matches', 'Anti-squadron fighters: they destroy aircraft near the mark first.'],
  taillteann: ['Matches', 'Seekers from above: they still find a target that moved a short distance. It is the easiest plane to hit with.'],
  ryusei: ['Matches', 'Three very large bombs. If they hit, few targets survive.'],
  kikka: ['Matches', 'Jets. AA has half the chance to hit them and their bombs. Each jet drops two bombs.'],
  shiden: ['Matches', 'Four fighters a squad. It clears all aircraft from the sky.'],
  tifaun: ['Matches', 'One armoured jet with one bomb. It steers onto the nearest rival in its zone and explodes across 260. Move far out of the zone, or shoot it down. It has 700 health and 300 armour, and AA has half the chance to hit it.'],
  fortissimo: ['Matches', 'Level bombers. They drop a line of unguided bombs across a wide zone. The armour absorbs the first hit, whatever its size. Damage it with flak before you use the big gun.'],
  kidobutai: ['Final', 'Zuihou only. Fires a laser dot for three carriers off the coast. 21 aircraft (9 dive bombers, 6 torpedo bombers, 6 fighters) strike the mark in the same turn, then stay above it. Each later dot sends the full fleet to strike again, until they have no ammunition. She cannot launch again until this fleet is gone, so shooting it down gives you time.'],
  apollon: ['Final', 'Ikaros only. Fires a laser. An asteroid falls on the mark: 6,000 across 650. It makes a very large crater. The ground becomes lava for the rest of the round. Lava burns anyone who starts a turn in it.'],
};
const GIRL_NOTES = {
  gwt: { plays: 'The all-rounder. Her two-round autoloader makes her forgiving: a miss costs half a turn, not a full turn. She does high damage, and her gun can fire almost straight up. Her steady platform halves the spread of every gun she carries.' },
  obj: { plays: 'High damage, low protection: a thin hull behind thick, angled armour plates. Mark a target, and her designator brings every round down on it. A rough shot is enough if the arc goes near the target. Choose the right target to mark. She cannot take many hits when she misses.' },
  nxi: { plays: 'The battlecruiser. Most armour, least fuel. Choose a position for her. She has two anti-air mounts of her own, and one shot cannot kill her.' },
  alb: { plays: 'The rocketeer. Her seekers find the nearest target from a longer distance and turn more sharply than other seekers. Each rocket salvo she fires has one more rocket. Lighter hits, but few misses.' },
  ang: { plays: 'The guardian angel. Light armour, but grace saves her from one killing blow each round. Her wings make her the most mobile girl: jumps cost half, and she takes no fall damage. She can reach high ground that others cannot. Her halo lance needs a line of sight.' },
  zui: { plays: 'The light carrier. She marks a position. Her squadron flies to it and strikes it in the same turn. Then it stays above that position as a target until her next dot sends it to a new one. Her full deck gives one more plane a squad and no slower lift-fan rearm. With the Type 96 on her deck, she is difficult to bomb.' },
  int: { plays: 'The uplink. Even her starter gun calls MAIA. Her strikes are larger and are more forgiving of a near miss. Satellite guns have more value in her hands.' },
};

const RANGE_DIST = { near: 300, mid: 550, far: 850 }; // world units from the girl to the dummy
const RANGE_X = 1000; // where she stands
const DRILL_PLANE = 'suisei'; // the AA drill's target squad: three dive jets (90 health each)
const DRILL_MISSILES = 6; // and its rocket salvo

// worth on a turn the gun fires: damage over the clip and salvo, scaled by blast radius and spread,
// plus acid and MAIA (the armoury's measure). The blast radius counts as (radius / 80) to the power
// of its weight (the Codex slider; 0.5, a square root, by default): 0 ignores it, 1 is linear.
const CODEX_RADIUS_WEIGHT = 0.5;
function codexWorth(w) {
  if (w.air) return airValue(w);
  const shots = w.salvo * Math.min(w.clip, 4);
  const heads = w.split ? w.split.n : 1;
  const carpet = w.carpet ? w.carpet.n * w.carpet.frac * 0.45 : 0;
  return w.dmg * shots * (heads + carpet) * Math.pow(w.dmgR / 80, UI.codex.radiusWeight) / (1 + w.disp * (w.salvo > 1 ? 0.05 : 0.12)) + w.acid * 60 * shots + (w.sat ? 110 * Math.min(w.clip, 3) : 0);
}

// a short read on a gun: value against its tier, consistency, reach, tempo
function codexMeta(w) {
  const lines = [];
  const worth = codexWorth(w);
  if (w.sig) { // a girl's final weapon: one of a kind, and the set piece does the damage (see its notes)
    const v = VEHICLES.find((x) => x.id === w.sig);
    lines.push(['Value', `${v ? v.name : 'One girl'} only. This is her final weapon, so there are no other guns to compare it with`]);
  } else if (!w.starter) {
    const peers = WEAPONS.filter((x) => x.rarity === w.rarity && !x.sig);
    const per = (x) => codexWorth(x) / x.cost;
    const par = peers.reduce((a, x) => a + per(x), 0) / peers.length;
    const rank = peers.slice().sort((a, b) => per(b) - per(a)).indexOf(w) + 1;
    lines.push(['Value', `${(per(w) / par).toFixed(2)}× the ${RARITY[w.rarity].word} average per ¢ (#${rank} of ${peers.length})`]);
  } else lines.push(['Value', 'Free starter gun. It never reloads. Sell it for ¢' + STARTER_SELL + ' to free the slot']);
  if (w.sig) lines.push(['Per firing turn', 'See the notes below. The marker round itself does almost no damage']);
  else lines.push(['Per firing turn', `${Math.round(worth)} (${w.dmg}${w.salvo > 1 ? '×' + w.salvo : ''}${w.clip > 1 ? ', ' + w.clip + ' shots' : ''})`]);
  const R = reloadOf(w);
  if (w.air) { const S = w.air.squads || 1, P = w.fleet ? AIR_PASSES.dive : AIR_PASSES[w.air.type]; lines.push(['Tempo', `${S} squad${S > 1 ? 's' : ''} of ${w.fleet ? w.fleet.dive + w.fleet.torpedo + w.fleet.fighter : w.air.planes} (+1 from a flight deck). Each squad takes one dot a turn. A squad strikes its zone when it arrives, and again each time a later dot redirects it, for ${P} pass${P > 1 ? 'es' : ''} in total. Then it flies home and rearms for ${R} turns${w.fleet ? '' : ` (${R + vtolRearm(w)} turns if it launches straight up, without a flight deck)`}`]); }
  else if (R) lines.push(['Tempo', w.sig ? `Fires every ${R + 1} turns` : `Fires every ${R + 1} turns. Alone, it gives about ${Math.round(worth / (R + 1))} a turn. Use it in rotation with other guns`]);
  const el = Math.min(45, w.elevMax);
  const reach = (w.maxCharge * w.maxCharge * Math.sin(2 * rad(el))) / GRAV;
  lines.push(['Reach', `${Math.round(reach).toLocaleString('en-US')} units at ${el}°. The map is ${WORLD_W.toLocaleString('en-US')} units wide`]);
  const cons = w.guide ? `Seeks targets within ${w.guide.range} after the top of its arc. If there are none, it flies on as a shell. It moves from side to side and aims up to ${Math.round(w.disp * SEEKER_SPREAD)} off` : w.disp <= 0.6 ? 'Pinpoint' : w.disp <= 1.5 ? 'Tight' : w.disp <= 3 ? 'Loose' : 'Wild';
  lines.push(['Consistency', `${cons}; spread ${w.disp}, wind ${Math.round(w.drift * 100)}%`]);
  return lines;
}

// price against worth for every shop gun (log-log, like the armoury's chart), with `sel` ringed and
// labelled; the dashed line is the median fit, worth ∝ price^0.75. Dots are buttons (data-w).
const KIND_COL = { shell: '#c3b0ff', gun: '#aab0c8', laser: '#78c8ff', acid: '#8ad86a', flak: '#78d8c4', rocket: '#ff7c66', air: '#ffb84a' };
function codexChart(sel) {
  const W = 400, H = 210, L = 40, R = 10, T = 10, B = 26;
  const guns = WEAPONS.filter((w) => !w.sig).map((w) => ({ w, c: w.cost, v: codexWorth(w) })); // (final weapons are set pieces, off the scale)
  const lx = Math.log10;
  const x0 = lx(500), x1 = lx(60000), y0 = lx(Math.min(...guns.map((g) => g.v)) * 0.8), y1 = lx(Math.max(...guns.map((g) => g.v)) * 1.2);
  const X = (c) => L + ((lx(c) - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => H - B - ((lx(v) - y0) / (y1 - y0)) * (H - T - B);
  let s = '';
  for (const c of [1000, 3000, 10000, 30000]) s += `<line x1="${X(c)}" x2="${X(c)}" y1="${T}" y2="${H - B}" class="g"/><text x="${X(c)}" y="${H - 9}" text-anchor="middle">¢${c / 1000}k</text>`;
  for (const v of [100, 300, 1000, 3000, 10000]) if (lx(v) > y0 && lx(v) < y1) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${L - 5}" y="${Y(v) + 3}" text-anchor="end">${v >= 1000 ? v / 1000 + 'k' : v}</text>`;
  const ks = guns.map((g) => g.v / Math.pow(g.c, 0.75)).sort((a, b) => a - b);
  const K = ks[ks.length >> 1];
  s += `<path d="M${X(500)} ${Y(K * Math.pow(500, 0.75))}L${X(60000)} ${Y(K * Math.pow(60000, 0.75))}" class="fit"/>`;
  for (const g of guns) {
    if (g.w === sel) continue;
    s += `<rect data-w="${g.w.id}" x="${X(g.c) - 3.5}" y="${Y(g.v) - 3.5}" width="7" height="7" fill="${KIND_COL[g.w.kind]}"><title>${esc(g.w.name)}: ¢${g.c.toLocaleString('en-US')}, ${Math.round(g.v)} a firing turn</title></rect>`;
  }
  const sw = sel.starter ? { c: 500, v: codexWorth(sel) } : { c: sel.cost, v: codexWorth(sel) };
  const sx = X(sw.c), sy = Y(sw.v);
  s += `<rect x="${sx - 7}" y="${sy - 7}" width="14" height="14" fill="none" stroke="#ffffff" stroke-width="2"/><rect x="${sx - 4}" y="${sy - 4}" width="8" height="8" fill="${KIND_COL[sel.kind]}"/>`;
  const right = sx > W - 130;
  s += `<text x="${sx + (right ? -11 : 11)}" y="${sy - 8}" text-anchor="${right ? 'end' : 'start'}" class="sel">${esc(sel.name.length > 22 ? sel.name.slice(0, 21) + '…' : sel.name)}${sel.starter ? ' (starter, shown at ¢500)' : ''}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="cx-chart" role="img" aria-label="Price against worth per firing turn for every gun">${s}</svg>
    <p class="cx-legend">${Object.entries(KIND_COL).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}<span><i class="fit"></i>fit</span></p>`;
}

// ---------------------------------------------------------------- the range (game side)
Object.assign(Game.prototype, {
  startRange(vid, wid, aa) {
    const prev = this.range;
    this.setOptions({ balance: UI.opts.balance, events: false, map: UI.opts.map });
    this.range = { vid, wid, aa, dist: prev ? prev.dist : 'mid', calm: prev ? prev.calm : false, last: 0, total: 0, shots: 0, best: 0, drill: null };
    this.sfx.unlock();
    this.turnSerial = 0;
    this.report = null;
    this.awardMult = 1;
    this.satellite = new Satellite();
    const you = new Tank(0, { name: 'You', type: 'human', vehicle: vid });
    const dummy = new Tank(1, { name: 'Training dummy', type: 'dummy', vehicle: 'gwt' });
    dummy.dummy = true;
    you.weapons = [wid];
    if (aa) you.aa = you.aa.map((_, i) => (i ? null : aa)); // (the mount on test, alone)
    for (const a of ABILITIES) you.abilities[a.id] = 1; // try the abilities too
    this.tanks = [you, dummy];
    this.rounds = 0;
    this.round = 1;
    this.events = [];
    if (!this.terrain.height || !this.biome) this.newEnvironment();
    this.projectiles = []; this.drops = []; this.lasers = []; this.traces = []; this.crates = []; this.flyovers = []; this.cinematic = 0; this.slides = []; this.planes = []; this.airGroups = []; this.aaRounds = []; this.strikeResolve = false;
    this.salvo = this.satSeq = this.satTarget = null;
    this.zone = null;
    this.particles.clear();
    this.setupHazards();
    this.terrain.forts = [];
    this.terrain.bridges = [];
    this.terrain.lines = [];
    this.terrain.towers = [];
    this.terrain.giants = [];
    this.terrain.ahu = null;
    this.placeRange();
    this.setWind();
    if (this.range.calm) this.wind = { x: 0, y: 0 };
    this.windMarker = this.windDir;
    this.turnCount = 0;
    this.roundDamage = 0;
    this.order = [0];
    this.turnPtr = -1;
    this.satellite.setTier(1);
    this.satTurn(true);
    this.cam.bias = VIEW_W * 0.18; // centre the range in the space right of the Codex panel
    this.ui.showHud(true);
    $('stage').classList.add('ranging');
    this.nextTurn();
    this.cam.snap();
  },

  // fresh ground and a fresh start (the button, or when she dies out here)
  resetRange() {
    const r = this.range;
    if (!r) return;
    this.newEnvironment();
    this.startRange(r.vid, r.wid, r.aa);
  },

  // the camera frames the girl and the dummy together, in the part of the screen right of the panel
  rangeFocus() {
    const [you, dummy] = this.tanks;
    return { x: (you.x + dummy.x) / 2, y: (you.y + dummy.y) / 2 };
  },

  placeRange() {
    const [you, dummy] = this.tanks;
    const dx = RANGE_DIST[this.range.dist];
    this.terrain.flatten(RANGE_X, 16);
    this.terrain.flatten(RANGE_X + dx, 16);
    you.resetRound(RANGE_X, this.terrain);
    dummy.resetRound(RANGE_X + dx, this.terrain);
    you.facing = 1;
  },

  // AA drills: a target squad flies over her without attacking (low, as on an attack run, or high,
  // where squads hover), or a salvo of rockets comes in at her; her mount does what it can and the
  // tally shows it. The targets can't be destroyed: a plane that has taken its health counts as
  // downed and flies on.
  rangeDrill(kind) {
    const r = this.range;
    if (!r || this.phase !== 'aim') return;
    const [you, dummy] = this.tanks;
    this.planes = []; this.airGroups = []; this.aaRounds = [];
    this.aaNewTurn();
    Object.assign(r, { drill: kind, last: 0, downs: 0, sent: 0, stopped: 0, through: 0 });
    r.shots++;
    this.phase = 'resolve'; this.resolveSteps = 0; this.quiet = 0; this.salvo = null;
    this.report = { shooter: you, blasts: [], dmg: new Map(), fall: new Map(), kills: [] };
    const gy = this.terrain.hAt(you.x);
    if (kind === 'missiles') {
      const w = { ...WEAPON_BY_ID.lfs0, salvo: 1 }; // (Alban Eiler's seekers: they find her)
      for (let i = 0; i < DRILL_MISSILES; i++) {
        const x = you.x + 760 + i * 30, y = gy - 420 - (i % 2) * 40, T = 64 + i * 2;
        const p = new Projectile(this, w, dummy, x, y, (you.x - x) / T, (gy - 12 - y - 0.5 * GRAV * T * T) / T, i === 0);
        p.delay = i * 10;
        this.projectiles.push(p);
      }
      r.sent = DRILL_MISSILES;
      this.cam.follow({ x: you.x + 300, y: gy - 260 });
    } else {
      const w = WEAPON_BY_ID[DRILL_PLANE], alt = kind === 'high' ? PLANE_HOVER : 170;
      const G = this.makeGroup(dummy, w, { x: you.x, y: gy }, { deck: true, kinds: [w.air.type, w.air.type, w.air.type] });
      G.planes.forEach((p, i) => {
        p.drill = true; p.state = 'inbound'; p.delay = 0; p.passes = 0;
        p.x = you.x + 1000 + i * 80; p.y = gy - alt - (i % 2) * 24; p.snap = true;
        p.sp = p.fl.cruise; p.hd = Math.PI; p.face = -1; p.dir = -1;
        p.go({ x: you.x - 1000 - i * 80, y: p.y }, { v: p.fl.cruise, r: 60, clear: 0 }, () => { p.alive = false; });
      });
      r.sent = G.planes.length;
      this.projectiles.push({ update: () => G.planes.some((p) => p.alive), draw() {} }); // (the drill lasts while they're over the range)
      this.cam.follow({ x: you.x, y: gy - alt * 0.6 });
    }
    this.ui.codexReadout();
  },

  // a drill target took a hit: tally it, and keep it flying
  drillHit(p, amt, hit) {
    const r = this.range;
    r.last += amt; r.total += amt; r.best = Math.max(r.best, r.last);
    p.flash = 1;
    p.taken = (p.taken || 0) + amt;
    this.hitPopup(p.sx, p.sy - 26, amt, hit, p);
    if (!p.downed && p.taken >= p.maxHp) { p.downed = true; r.downs++; this.particles.text(p.sx, p.sy - 44, 'DOWNED', '#ffd84a', true); }
    this.ui.codexReadout();
  },

  // the dummy soaks everything and keeps score
  rangeHit(t, amt, hit) {
    const r = this.range;
    r.drill = null;
    r.last += amt;
    r.total += amt;
    r.best = Math.max(r.best, r.last);
    t.flash = 1;
    t.setPose('hit');
    if (hit) this.hitPopup(t.x, t.y - 46, amt, hit, t);
    else this.particles.text(t.x, t.y - 40, String(Math.round(amt)), '#c8f0a0');
    this.sfx.hit();
    this.ui.codexReadout();
  },

  endRange() {
    this.range = null;
    this.cam.bias = 0;
    this.projectiles = []; this.drops = []; this.lasers = []; this.salvo = this.satSeq = null;
    this.charging = false;
    this.phase = 'menu';
    this.tanks = [];
    this.ui.showHud(false);
    $('stage').classList.remove('ranging');
  },
});

// ---------------------------------------------------------------- the panel (UI side)
Object.assign(UI, {
  codex: { vid: 'gwt', wid: null, aa: null, filter: 'all', radiusWeight: CODEX_RADIUS_WEIGHT },

  // (re)start the range with what is picked: the gun, and the AA mount when that list is open
  codexRange() {
    const c = this.codex;
    this.game.startRange(c.vid, c.wid, c.filter === 'aa' ? c.aa : null);
    this.codexReadout();
  },

  openCodex() {
    const c = this.codex;
    if (!c.wid) c.wid = VEHICLES.find((v) => v.id === c.vid).weapon.id;
    $('menu').hidden = true;
    $('codex').hidden = false;
    this.renderCodex();
    this.codexRange();
  },

  closeCodex() {
    this.game.endRange();
    $('codex').hidden = true;
    $('menu').hidden = false;
  },

  codexReadout() {
    const r = this.game.range;
    if (!r) return;
    if (r.drill === 'missiles') { $('cx-readout').innerHTML = `<span class="mgh">Intercepted</span><b>${r.stopped}/${r.sent}</b><span class="mgh">Got through</span><b>${Math.round(r.through)}</b><span class="mgh">Drills</span><b>${r.shots}</b>`; return; }
    if (r.drill) { $('cx-readout').innerHTML = `<span class="mgh">This pass</span><b>${Math.round(r.last)}</b><span class="mgh">Downed</span><b>${r.downs}/${r.sent}</b><span class="mgh">Best</span><b>${Math.round(r.best)}</b><span class="mgh">Drills</span><b>${r.shots}</b>`; return; }
    $('cx-readout').innerHTML = `<span class="mgh">Last shot</span><b>${Math.round(r.last)}</b><span class="mgh">Best</span><b>${Math.round(r.best)}</b><span class="mgh">Total</span><b>${Math.round(r.total)}</b><span class="mgh">Shots</span><b>${r.shots}</b>`;
  },

  renderCodex() {
    const c = this.codex;
    const v = VEHICLES.find((x) => x.id === c.vid);
    // characters: a row of portraits
    $('cx-chars').innerHTML = UI.roster().map((x) => `<button class="cx-girl${x.id === c.vid ? ' on' : ''}" data-v="${x.id}" title="${esc(x.name)}"><canvas width="84" height="100" data-g="${x.id}"></canvas><span>${esc(x.name)}</span></button>`).join('');
    $('cx-chars').querySelectorAll('canvas').forEach((cv) => {
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.scale(1.3, 1.3);
      const o = { id: cv.dataset.g, x: 34, y: 74, facing: 1, color: PLAYER_COLORS[0], state: 'ok', t: 0, walking: false, flash: 0 };
      drawGirl(g, o);
      drawGirlMount(g, o);
    });
    $('cx-chars').querySelectorAll('button').forEach((b) => { b.onclick = () => { c.vid = b.dataset.v; this.renderCodex(); this.codexRange(); b.blur(); }; });
    const note = GIRL_NOTES[v.id];
    $('cx-char').innerHTML = `<p class="maker${MAKER_CLASS[v.id] || ''}">${esc(MAKERS[v.id] || '')}</p><h3>${esc(v.name)}</h3><p>${esc(v.blurb)}</p>
      <div class="cx-stats"><span class="mgh">Health</span><b>${v.hp}</b><span class="mgh">Armour</span><b>${v.armour}</b><span class="mgh">Fuel</span><b>${Math.round((v.fuel || 1) * 100)}%</b></div>
      <ul class="traits">${(v.traits || []).map((id) => `<li><b>${esc(TRAITS[id].name)}</b> ${esc(TRAITS[id].desc)}</li>`).join('')}</ul>
      ${note ? `<p class="cx-meta">${esc(note.plays)}</p>` : ''}`;
    // weapons: filter, list, then the chosen one (the AA filter lists the mounts: hers, then the shop's)
    $('cx-filter').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.f === c.filter));
    if (c.filter === 'aa') this.renderCodexAA(v);
    else {
    const list = [v.weapon, ...(v.extra || [])].concat(WEAPONS.slice().sort((a, b) => a.cost - b.cost).filter((w) => forVehicle(w, v.id))).filter((w) =>
      c.filter === 'all' || (c.filter === 'hybrid' ? w.hybrid : c.filter === 'NXi' ? makerOf(w) === 'NXi' : w.kind === c.filter));
    $('cx-list').innerHTML = list.map((w) => `<button class="cx-w${w.id === c.wid ? ' on' : ''}" data-w="${w.id}">${this.badge(w, true)}<span>${esc(w.name)}</span><small>${w.starter ? 'starter' : money(w.cost)}</small></button>`).join('');
    $('cx-list').querySelectorAll('button').forEach((b) => { b.onclick = () => { c.wid = b.dataset.w; this.renderCodex(); this.codexRange(); b.blur(); }; });
    const w = WEAPON_BY_ID[c.wid];
    const gn = GUN_NOTES[w.id];
    const maker = makerOf(w);
    $('cx-wpn').innerHTML = `<div class="cx-whead">${this.badge(w)}<div><p class="maker${maker === 'NXi' ? ' nxi' : ''}">${esc(maker || RARITY[w.rarity].word)}</p><h3 style="color:${RARITY[w.rarity].ui}">${esc(w.name)}</h3><p class="cost">${w.starter ? 'Starting gun' : money(w.cost)}</p></div></div>
      <p>${esc(w.short)} <i>${esc(w.long)}</i></p>
      <div class="stats">${this.weaponStats(w)}</div>
      <dl class="cx-dl" id="cx-wmeta"></dl>
      ${gn ? `<p class="cx-meta"><span class="chip ${gn[0]}">${gn[0]}</span> ${esc(gn[1])}</p>` : ''}
      ${w.sig || w.air ? '' : `<label class="cx-slider" title="Sets the value of blast radius. 0 ignores the radius. 0.5 (default) uses its square root. 1 uses the full radius. 1.5 gives it more weight."><span class="mgh">Blast radius weight</span><input type="range" id="cx-rw" min="0" max="1.5" step="0.05" value="${c.radiusWeight}"><b id="cx-rwv">${c.radiusWeight.toFixed(2)}</b></label>`}
      <div id="cx-wchart"></div>`;
    const worth = () => {
      $('cx-wmeta').innerHTML = codexMeta(w).map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('');
      $('cx-wchart').innerHTML = w.sig ? '' : `<p class="mgh">Price against worth per firing turn (log scale). Click a dot to select that gun.</p>${codexChart(w)}`;
      $('cx-wchart').querySelectorAll('rect[data-w]').forEach((r) => { r.onclick = () => { c.wid = r.dataset.w; this.renderCodex(); this.codexRange(); }; });
    };
    worth();
    const rw = $('cx-rw');
    if (rw) rw.oninput = () => { c.radiusWeight = +rw.value; $('cx-rwv').textContent = c.radiusWeight.toFixed(2); worth(); }; // (the meta and chart only: the slider keeps its drag)
    }
    const r = this.game.range;
    $('cx-dist').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.d === (r ? r.dist : 'mid')));
    $('cx-wind').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.w === (r && r.calm ? 'calm' : 'live')));
  },

  // the AA mounts: her own first, then the shop's; the chosen one's card, the drills to test it on
  // the range, and every mount side by side
  renderCodexAA(v) {
    const c = this.codex;
    const mounts = (v.aa || []).map((id) => AA_BY_ID[id]).filter((a) => a && a.starter).concat(AA_WEAPONS);
    if (!c.aa || !AA_BY_ID[c.aa] || (AA_BY_ID[c.aa].starter && !(v.aa || []).includes(c.aa))) c.aa = mounts[0].id;
    const tag = (a) => (a.starter ? 'hers' : money(a.cost));
    $('cx-list').innerHTML = mounts.map((a) => `<button class="cx-w${a.id === c.aa ? ' on' : ''}" data-a="${a.id}">${this.badge(a, true)}<span>${esc(a.name)}</span><small>${tag(a)}</small></button>`).join('');
    $('cx-list').querySelectorAll('button').forEach((b) => { b.onclick = () => { c.aa = b.dataset.a; this.renderCodex(); this.codexRange(); b.blur(); }; });
    const a = AA_BY_ID[c.aa], r = RARITY[a.rarity];
    const vsAir = (x) => Math.round(x.perTurn * x.dmg * (x.acc + (1 - x.acc) * AA_GRAZE));
    const rows = mounts.map((x) => `<tr class="${x.id === a.id ? 'on' : ''}"><td>${esc(x.name.replace(/^(SI|NXi|LFS|Kotona|KTS-T|G\.W\.) /, ''))}</td><td>${x.role === 'missile' ? 'PD' : 'AA'}</td><td>${x.range}</td><td>${vsAir(x)}${x.splash ? '+' : ''}</td><td>${Math.round(x.stop * 100)}%</td><td>${tag(x)}</td></tr>`).join('');
    $('cx-wpn').innerHTML = `<div class="cx-whead">${this.badge(a)}<div><p class="maker">${esc(aaMaker(a))} · ${a.role === 'missile' ? 'point defence' : 'anti-air'}</p><h3 style="color:${r.ui}">${esc(a.name)}</h3><p class="cost">${a.starter ? `${esc(v.name)}’s own` : money(a.cost)}</p></div></div>
      <p>${esc(a.short)} <i>${esc(a.long)}</i></p>
      <div class="stats">${this.weaponStats(a)}</div>
      <dl class="cx-dl"><dt>Vs aircraft</dt><dd>Up to about ${vsAir(a)} a turn: ${a.perTurn} bursts of ${a.dmg}, ${Math.round(a.acc * 100)}% chance to hit. A miss does ${Math.round(AA_GRAZE * 100)}% damage.${a.splash ? ` Each burst hits all targets within ${a.splash}.` : ''} Range ${a.range}.</dd>
      <dt>Vs missiles</dt><dd>Attacks each rocket or bomb within ${a.range}. It removes about ${Math.round(a.stop * 100)}% from a 100-damage warhead. The actual value is 0.5 to 1.5 times this. It removes less from heavier warheads and more from lighter ones. The effects of two mounts multiply. A warhead with ${Math.round(AA_SHOT_DOWN * 100)}% or less left is shot down.</dd></dl>
      <p class="mgh">Test it. Send a squad of three ${esc(shortName(WEAPON_BY_ID[DRILL_PLANE]))} (${WEAPON_BY_ID[DRILL_PLANE].air.hp} health each) over her. They do not attack. Or fire ${DRILL_MISSILES} rockets at her.</p>
      <div class="seg" id="cx-drill"><button data-k="low">Low pass</button><button data-k="high">High pass</button><button data-k="missiles">Rocket salvo</button></div>
      <table class="cx-aa"><tr><th>Mount</th><th></th><th>Range</th><th>Air/turn</th><th>Stops</th><th>¢</th></tr>${rows}</table>`;
    $('cx-drill').querySelectorAll('button').forEach((b) => { b.onclick = () => { this.game.rangeDrill(b.dataset.k); b.blur(); }; });
  },

  initCodex() {
    $('codex-open').onclick = () => this.openCodex();
    $('codex-close').onclick = () => this.closeCodex();
    $('cx-filter').querySelectorAll('button').forEach((b) => { b.onclick = () => { const was = this.codex.filter === 'aa'; this.codex.filter = b.dataset.f; this.renderCodex(); if (was !== (b.dataset.f === 'aa')) this.codexRange(); b.blur(); }; });
    $('cx-dist').querySelectorAll('button').forEach((b) => { b.onclick = () => { const g = this.game; if (g.range) { g.range.dist = b.dataset.d; this.codexRange(); } this.renderCodex(); this.codexReadout(); b.blur(); }; });
    $('cx-wind').querySelectorAll('button').forEach((b) => { b.onclick = () => { const g = this.game; if (g.range) { g.range.calm = b.dataset.w === 'calm'; this.codexRange(); } this.renderCodex(); this.codexReadout(); b.blur(); }; });
    $('cx-regen').onclick = (e) => { this.game.resetRange(); this.codexReadout(); e.currentTarget.blur(); }; // new ground, everyone back on their feet
    $('cx-reset').onclick = (e) => { const r = this.game.range; if (r) { r.last = r.total = r.best = r.shots = 0; this.codexReadout(); } e.currentTarget.blur(); };
  },
});
