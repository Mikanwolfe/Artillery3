'use strict';
// The Codex (menu): pick a character and a weapon, read their description, stats and a short meta
// analysis, and test fire on a training dummy in the terrain to the right of the panel. The range
// is a one-player "match": no events, no reloads or ability cooldowns, a dummy that never dies and
// keeps a tally of what it took.

// how each gun actually plays (shared with the armoury page): [verdict, note]
const GUN_NOTES = {
  morser: ['Matches', 'Two shots a turn and the widest elevation of any starter, −20° to 90°. A real all-rounder.'],
  d76: ['Matches', 'One accurate, long-reaching shell that shrugs off most of the wind. The 45° ceiling keeps it flat-firing, so the altitude bonus is hard to earn.'],
  nxi0: ['Matches', 'Three tight shells that land as one. Lowest worth of the starters on paper, but the tight group rarely wastes a shell.'],
  katis: ['Matches', 'The shells barely scratch; every one calls MAIA, which does the work. Still the strongest starter per turn.'],
  howitzer: ['Matches', 'Biggest blast of the Commons at the shortest range. The cheapest real step up from any starter.'],
  claymore: ['Matches', 'Three small shots to walk onto a target. Weak per dollar, as a three-clip low-calibre piece should be.'],
  lensx2: ['Matches', 'Duct-taped CLS-T drone with a 120 ceiling: brutal in direct fire, useless behind a ridge. No altitude bonus.'],
  lance: ['Matches', 'Spread 1 and two shots a turn. The most dependable Uncommon.'],
  coil: ['Matches', 'A machine gun as advertised: eight rounds a turn. Spread 3 means much of it misses at range.'],
  obj261: ['Undersells', 'One shot, but it is a heavy shell with a 130 radius at range 90. The best value below ¢4,000.'],
  type11: ['Matches', 'Flexible but light, as described: three accurate shells, each calling MAIA, with the full 0–90° arc.'],
  lensae: ['Matches', 'Three accurate beams from a Kotona relic drone with a 150 ceiling. A lot of damage for a Rare when you can see them.'],
  type91: ['Matches', 'Acid pools keep burning after the hit. Trimmed 10% because the acid used to double its real damage.'],
  bc155: ['Matches', 'Five small punches a turn, exactly as written. Lowest Rare per dollar, because each autoloader shot costs value.'],
  typ67: ['Undersells', 'Two heavy shells with a 120 radius. The best Rare per dollar.'],
  gwt290: ['Matches', 'Radius 200 and range 100: forgiving and far-reaching. Deadly if it hits, and it usually does.'],
  cls220: ['Matches', 'Three by three, as the joke says. The classic table’s worst outlier, now on the line.'],
  lfs75: ['Matches', 'Three beams twice a turn from a cat-eared drone (170 ceiling). Spread 1 is loose for a laser, still a cute sting.'],
  triple: ['Matches', 'Spread 4, as warned. The 160 radius makes up for most of it.'],
  laser88: ['Matches', 'Six beams a turn, small blasts. The snake drone climbs to 180, so it needs a clear line more than a good arc.'],
  laser15x: ['Matches', 'One huge beam twice a turn, spread 0.25, and the highest Legendary ceiling (220). Best per credit when there\'s a sightline.'],
  acid220: ['Matches', 'Two-shell acid salvos three times a turn. Strong, trimmed 10% for the acid.'],
  cls770: ['Oversells', 'Sixteen shells a turn, but spread 12 scatters them across the valley. Real hits fall well short of its worth figure.'],
  horizon: ['Matches', 'The heaviest acid in the game. Ground it hits stays lethal for turns.'],
  terminus: ['Matches', 'Kept at 4×3 on purpose, the one deliberate exception. Still the strongest shell gun.'],
  flak40: ['Matches', 'Shoots down anything that buzzes: six small shells a turn at double damage to drones. Weak against vehicles.'],
  akizuki: ['Matches', 'Airbursts over ridges and into trenches, so cover doesn’t help. The best anti-drone gun per dollar.'],
  maya: ['Matches', 'Six big airbursts a turn. Drones fall like rain, and the carrier feels it.'],
  sanshiki: ['Matches', 'One huge airburst with a 260 radius and a rain of fragments. Lights up the whole sky, twice a turn.'],
  nxi105: ['Matches', 'Three inspected shells in close formation. Steady, never exciting.'],
  nxitv: ['Matches', 'Two tight three-round bursts a turn. Short range (45) is the price of checking every round.'],
  nxisec9: ['Matches', 'Point defence: flak with NXi’s tight grouping. Drones do not get a vote.'],
  nxiarch7: ['Matches', 'Spread 0.4 with a heavy shell, twice. Slow to load, slower to miss.'],
  nxiintel3: ['Matches', 'Paired beams with spread 0.4 from a 200-ceiling drone. The most precise Mythical, if nothing is in the way.'],
  nxiaeria: ['Matches', 'Three triple turrets, nine shells a turn, radius 150. NXi’s answer to the Terminus Est.'],
  nxivoid: ['Matches', 'Lightning from a void drone (ceiling 240) that jumps four times to the nearest thing, a fifth weaker each time. Crowds hate it; trees and poles soak it.'],
  lfs0: ['Matches', 'Two little seekers that find whatever is nearest. Weak, but forgiving, and her traits make them sharper.'],
  wren: ['Matches', 'The first shop rocket: two seekers a turn. Close is good enough; the seeker does the last bit.'],
  kestrel: ['Matches', 'Two pairs of seekers a turn. Consistent, light, and happy to pick off drones.'],
  dunbarton: ['Matches', 'Barely elevates: a flat cruise rocket that needs a gap in the terrain, then pops up over its target and dives on it.'],
  tirchonaill: ['Matches', 'Drops seven half-strength bomblets in sequence. They don\'t seek and the wind throws them, so skim it low over the target and let the strip do the work.'],
  emain: ['Matches', 'Splits into three seekers that each go for the nearest target, twice a turn: one target gets all three, a crowd gets spread.'],
  avalon: ['Matches', 'Ten half-strength bomblets twice a turn. Unguided and wind-blown: the best area denial in the game, if you lay the line right.'],
  demigod: ['Matches', 'Arcs like a rocket, stops, and charges the nearest target as a lance with ×2.5 kinetic. Armour still takes the whole hit, so it is a death sentence only once armour is gone.'],
  kagutsuchi: ['Matches', 'Forty incendiary shells a turn with a wide spread. Small blasts, but every fragment leaves fire burning on the ground.'],
  yukikaze: ['Matches', 'Weak warheads, as advertised: the Hatsuyuki barrage does the damage, six MAIA pulses of 3.5× a warhead at whatever the rocket locked onto, wherever the rocket itself lands, twice a turn. It seeks from the top of its arc and never airbrakes, so a high lob dives in fast for ×6 kinetic damage.'],
  feuerlilie: ['Matches', 'A homing rocket that bursts like flak: shrapnel and double damage to drones. The easiest anti-air gun to land.'],
  ichor: ['Matches', 'A Kotona lens drone on a CLS-T acid tank (170 ceiling): a heavy beam that leaves a boiling pool, twice a turn.'],
  massdriver: ['Matches', 'Range 1000 and zero spread from a rail drone with the highest ceiling (260). Point and click, if it can see.'],
  ragnarok: ['Final', 'G.W. Tiger only. A marker round for her platoon 22 km back (four G.W. Tigers, a Karl-Gerät, and the batteries along the ridge): two dozen rounds across the area, then the 60cm: an enormous crater, and an earthquake that hits everyone on the ground within 1,000.'],
  zeropoint: ['Final', 'Object 15X only. A railgun probe (1,200). Past the fleet, the belt and Jupiter, the Naito MAIA Containment Satellite takes annihilation orders: the ground 520 either side of the probe is deleted outright, down through the world, and anything that falls in is gone.'],
  verdict: ['Final', 'November only. A target dot. The fleet takes station overhead; the flagship\'s lance comes down on the mark (6,000), then the rest of the fleet rains 60 laser shots (450 each) across 600 either side of it.'],
  constellation: ['Final', 'Innocentia only. A laser dot. MAIA opens her eye and the sky fills with MAIAs, a vast one behind them; five waves of 40 shots (320 each) hit across 650 either side of the mark, then the vast MAIA\'s beam comes down: 6,000.'],
  morrighan: ['Final', 'Alban Eiler only. A flare; the sky over the mark splits open in five vertical tears, and 44 black rockets (600 each) rain out of them on long dark trails, seeking everything beneath.'],
  zui0: ['Matches', 'Three dive bombers off her deck, two squads, then a turn to rearm. Slow and readable, but a target that sits still eats every bomb.'],
  kansen0: ['Matches', 'Fighters: they clear drones and planes over the mark at triple damage and only then strafe it. Weak against a girl, superb against a swarm.'],
  kankou97: ['Matches', 'Torpedoes run along the ground through the mark from her side: stepping sideways along their line doesn’t help, a ridge in the way does.'],
  suisei: ['Matches', 'The Kanbaku with a heavier bomb. The best plane per credit below Rare.'],
  tenzan: ['Matches', 'Three torpedoes abreast. Punishes anyone sitting in a valley.'],
  reppuu: ['Matches', 'The anti-squadron answer: anything flying near the mark dies first.'],
  taillteann: ['Matches', 'Seekers from overhead: a target that moved a little still gets found. The most forgiving plane.'],
  ryusei: ['Matches', 'Three huge bombs. If they land, little survives.'],
  kikka: ['Matches', 'Jets: AA has half the chance against them and their bombs, and each drops two.'],
  shiden: ['Matches', 'Four fighters a squad. Clears the sky of anything.'],
  tifaun: ['Matches', 'Armoured jets with guided bombs that steer onto the nearest rival within 240 of the mark. Moving out of the strike zone isn’t enough; leaving the area is.'],
  kidobutai: ['Final', 'Zuihou only. A laser dot for three carriers off the coast: 21 aircraft (9 dive bombers, 6 torpedo bombers, 6 fighters) climb away, hover over the mark and strike two of her turns later. Everyone has two turns to shoot them down or get clear.'],
  apollon: ['Final', 'Ikaros only. A laser; where it lands she reaches past the NXi fleet to an asteroid belt, marks a rock and brings it down: 6,000 across 650, in bullet time, a vast crater, and the ground melted to lava for the rest of the round (it burns anyone who starts a turn in it).'],
};
const GIRL_NOTES = {
  gwt: { plays: 'The all-rounder. A two-round autoloader makes her forgiving: a miss costs half a turn, not the whole of it. Excellent damage, a gun that lobs nearly straight up, and a steady platform that halves the spread of every gun she carries.' },
  obj: { plays: 'The glass cannon: a thin hull behind thick, angled plating. Mark a target and her designator bends every shot a little onto it, so she rewards patient, deliberate sniping; but she can’t take many hits back when she misses.' },
  nxi: { plays: 'The battlecruiser. Most armour, least fuel. Picks a spot, raises a barrier from round one, and can’t be one-shot.' },
  alb: { plays: 'The rocketeer. Her seekers find the nearest thing, rivals first, from further out and turning harder than anyone else’s. Lighter hits, few misses.' },
  ang: { plays: 'The guardian angel. Light armour, but grace saves her from one killing blow a round, and her wings make her the most mobile girl: half-price jumps and no fall damage, so she can take high ground no one else can. Her halo lance needs a line of sight.' },
  zui: { plays: 'The light carrier. She marks a spot; her squadron hovers over it for a round and strikes on her next turn, so she plays a turn ahead: mark where they will be, or where they can’t leave. A full deck (one more plane a squad, no VTOL penalty) and two AA mounts make her the best defended girl in the air.' },
  int: { plays: 'The uplink. Even the starter calls MAIA, and her strikes are bigger and forgive a near miss. Satellite guns are worth more in her hands.' },
};

const RANGE_DIST = { near: 300, mid: 550, far: 850 }; // world units from the girl to the dummy
const RANGE_X = 1000; // where she stands

// worth on a turn the gun fires: damage over the clip and salvo, scaled by blast radius and spread,
// plus acid and MAIA (the armoury's measure)
function codexWorth(w) {
  if (w.air) return airValue(w);
  const shots = w.salvo * Math.min(w.clip, 4);
  const heads = w.split ? w.split.n : 1;
  const carpet = w.carpet ? w.carpet.n * w.carpet.frac * 0.45 : 0;
  return w.dmg * shots * (heads + carpet) * Math.sqrt(w.dmgR / 80) / (1 + w.disp * (w.salvo > 1 ? 0.05 : 0.12)) + w.acid * 60 * shots + (w.sat ? 110 * Math.min(w.clip, 3) : 0);
}

// a short read on a gun: value against its tier, consistency, reach, tempo
function codexMeta(w) {
  const lines = [];
  const worth = codexWorth(w);
  if (w.sig) { // a girl's final weapon: one of a kind, and the set piece does the damage (see its notes)
    const v = VEHICLES.find((x) => x.id === w.sig);
    lines.push(['Value', `${v ? v.name : 'Her'} only: her final weapon, no peers to rank it against`]);
  } else if (!w.starter) {
    const peers = WEAPONS.filter((x) => x.rarity === w.rarity && !x.sig);
    const per = (x) => codexWorth(x) / x.cost;
    const par = peers.reduce((a, x) => a + per(x), 0) / peers.length;
    const rank = peers.slice().sort((a, b) => per(b) - per(a)).indexOf(w) + 1;
    lines.push(['Value', `${(per(w) / par).toFixed(2)}× the ${RARITY[w.rarity].word} average per ¢ (#${rank} of ${peers.length})`]);
  } else lines.push(['Value', 'Free starter, never reloads, can’t be sold']);
  if (w.sig) lines.push(['Per firing turn', 'the set piece’s, see below (the marker round itself barely scratches)']);
  else lines.push(['Per firing turn', `${Math.round(worth)} (${w.dmg}${w.salvo > 1 ? '×' + w.salvo : ''}${w.clip > 1 ? ', ' + w.clip + ' shots' : ''})`]);
  const R = reloadOf(w);
  if (w.air) lines.push(['Tempo', `${w.clip} squad${w.clip > 1 ? 's' : ''} of ${w.fleet ? w.fleet.dive + w.fleet.torpedo + w.fleet.fighter : w.air.planes} (+1 off a flight deck), then ${R} turn${R > 1 ? 's' : ''} rearming. Strikes ${w.air.delay || 1} of her turns after the dot lands`]);
  else if (R) lines.push(['Tempo', w.sig ? `Fires every ${R + 1} turns` : `Fires every ${R + 1} turns on its own, about ${Math.round(worth / (R + 1))} a turn; rotate it with other guns`]);
  const el = Math.min(45, w.elevMax);
  const reach = (w.maxCharge * w.maxCharge * Math.sin(2 * rad(el))) / GRAV;
  lines.push(['Reach', `${Math.round(reach).toLocaleString('en-US')} units at ${el}° (the map is ${WORLD_W.toLocaleString('en-US')})`]);
  const cons = w.guide ? `Seeks only what is within ${w.guide.range} once past the top of its arc (otherwise flies on as a shell), fishtails, and aims up to ${Math.round(w.disp * SEEKER_SPREAD)} off` : w.disp <= 0.6 ? 'Pinpoint' : w.disp <= 1.5 ? 'Tight' : w.disp <= 3 ? 'Loose' : 'Wild';
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
  s += `<text x="${sx + (right ? -11 : 11)}" y="${sy - 8}" text-anchor="${right ? 'end' : 'start'}" class="sel">${esc(sel.name.length > 22 ? sel.name.slice(0, 21) + '…' : sel.name)}${sel.starter ? ' (starter, at ¢500)' : ''}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="cx-chart" role="img" aria-label="Price against worth per firing turn for every gun">${s}</svg>
    <p class="cx-legend">${Object.entries(KIND_COL).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}<span><i class="fit"></i>fit</span></p>`;
}

// ---------------------------------------------------------------- the range (game side)
Object.assign(Game.prototype, {
  startRange(vid, wid) {
    const prev = this.range;
    this.setOptions({ balance: UI.opts.balance, events: false, map: UI.opts.map });
    this.range = { vid, wid, dist: prev ? prev.dist : 'mid', calm: prev ? prev.calm : false, last: 0, total: 0, shots: 0, best: 0 };
    this.sfx.unlock();
    this.turnSerial = 0;
    this.report = null;
    this.awardMult = 1;
    this.satellite = new Satellite();
    const you = new Tank(0, { name: 'You', type: 'human', vehicle: vid });
    const dummy = new Tank(1, { name: 'Training dummy', type: 'dummy', vehicle: 'gwt' });
    dummy.dummy = true;
    you.weapons = [wid];
    for (const a of ABILITIES) you.abilities[a.id] = 1; // try the abilities too
    this.tanks = [you, dummy];
    this.rounds = 0;
    this.round = 1;
    this.events = [];
    if (!this.terrain.height || !this.biome) this.newEnvironment();
    this.projectiles = []; this.drops = []; this.lasers = []; this.traces = []; this.crates = []; this.flyovers = []; this.cinematic = 0; this.slides = []; this.planes = []; this.airGroups = []; this.aaRounds = []; this.strikeResolve = false;
    this.salvo = this.satSeq = this.satTarget = null;
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
    this.startRange(r.vid, r.wid);
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

  // the dummy soaks everything and keeps score
  rangeHit(t, amt, hit) {
    const r = this.range;
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
  codex: { vid: 'gwt', wid: null, filter: 'all' },

  openCodex() {
    const c = this.codex;
    if (!c.wid) c.wid = VEHICLES.find((v) => v.id === c.vid).weapon.id;
    $('menu').hidden = true;
    $('codex').hidden = false;
    this.renderCodex();
    this.game.startRange(c.vid, c.wid);
    this.codexReadout();
  },

  closeCodex() {
    this.game.endRange();
    $('codex').hidden = true;
    $('menu').hidden = false;
  },

  codexReadout() {
    const r = this.game.range;
    if (!r) return;
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
    $('cx-chars').querySelectorAll('button').forEach((b) => { b.onclick = () => { c.vid = b.dataset.v; this.renderCodex(); this.game.startRange(c.vid, c.wid); this.codexReadout(); b.blur(); }; });
    const note = GIRL_NOTES[v.id];
    $('cx-char').innerHTML = `<p class="maker${MAKER_CLASS[v.id] || ''}">${esc(MAKERS[v.id] || '')}</p><h3>${esc(v.name)}</h3><p>${esc(v.blurb)}</p>
      <div class="cx-stats"><span class="mgh">Health</span><b>${v.hp}</b><span class="mgh">Armour</span><b>${v.armour}</b><span class="mgh">Fuel</span><b>${Math.round((v.fuel || 1) * 100)}%</b></div>
      <ul class="traits">${(v.traits || []).map((id) => `<li><b>${esc(TRAITS[id].name)}</b> ${esc(TRAITS[id].desc)}</li>`).join('')}</ul>
      ${note ? `<p class="cx-meta">${esc(note.plays)}</p>` : ''}`;
    // weapons: filter, list, then the chosen one
    const list = [v.weapon].concat(WEAPONS.slice().sort((a, b) => a.cost - b.cost).filter((w) => forVehicle(w, v.id))).filter((w) =>
      c.filter === 'all' || (c.filter === 'hybrid' ? w.hybrid : c.filter === 'NXi' ? makerOf(w) === 'NXi' : w.kind === c.filter));
    $('cx-filter').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.f === c.filter));
    $('cx-list').innerHTML = list.map((w) => `<button class="cx-w${w.id === c.wid ? ' on' : ''}" data-w="${w.id}">${this.badge(w, true)}<span>${esc(w.name)}</span><small>${w.starter ? 'starter' : money(w.cost)}</small></button>`).join('');
    $('cx-list').querySelectorAll('button').forEach((b) => { b.onclick = () => { c.wid = b.dataset.w; this.renderCodex(); this.game.startRange(c.vid, c.wid); this.codexReadout(); b.blur(); }; });
    const w = WEAPON_BY_ID[c.wid];
    const gn = GUN_NOTES[w.id];
    const maker = makerOf(w);
    $('cx-wpn').innerHTML = `<div class="cx-whead">${this.badge(w)}<div><p class="maker${maker === 'NXi' ? ' nxi' : ''}">${esc(maker || RARITY[w.rarity].word)}</p><h3 style="color:${RARITY[w.rarity].ui}">${esc(w.name)}</h3><p class="cost">${w.starter ? 'Starting gun' : money(w.cost)}</p></div></div>
      <p>${esc(w.short)} <i>${esc(w.long)}</i></p>
      <div class="stats">${this.weaponStats(w)}</div>
      <dl class="cx-dl">${codexMeta(w).map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('')}</dl>
      ${gn ? `<p class="cx-meta"><span class="chip ${gn[0]}">${gn[0]}</span> ${esc(gn[1])}</p>` : ''}
      ${w.sig ? '' : `<p class="mgh">Price against worth per firing turn (log) · click a dot</p>${codexChart(w)}`}`;
    $('cx-wpn').querySelectorAll('rect[data-w]').forEach((r) => { r.onclick = () => { c.wid = r.dataset.w; this.renderCodex(); this.game.startRange(c.vid, c.wid); this.codexReadout(); }; });
    const r = this.game.range;
    $('cx-dist').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.d === (r ? r.dist : 'mid')));
    $('cx-wind').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.w === (r && r.calm ? 'calm' : 'live')));
  },

  initCodex() {
    $('codex-open').onclick = () => this.openCodex();
    $('codex-close').onclick = () => this.closeCodex();
    $('cx-filter').querySelectorAll('button').forEach((b) => { b.onclick = () => { this.codex.filter = b.dataset.f; this.renderCodex(); b.blur(); }; });
    $('cx-dist').querySelectorAll('button').forEach((b) => { b.onclick = () => { const g = this.game; if (g.range) { g.range.dist = b.dataset.d; g.startRange(this.codex.vid, this.codex.wid); } this.renderCodex(); this.codexReadout(); b.blur(); }; });
    $('cx-wind').querySelectorAll('button').forEach((b) => { b.onclick = () => { const g = this.game; if (g.range) { g.range.calm = b.dataset.w === 'calm'; g.startRange(this.codex.vid, this.codex.wid); } this.renderCodex(); this.codexReadout(); b.blur(); }; });
    $('cx-regen').onclick = (e) => { this.game.resetRange(); this.codexReadout(); e.currentTarget.blur(); }; // new ground, everyone back on their feet
    $('cx-reset').onclick = (e) => { const r = this.game.range; if (r) { r.last = r.total = r.best = r.shots = 0; this.codexReadout(); } e.currentTarget.blur(); };
  },
});
