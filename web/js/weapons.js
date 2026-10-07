'use strict';
// Vehicles and weapons, ported from A3's player-select screen and shop (A3RData). Numbers are the
// original ones: maxCharge is the muzzle speed in px/frame at full charge, dmgR the damage radius,
// explR the crater size, clip the autoloader (shots per turn), salvo the rounds per shot,
// disp the random velocity jitter. Names and flavour text are the original's.

const RARITY = [null,
  { word: 'Common', color: '#4682b4' }, { word: 'Uncommon', color: '#228b22' }, { word: 'Rare', color: '#ff4500' },
  { word: 'Epic', color: '#ff1493' }, { word: 'Mythical', color: '#800080' }, { word: 'Legendary', color: '#008b8b' },
  { word: 'Godly', color: '#ffffff' }];

function weapon(id, name, kind, elevMin, elevMax, o) {
  return {
    id, name, kind, elevMin, elevMax,
    clip: 1, salvo: 1, disp: 0, maxCharge: 50, dmg: 100, dmgR: 50, explR: 10, acid: 0, sat: false, rarity: 1, cost: 500,
    short: '', long: '', ...o,
  };
}

// starting vehicles: (hp, armour) and a signature gun
const VEHICLES = [
  {
    id: 'gwt', name: 'G.W. Tiger', hp: 150, armour: 100, blurb: 'A sturdy Geschützwagen girl with a two-round autoloader on her back.',
    weapon: weapon('morser', 'G.W. 150mm/78 Morser', 'shell', -20, 90, {
      dmg: 100, disp: 3.1, clip: 2, maxCharge: 50, dmgR: 50,
      short: 'Extensively field-tested, a reliable and sturdy weapon with no equal.', long: 'Starting weapon for G.W. Tiger.' }),
  },
  {
    id: 'obj', name: 'Object 15X', hp: 65, armour: 175, blurb: 'A heavily armoured Soviet girl: thin hull, one huge accurate shot.',
    weapon: weapon('d76', '190mm D-76ST 15X', 'shell', 0, 45, {
      dmg: 200, disp: 0.9, maxCharge: 40, dmgR: 75,
      short: 'An experimental adaption from CLS-T developed during the last Neko Wars.', long: 'Starting weapon for Object 15X.' }),
  },
  // NXi (the user's canon): November Division of the United Aurora Federation, "Built Like A
  // Battlecruiser": overbuilt, triple-redundant, slow, never fails. A rival to CLS-T.
  {
    id: 'nxi', name: 'November', hp: 110, armour: 200, fuel: 0.7, blurb: 'An NXi battlecruiser girl: overbuilt, slow and very hard to kill.',
    weapon: weapon('nxi0', "NXi Mk.0 'Bulkhead' 127mm Triple", 'shell', -5, 60, {
      salvo: 3, disp: 0.6, maxCharge: 55, dmg: 45, dmgR: 50, explR: 6,
      short: 'Triple-redundant: three shells where one would do. November Division standard issue.', long: 'Starting weapon for November.' }),
  },
  {
    id: 'int', name: 'Innocentia', hp: 130, armour: 130, blurb: 'The uplink girl: her twin barrels call down the MAIA satellite.',
    weapon: weapon('katis', '120mm Kati-S / Sat. Enabled.', 'shell', 0, 45, {
      dmg: 80, salvo: 2, disp: 2.1, maxCharge: 70, dmgR: 80, sat: true,
      short: 'An early prototype that utilised the MAIA Satellite System.', long: 'Starting weapon for Innocentia.' }),
  },
];

const WEAPONS = [
  weapon('howitzer', '152mm/22 Howitzer', 'shell', 0, 40, { dmg: 100, disp: 5, maxCharge: 40, dmgR: 120, explR: 20, rarity: 1, cost: 1220,
    short: 'A big gun with a short barrel; sacrifices range and accuracy for big boom.', long: 'A well-worn 152mm howitzer.' }),
  weapon('claymore', "90mm/109 LFS 'Claymore'", 'shell', -5, 40, { clip: 3, maxCharge: 50, disp: 1.5, dmg: 100, explR: 5, dmgR: 60, rarity: 1, cost: 1650,
    short: "'Designed and Manufactured by Lymilark Future Sciences' -- on the side.", long: 'A three-clip low-calibre artillery piece.' }),
  weapon('lensx2', '75mm CLS-T Lensed x2 Laser Mount', 'laser', -25, 25, { clip: 2, maxCharge: 80, disp: 0.6, dmg: 200, explR: 3, dmgR: 30, rarity: 1, cost: 1980,
    short: 'Nothing says experimental like duct tape everywhere. Even on the lens.', long: 'Like all lasers, high damage, low consistency.' }),
  weapon('lance', "122mm/90 LFS 'Long Lance'", 'shell', -5, 60, { clip: 2, maxCharge: 60, disp: 1, dmg: 150, explR: 8, dmgR: 80, rarity: 2, cost: 2650,
    short: 'An older model from the Lymilark, the Long Lance boasts excellent accuracy.', long: 'A higher-accuracy piece with surprisingly high damage.' }),
  weapon('coil', '90mm Exp. Coilgun', 'gun', -10, 40, { clip: 2, disp: 3, salvo: 4, maxCharge: 40, dmg: 80, dmgR: 55, rarity: 2, cost: 2910,
    short: 'A high-speed coilgun developed by CLS-T. Fires four rounds at once.', long: 'Less artillery gun and more machine gun.' }),
  weapon('obj261', '181mm Obj. 261', 'shell', 0, 70, { maxCharge: 90, disp: 0.5, dmg: 250, dmgR: 130, explR: 20, rarity: 2, cost: 3520,
    short: 'Retrofitted from Anti-Air to Anti-Everything. Reminds you of twintails...', long: 'Larger shell means large blast radius. Also means one shot.' }),
  weapon('type11', 'Hatsuyuki Type-11/N15', 'shell', 0, 90, { clip: 3, maxCharge: 90, disp: 0.5, dmg: 120, sat: true, dmgR: 70, explR: 10, rarity: 3, cost: 3990,
    short: 'A relic of the Hatsuyuki Project; utilises the MAIA Satellite System', long: "Flexible but doesn't do much damage." }),
  weapon('lensae', '50mm x3 Kotona Lensed-AE Rifle', 'laser', -30, 30, { clip: 3, maxCharge: 80, disp: 0.5, dmg: 200, explR: 2, dmgR: 50, rarity: 3, cost: 4520,
    short: 'Classified as an old-generation Light Firearm, found at a relic site.', long: "A relic from the an ancient Kotona empire. It's surprising it still works." }),
  weapon('type91', '122mm CLS-T Type-91', 'acid', -5, 50, { clip: 2, maxCharge: 50, disp: 2, dmg: 50, dmgR: 80, acid: 0.63, rarity: 3, cost: 5080,
    short: 'Developed during the last Neko War, fires highly acidic projectiles', long: '2-Round Acid Projectiles, otherwise, somewhat mediocre.' }),
  weapon('bc155', 'B.C. 155/58 de Canon', 'shell', -5, 80, { clip: 5, maxCharge: 70, disp: 1, dmg: 90, dmgR: 80, rarity: 3, cost: 5010,
    short: 'An experimental autoloading weapon. Packs small punches.', long: 'B.C. 155/58, a 5-Round Autoloading Artillery.' }),
  weapon('typ67', '381mm x2 CLS-T Typ. 67', 'shell', 0, 70, { salvo: 2, maxCharge: 50, disp: 2.7, dmg: 310, dmgR: 120, explR: 25, rarity: 3, cost: 5860,
    short: 'An experimental dual-gun turret designed for cute girls.', long: 'Fires two rounds, once -- big ones though.' }),
  weapon('gwt290', '290mm/64 G.W. Tiger', 'shell', -5, 90, { clip: 2, maxCharge: 100, disp: 1.5, dmg: 550, dmgR: 200, rarity: 4, cost: 8940,
    short: 'A weapon developed from the G.W. Tiger program, a deadly weapon, if it hits.', long: 'High damage, long range, and everything in-between.' }),
  weapon('cls220', "220mm/80 CLS-T 'Doki-Doki'", 'shell', 0, 60, { clip: 3, salvo: 3, maxCharge: 50, disp: 2.65, dmg: 360, dmgR: 120, explR: 17, rarity: 4, cost: 17150,
    short: 'A mix of sadness and sweetness with a tinge of searing iron.', long: 'Three by three they come! Are we missing one? Jus------' }),
  weapon('lfs75', "75mm 2x3 LFS 'Neko Paradise'", 'laser', -25, 25, { clip: 2, salvo: 3, maxCharge: 90, disp: 1, dmg: 400, explR: 5, dmgR: 55, rarity: 4, cost: 20880,
    short: 'Part of the next-generation design from the Neko Paradise Project.', long: 'Somewhat bad accuracy for a laser-weapon, but packs a cute sting.' }),
  weapon('triple', '460mm/18.1in Type 94 Triple Turrets', 'shell', -5, 90, { clip: 2, maxCharge: 120, salvo: 3, disp: 4, dmg: 550, dmgR: 160, explR: 22, rarity: 5, cost: 26360,
    short: "A miniaturised version of the Yamato's triple-turrets. For cute girls.", long: 'High damage, long range, but even worse accuracy!' }),
  weapon('laser88', "88mm x3 'Nadeko Snake' Laser Turret", 'laser', -30, 30, { clip: 2, salvo: 3, maxCharge: 100, disp: 1.55, dmg: 650, dmgR: 80, explR: 10, rarity: 5, cost: 28850,
    short: 'Twice cursed and once more, fires just as hot as the darkness near Shirahebi Shrine.', long: 'A direct hit is deadly, be careful of small-ish explosions.' }),
  weapon('laser15x', '90mm Neko-15X Laser', 'laser', -30, 30, { clip: 2, maxCharge: 100, dmg: 1150, disp: 0.25, dmgR: 90, explR: 5, sat: true, rarity: 6, cost: 39800,
    short: 'A technologically advanced laser developed from the Neko-15X project. Top Secret.', long: "'Nekomimi Cooperative' written on the plate. Cute!" }),
  weapon('acid220', "220mm 3x2 CLS-T 'KARAKARA' Acid", 'acid', 0, 60, { clip: 3, salvo: 2, maxCharge: 70, disp: 3, dmg: 250, dmgR: 100, explR: 10, acid: 2, rarity: 6, cost: 44680,
    short: 'Developed on the desolate planet KARAKARA. The cause of environmental damage: this.', long: 'Acid! Acid! Not the one that makes you high, but it kills you too!' }),
  weapon('cls770', "770mm 4x4 CLS-T 'Natsuki'", 'shell', 0, 70, { clip: 4, salvo: 4, maxCharge: 100, disp: 12, dmg: 400, dmgR: 100, explR: 25, rarity: 6, cost: 73150,
    short: 'Cute cupcakes! Sweet and fluffy, pink and purple!', long: 'Four by four equals sixteen!' }),
  weapon('horizon', "90mm 3x KTS-T 'Horizon Signal'", 'acid', 0, 60, { clip: 3, salvo: 2, maxCharge: 80, disp: 1, dmg: 450, dmgR: 100, explR: 10, acid: 8, rarity: 7, cost: 105760,
    short: 'What was; will be. A one-way-ticket to the worm-in-waiting.', long: "'Environmental Regulations'? What's that?" }),
  weapon('terminus', "810mm 4x3 KTS-T 'Terminus Est'", 'shell', -20, 90, { clip: 3, salvo: 4, maxCharge: 100, disp: 3, dmg: 1800, dmgR: 200, explR: 30, rarity: 7, cost: 121150,
    short: 'White haired and blue-eyed, named after the holy demon sword.', long: "What's with the trend of cute girls? Are there any here?" }),
  // Flak (new): proximity-fused shells that burst near drones and other mobs (double damage to them)
  // and in the air just above the ground, raining shrapnel on whatever is underneath
  weapon('flak40', "40mm 'Hagoita' Twin Bofors", 'flak', 10, 90, { clip: 3, salvo: 2, maxCharge: 70, disp: 1.5, dmg: 40, dmgR: 70, explR: 3, rarity: 1, cost: 1400,
    short: 'A twin Bofors from the Hagoita AA refit. Shoots down anything that buzzes.', long: 'Proximity-fused: bursts near drones and just above the ground.' }),
  weapon('akizuki', "10cm/65 'Akizuki' High-Angle Battery", 'flak', 10, 90, { clip: 2, salvo: 2, maxCharge: 90, disp: 1, dmg: 120, dmgR: 110, explR: 5, rarity: 3, cost: 4800,
    short: 'The pride of the Akizuki class: the finest anti-air gun ever put on a destroyer.', long: 'Airbursts over ridges and trenches. Murders drones.' }),
  weapon('maya', "127mm 'Maya Kai Ni' AA Mount", 'flak', 5, 90, { clip: 2, salvo: 3, maxCharge: 95, disp: 2, dmg: 260, dmgR: 120, explR: 6, rarity: 4, cost: 15000,
    short: 'Bakayaro! Refitted with more anti-air guns than common sense.', long: 'A barrage of airbursts; drones fall like rain.' }),
  weapon('sanshiki', "46cm 'Sanshikidan' Type 3 Shell", 'flak', 0, 80, { clip: 2, maxCharge: 110, disp: 1.5, dmg: 900, dmgR: 260, explR: 12, rarity: 6, cost: 52000,
    short: 'Incendiary shrapnel shells for the 46cm guns. Lights up the whole sky.', long: 'Enormous airbursts and a rain of burning fragments.' }),
  // NXi, November Division: the rival to CLS-T. Overbuilt and triple-verified; accurate, a little slow
  weapon('nxi105', "NXi Mk.I 'Bulkhead' 105mm", 'shell', -5, 60, { salvo: 3, disp: 0.6, maxCharge: 55, dmg: 60, dmgR: 55, explR: 7, rarity: 1, cost: 1500,
    short: 'Overbuilt, over-tested, over-documented, and proud of it.', long: 'Three shells in close formation. Every one of them inspected.' }),
  weapon('nxitv', "NXi 'Triple-Verify' 120mm Coilgun", 'gun', -10, 40, { clip: 2, salvo: 3, disp: 0.8, maxCharge: 45, dmg: 70, dmgR: 50, rarity: 2, cost: 3200,
    short: 'Every round is verified three times before it leaves the barrel.', long: "Never fires a shot it hasn't checked. Twice a turn." }),
  weapon('nxisec9', "NXi SEC-9 'Veto' Point-Defence Battery", 'flak', 10, 90, { clip: 2, salvo: 3, disp: 0.8, maxCharge: 85, dmg: 90, dmgR: 100, explR: 5, rarity: 3, cost: 4600,
    short: 'SEC-9 has veto power. Drones do not get a vote.', long: 'Proximity-fused point defence for the gate.' }),
  weapon('nxiarch7', "NXi ARCH-7 'Battlecruiser' 280mm", 'shell', -5, 70, { clip: 2, disp: 0.4, maxCharge: 70, dmg: 600, dmgR: 140, explR: 20, rarity: 4, cost: 9800,
    short: 'Built like a battlecruiser: maximum armour, maximum redundancy, maximum reliability.', long: 'Slow to load, slower to miss.' }),
  weapon('nxiintel3', "NXi INTEL-3 'Gatewatch' Lance", 'laser', -25, 30, { clip: 2, salvo: 2, disp: 0.4, maxCharge: 100, dmg: 600, dmgR: 70, explR: 6, rarity: 5, cost: 27500,
    short: 'The gate is guarded at all cost. INTEL-3 sees everything that comes through it.', long: 'Paired beams, triple-verified targeting.' }),
  weapon('nxiaeria', "NXi 'Aeria Charlotte' 406mm Royal Battery", 'shell', -5, 85, { clip: 3, salvo: 3, disp: 2, maxCharge: 110, dmg: 450, dmgR: 150, explR: 24, rarity: 6, cost: 58000,
    short: 'Commanded by Queen Aeria Charlotte herself. Every shell is worthy of royal inspection.', long: 'Three triple turrets. For the UAF.' }),
  weapon('nxivoid', "NXi November 'Void Between Stars' Rift Lance", 'laser', 0, 25, { clip: 2, maxCharge: 400, disp: 0.01, dmg: 4000, dmgR: 260, explR: 50, sat: true, rarity: 7, cost: 150000,
    short: 'Opens a rift to the void between dimensions, briefly. Do not stand in it.', long: 'We advance slowly because we advance forever.' }),
  weapon('massdriver', '210mm Kinetic Mass Driver', 'laser', 0, 20, { clip: 2, maxCharge: 1000, disp: 0.001, explR: 80, dmg: 10000, dmgR: 400, sat: true, rarity: 7, cost: 195420,
    short: 'A mysterious weapon by the Kotona Umbress, it fires entire titanium pillars.', long: 'Holding two rounds, it was salvaged from KTNS Hatsuyuki.' }),
];

// Rebalanced stats (menu: weapons "rebalanced"; "classic" keeps A3's numbers above). Every gun keeps its
// original specs (clips, rounds per shot, spread, radius, range: Terminus Est is still 4x3, the B.C.
// 155 still holds five); what changes:
//  - Prices follow a tiered curve instead of A3's exponential one ($1.2k Common to $52k Godly, not
//    $195k), so a long match can reach the top tiers.
//  - Damage is fitted so a gun's per-turn worth (weaponValue without the rarity bonus) is
//    proportional to its price: 0.165 * price * (1 + 0.1 per rarity tier), divided by 1 + 0.15 per
//    extra autoloader shot (with the aim guide every follow-up shot is an aimed one).
//  - Acid guns lose a further 10%, since the acid drip comes on top.
//  - Starting guns sit just under the cheapest Commons (worth 140-165 a turn).
const REBALANCE = {
  morser: { dmg: 130 }, d76: { dmg: 170 }, katis: { dmg: 30 }, nxi0: { dmg: 60 },
  howitzer: { dmg: 260, cost: 1200 }, claymore: { dmg: 85, cost: 1500 }, lensx2: { dmg: 225, cost: 1800 },
  lance: { dmg: 220, cost: 2500 }, coil: { dmg: 80, cost: 2900 }, obj261: { dmg: 515, cost: 3400 },
  type11: { dmg: 130, cost: 4400 }, lensae: { dmg: 335, cost: 4900 }, type91: { dmg: 515, cost: 5800 },
  bc155: { dmg: 205, cost: 5400 }, typ67: { dmg: 595, cost: 6500 }, gwt290: { dmg: 625, cost: 9000 },
  cls220: { dmg: 205, cost: 12000 }, lfs75: { dmg: 550, cost: 14000 }, triple: { dmg: 510, cost: 18000 },
  laser88: { dmg: 720, cost: 20000 }, laser15x: { dmg: 2505, cost: 25000 }, acid220: { dmg: 710, cost: 28000 },
  cls770: { dmg: 505, cost: 33000 }, horizon: { dmg: 740, cost: 40000 }, terminus: { dmg: 555, cost: 45000 },
  flak40: { dmg: 40, cost: 1600 }, akizuki: { dmg: 195, cost: 5000 }, maya: { dmg: 305, cost: 11000 },
  sanshiki: { dmg: 2115, cost: 30000 }, nxi105: { dmg: 110, cost: 1600 }, nxitv: { dmg: 105, cost: 3100 },
  nxisec9: { dmg: 135, cost: 5100 }, nxiarch7: { dmg: 740, cost: 10000 }, nxiintel3: { dmg: 1040, cost: 19000 },
  nxiaeria: { dmg: 510, cost: 30000 }, nxivoid: { dmg: 3000, cost: 48000 }, massdriver: { dmg: 2620, cost: 52000 },
};
const ALL_WEAPONS = [...WEAPONS, ...VEHICLES.map((v) => v.weapon)];
const CLASSIC = Object.fromEntries(ALL_WEAPONS.map((w) => [w.id, { dmg: w.dmg, clip: w.clip, cost: w.cost }]));
let BALANCE = 'rebalanced';

// switch the shared weapon objects between the classic and rebalanced numbers
function applyBalance(mode) {
  BALANCE = mode === 'classic' ? 'classic' : 'rebalanced';
  for (const w of ALL_WEAPONS) Object.assign(w, CLASSIC[w.id], BALANCE === 'rebalanced' ? REBALANCE[w.id] : {});
}
applyBalance(BALANCE);

// A3 shop badge: rarity initial + projectile-type initial, e.g. "Cs" (Common shell), "Gl" (Godly laser)
const KIND_LETTER = { shell: 's', gun: 'g', laser: 'l', acid: 'a', flak: 'f' };
// manufacturer, from the weapon's name: NXi (November Division) vs CLS-T and the rest
function makerOf(w) {
  if (w.id.startsWith('nxi')) return 'NXi';
  const n = w.name;
  if (n.includes('CLS-T')) return 'CLS-T';
  if (n.includes('LFS')) return 'Lymilark';
  if (n.includes('KTS-T') || n.includes('Kotona')) return 'Kotona';
  if (n.includes('G.W.')) return 'G.W.';
  if (n.includes('Hatsuyuki')) return 'Hatsuyuki';
  return '';
}

function badgeText(w) {
  return RARITY[w.rarity].word[0] + KIND_LETTER[w.kind];
}

// Abilities: bought once in the shop and kept for the match. Each is ready at the start of every
// round and, once used, recharges over `cd` of your own turns. Double Shot and Overcharge are armed
// with their key and spent on the next shot; Deflector switches on at once and lasts until your
// next turn. None of them uses up the turn.
const ABILITIES = [
  { id: 'double', key: '1', tag: 'x2', name: 'Double Shot', cost: 3000, cd: 4, desc: 'Arm, then fire: the shot is fired twice.' },
  { id: 'over', key: '2', tag: 'OVR', name: 'Overcharge', cost: 1800, cd: 3, desc: 'Arm, then charge: the bar goes 35% further, for range and kinetic damage.' },
  { id: 'shield', key: '3', tag: 'SHD', name: 'Deflector', cost: 2400, cd: 4, desc: 'Halves all damage you take until your next turn.' },
  { id: 'barrier', key: '4', tag: 'BAR', name: 'Bulwark Barrier', cost: 2600, cd: 3, late: true, desc: 'Late game: raise a wall toward where you are aiming; it blocks 80% of blast damage from that side until your next turn.' },
];
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
const OVERCHARGE = 1.35;
const SHIELD_FACTOR = 0.5;
const BARRIER_BLOCK = 0.8; // share of blast damage a Bulwark Barrier stops from its side
const BARRIER_COS = Math.cos(Math.PI * 0.3); // it covers +-54 degrees around its direction

const WEAPON_BY_ID = Object.fromEntries([...WEAPONS, ...VEHICLES.map((v) => v.weapon)].map((w) => [w.id, w]));
const MAX_WEAPONS = 4; // A3 Character._weaponCapacity

// Rough worth of a weapon per turn, used by CPUs to rank, buy and pick weapons: damage over the
// whole clip and salvo, scaled by blast radius (easier to hit with) and spread (harder), plus acid
// and MAIA strikes. Rarity adds a little on top for what this doesn't capture.
function weaponValue(w) {
  const shots = w.salvo * Math.min(w.clip, 4);
  const radius = Math.sqrt(w.dmgR / 80);
  const spread = 1 / (1 + w.disp * (w.salvo > 1 ? 0.05 : 0.12));
  const acid = w.acid * 60 * shots;
  const sat = w.sat ? 110 * Math.min(w.clip, 3) : 0;
  return (w.dmg * shots * radius * spread + acid + sat) * (1 + 0.12 * (w.rarity - 1));
}

// Advance a ballistic body by one frame. `p` = {x, y, vx, vy, age}. Returns null while flying,
// or {hit:'terrain'|'tree'|'tank'|'out', tank?}. Shared by real shots and the AI's simulations.
function stepBallistic(p, terrain, wind, tanks, owner) {
  p.vy += GRAV;
  p.vx += wind.x;
  p.vy += wind.y;
  const speed = Math.hypot(p.vx, p.vy);
  const sub = Math.max(1, Math.ceil(speed / 6));
  const sx = p.vx / sub;
  const sy = p.vy / sub;
  for (let i = 0; i < sub; i++) {
    p.x += sx;
    p.y += sy;
    if (p.x < -300 || p.x > WORLD_W + 300 || p.y > WORLD_BOTTOM + 200) return { hit: 'out' };
    if (p.x >= 0 && p.x < WORLD_W) {
      const gy = terrain.hAt(p.x);
      if (p.y >= gy) return { hit: 'terrain' };
      if (p.y > gy - TREE_MAX_H) {
        const tree = terrain.treeAt(p.x, p.y);
        if (tree) return { hit: 'tree', tree };
      }
      if (terrain.forts.length && terrain.fortAt(p.x, p.y)) return { hit: 'fort' };
    }
    for (const t of tanks) {
      if (!t.alive || (t === owner && p.age < 8)) continue;
      const hw = t.hw || TANK_W / 2 + 2; // mobs carry their own hitbox
      const hh = t.hh || TANK_H + 2;
      if (Math.abs(p.x - t.x) < hw && p.y > t.y - hh && p.y < t.y + 2) return { hit: 'tank', tank: t };
    }
  }
  p.age++;
  return null;
}

// Fire a hypothetical (dispersion-free) shot and return where it lands, how far it fell from the
// top of its arc and how fast it was going (for the altitude / kinetic damage bonuses).
function simulateShot(terrain, wind, tanks, owner, mx, my, vx, vy) {
  const p = { x: mx, y: my, vx, vy, age: 0 };
  let peak = my;
  for (let i = 0; i < 900; i++) {
    const r = stepBallistic(p, terrain, wind, tanks, owner);
    if (p.y < peak) peak = p.y;
    if (r) return { x: p.x, y: p.y, hit: r.hit, tank: r.tank || null, drop: p.y - peak, speed: Math.hypot(p.vx, p.vy) };
  }
  return { x: p.x, y: p.y, hit: 'out', tank: null, drop: 0, speed: 0 };
}

// Damage multiplier a shell gets from its altitude and kinetic bonuses (Game.shotBonus), counting
// kinetic damage only when it lands close enough to matter. Lasers get none.
// altitude bonus: grows with how far the shell fell from its apex, capped at ALTITUDE_MAX, and scaled
// by the launch angle (half at the horizon, full straight up), so higher-angle guns earn more of it
function altitudeBonus(drop, launch) {
  return Math.min(ALTITUDE_MAX, Math.max(0, drop) * ALTITUDE_RATE) * (0.5 + 0.5 * Math.max(0, Math.sin(launch)));
}

function bonusFactor(w, drop, speed, close, launch = Math.PI / 4) {
  if (w.kind === 'laser') return 1;
  const alt = altitudeBonus(drop, launch);
  const kin = close ? Math.max(0, speed - KINETIC_MIN_SPEED) * KINETIC_PER_SPEED : 0;
  return 1 + alt + kin;
}
