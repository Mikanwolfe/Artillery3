'use strict';
// Vehicles and weapons, ported from A3's player-select screen and shop (A3RData). Numbers are the
// original ones: maxCharge is the muzzle speed in px/frame at full charge, dmgR the damage radius,
// explR the crater size, clip the autoloader (shots per turn), salvo the rounds per shot,
// disp the random velocity jitter. Names and flavour text are the original's.

// color: A3's rarity colours (gun bands, shells); ui: the same hues lifted to read on the dark UI
const RARITY = [null,
  { word: 'Common', color: '#4682b4', ui: '#74aee0' }, { word: 'Uncommon', color: '#228b22', ui: '#52c45a' }, { word: 'Rare', color: '#ff4500', ui: '#ff7040' },
  { word: 'Epic', color: '#ff1493', ui: '#ff5aae' }, { word: 'Mythical', color: '#800080', ui: '#c070ff' }, { word: 'Legendary', color: '#008b8b', ui: '#30c8c8' },
  { word: 'Godly', color: '#ffffff', ui: '#ffffff' },
  { word: 'Parallel Night', color: '#ffc531', ui: '#ffd866' }]; // above Godly: each girl's final weapon

// How hard the wind pushes a weapon's shells (1 = a normal shell). Fast, dense rounds (coilgun
// slugs, the rail's titanium pillars) barely notice it; light airburst shells and acid blobs drift.
const KIND_DRIFT = { shell: 1, gun: 0.45, laser: 0.7, acid: 1.3, flak: 1.15, rocket: 0.6, air: 0.5 };

function weapon(id, name, kind, elevMin, elevMax, o) {
  return {
    id, name, kind, elevMin, elevMax,
    clip: 1, salvo: 1, disp: 0, maxCharge: 50, dmg: 100, dmgR: 50, explR: 10, acid: 0, sat: false, rarity: 1, cost: 500,
    drift: KIND_DRIFT[kind], short: '', long: '', ...o,
  };
}

// starting vehicles: (hp, armour) and a signature gun
// who built each girl: CLS-T runs the trials; KTS-T leads every other maker in tech
const MAKERS = { gwt: 'CLS-T trials', obj: 'KTS-T', nxi: 'NXi · November Division', alb: 'Lymilark Future Sciences', int: 'CLS-T trials', ang: 'From beyond the gate', zui: 'Sengoku Inc.' };
const MAKER_CLASS = { nxi: ' nxi', obj: ' kts', ang: ' ang', zui: ' sgk' };
const VEHICLES = [
  {
    id: 'gwt', name: 'G.W. Tiger', hp: 150, armour: 100, blurb: 'A sturdy Geschützwagen girl with a two-round autoloader on her back.',
    traits: ['drill', 'geschutz'],
    weapon: weapon('morser', 'G.W. 150mm/78 Morser', 'shell', -20, 90, {
      dmg: 100, disp: 1.5, clip: 2, maxCharge: 50, dmgR: 50,
      short: 'Extensively field-tested, a reliable and sturdy weapon with no equal.', long: 'Starting weapon for G.W. Tiger.' }),
  },
  {
    id: 'obj', name: 'Object 15X', hp: 65, armour: 175, blurb: 'A KTS-T girl: thin hull, thick angled plating, one huge accurate shot.',
    traits: ['sloped', 'designator'],
    weapon: weapon('d76', '190mm D-76ST 15X', 'shell', 0, 45, {
      dmg: 200, disp: 0.9, maxCharge: 58, drift: 0.75, dmgR: 75,
      short: 'A KTS-T design from the last Neko Wars, years ahead of anything CLS-T fielded.', long: 'Starting weapon for Object 15X.' }),
  },
  // NXi (the user's canon): November Division of the United Aurora Federation, "Built Like A
  // Battlecruiser": overbuilt, triple-redundant, slow, never fails. A rival to CLS-T.
  {
    id: 'nxi', name: 'November', hp: 110, armour: 200, fuel: 0.7, blurb: 'An NXi battlecruiser girl: overbuilt, slow and very hard to kill.',
    traits: ['redundancy', 'gatekeeper'],
    weapon: weapon('nxi0', "NXi Mk.0 'Bulkhead' 127mm Triple", 'shell', -5, 60, {
      salvo: 3, disp: 0.6, maxCharge: 55, dmg: 45, dmgR: 50, explR: 6,
      short: 'Triple-redundant: three shells where one would do. November Division standard issue.', long: 'Starting weapon for November.' }),
  },
  {
    id: 'int', name: 'Innocentia', hp: 130, armour: 130, blurb: 'The uplink girl: her twin barrels call down the MAIA satellite.',
    traits: ['uplink', 'retarget'],
    weapon: weapon('katis', '120mm Kati-S / Sat. Enabled.', 'shell', 0, 45, {
      dmg: 80, salvo: 2, disp: 2.1, maxCharge: 70, dmgR: 80, sat: true,
      short: 'An early prototype that utilised the MAIA Satellite System.', long: 'Starting weapon for Innocentia.' }),
  },
  // Lymilark Future Sciences (after Mabinogi): guided rockets. A knight-academy girl from the
  // Alban Eiler programme; lighter blows than a shell, but they find their way.
  {
    id: 'alb', name: 'Alban Eiler', hp: 120, armour: 140, blurb: 'The Lymilark rocketeer: her pod of seeker rockets finds whatever is nearest.',
    traits: ['firecontrol', 'telemetry'],
    weapon: weapon('lfs0', "LFS 'Eiler' 60mm Seeker Pod", 'rocket', 0, 60, {
      salvo: 2, disp: 3.0, maxCharge: 50, dmg: 50, dmgR: 45, explR: 6,
      guide: { arm: 6, burn: 50, seek: 999, apex: true, turn: 3, range: 280, cone: 75, lift: 0.5 },
      short: "'Designed and Manufactured by Lymilark Future Sciences' -- on the pod, in very small letters.", long: 'Starting weapon for Alban Eiler.' }),
  },
  // Sengoku Inc. (after KanColle's carriers): the light carrier. Her gun is a laser designator;
  // what it marks, her planes come back and hit (planes.js). Two AA mounts keep her deck clear.
  {
    id: 'zui', name: 'Zuihou', hp: 115, armour: 120, fuel: 0.9, blurb: 'A Sengoku light-carrier girl: she marks a spot, and her squadron is over it and hitting it moments later.',
    traits: ['flightdeck', 'twinaa'], aa: ['aa96'],
    // and a gun of her own for while her squadron is away
    extra: [weapon('zui1', "SI 12.7cm Twin High-Angle Gun", 'shell', -5, 80, {
      salvo: 2, disp: 1.4, maxCharge: 60, dmg: 60, dmgR: 55, explR: 7,
      short: 'The carrier’s own guns: a twin high-angle mount for when the squadron is out.', long: 'Zuihou’s second starting weapon.' })],
    weapon: weapon('zui0', "SI Type 99 Kanbaku", 'air', 0, 80, {
      maxCharge: 75, disp: 0.8, dmg: 70, dmgR: 60, explR: 9, clip: 1,
      air: { squads: 1, type: 'dive', planes: 2, ord: 1, hp: 60, reload: 2 },
      short: 'Fixed undercarriage, a lift fan in the fuselage, and the best dive-bombing crews Sengoku ever trained.', long: 'Starting weapon for Zuihou. Two squads, then a turn to rearm.' }),
  },
  // the secret girl (unlocked by finishing a first game): an angel who came through the gate
  {
    id: 'ang', name: 'Ikaros', hp: 130, armour: 110, secret: true, blurb: 'Something came through the gate on white wings. She says she is here to help, and means it.',
    traits: ['wings', 'grace'],
    weapon: weapon('gloria', "'Gloria' Halo Lance", 'laser', -20, 35, {
      ceil: 110, clip: 2, maxCharge: 55, disp: 0.6, dmg: 200, explR: 4, dmgR: 40,
      short: 'A little halo with wings that follows her about and answers when she points.', long: 'Starting weapon for Ikaros.' }),
  },
];

// Character traits: two passives per girl, so they play differently beyond stats and starter gun.
// Hooks: Game.finishShot (drill), spreadOf (geschutz), explode (sloped), designation /
// stepBallistic (designator), damage (redundancy), the shop and useAbility (gatekeeper), startSatellite /
// updateSatellite (uplink, retarget), jump / stepTanks / landed (wings), damage (grace).
const TRAITS = {
  wings: { name: 'Wings', desc: 'Her jump costs half the fuel, and she glides down: no fall damage.' },
  grace: { name: 'Grace', desc: 'Once a round, a hit that would bring her down leaves her at 1 health instead.' },
  drill: { name: 'Autoloader drill', desc: 'If her first shot of a turn lands a solid hit on a rival, she gets that round back.' },
  geschutz: { name: 'Geschützwagen', desc: 'A steady gun platform: every weapon she fires has half the spread.' },
  sloped: { name: 'Sloped plate', desc: 'While she has armour, blasts from the side she faces do 20% less.' },
  designator: { name: 'Laser designator', desc: 'A laser dot goes out ahead of every shot onto her selected target (mark it with a click); no damage, but her shells and beams veer slightly toward it.' },
  redundancy: { name: 'Triple redundancy', desc: 'No single hit takes more than 40% of her max health.' },
  gatekeeper: { name: 'Gatekeeper', desc: 'The Bulwark Barrier is hers from round one, at half price.' },
  uplink: { name: 'Priority uplink', desc: 'MAIA strikes she calls have a 30% bigger blast.' },
  retarget: { name: 'MAIA re-targeting', desc: 'If her shot lands near a rival, MAIA nudges its aim onto them.' },
  firecontrol: { name: 'Lymilark fire control', desc: 'Her rockets’ seekers see 40% further and turn 30% faster.' },
  telemetry: { name: 'Knight telemetry', desc: 'Her rockets lock onto rivals before drones or crates, when one is in sight.' },
  flightdeck: { name: 'Flight deck', desc: 'Her planes take off from her deck, not straight up: no VTOL penalty, and one more plane in every squad.' },
  twinaa: { name: 'Twin AA mounts', desc: 'Two air-defence slots instead of one, for two different mounts. The second is empty in round one.' },
};
const hasTrait = (t, id) => !!(t && t.vehicle && t.vehicle.traits && t.vehicle.traits.includes(id));
// a gun's spread in her hands (G.W. Tiger's Geschützwagen halves it)
const spreadOf = (w, t) => (w.disp || 0) * (hasTrait(t, 'geschutz') ? 0.5 : 1);
const GATEKEEPER_DISCOUNT = 0.5;
// a shooter's seeker settings: Alban Eiler's fire control extends and sharpens them, her telemetry
// prefers rivals over drones and crates
// rocket fuel: frames of motor by rarity (a rocket's own burn is a ceiling); better rockets fly further
const ROCKET_BURN = [30, 30, 36, 42, 50, 58, 66, 74, 80];
function guideFor(w, owner) {
  if (!w.guide) return null;
  if (w.guide.tumble) return w.guide;
  const G = { ...w.guide, burn: Math.min(w.guide.burn, ROCKET_BURN[w.rarity] || 30) };
  if (hasTrait(owner, 'firecontrol')) { G.range *= 1.4; G.turn *= 1.3; }
  return G;
}
function preferFor(owner) { return hasTrait(owner, 'telemetry') ? 'rival' : null; }
const DRILL_QUALITY = 0.6; // a 'solid' hit or better (see HIT_TIERS) earns the drill's round back
const RETARGET_RANGE = 160; // how far from the mark MAIA looks for a rival
const RETARGET_SHIFT = 70; // and how far it will move its aim

const WEAPONS = [
  weapon('howitzer', '152mm/22 Howitzer', 'shell', 0, 40, { dmg: 100, disp: 5, maxCharge: 40, dmgR: 120, explR: 20, rarity: 1, cost: 1220,
    short: 'A big gun with a short barrel; sacrifices range and accuracy for big boom.', long: 'A well-worn 152mm howitzer.' }),
  weapon('claymore', "90mm/109 LFS 'Claymore'", 'shell', -5, 40, { clip: 3, maxCharge: 50, disp: 1.5, dmg: 100, explR: 5, dmgR: 60, rarity: 1, cost: 1650,
    short: "'Designed and Manufactured by Lymilark Future Sciences' -- on the side.", long: 'A three-clip low-calibre artillery piece.' }),
  weapon('lensx2', '75mm CLS-T Lensed x2 Laser Mount', 'laser', -25, 25, { ceil: 120, clip: 2, maxCharge: 80, disp: 0.6, dmg: 200, explR: 3, dmgR: 30, rarity: 1, cost: 1980,
    short: 'Nothing says experimental like duct tape everywhere. Even on the lens.', long: 'Like all lasers, high damage, low consistency.' }),
  weapon('lance', "122mm/90 LFS 'Long Lance'", 'shell', -5, 60, { drift: 0.75, clip: 2, maxCharge: 60, disp: 1, dmg: 150, explR: 8, dmgR: 80, rarity: 2, cost: 2650,
    short: 'An older model from the Lymilark, the Long Lance boasts excellent accuracy.', long: 'A higher-accuracy piece with surprisingly high damage.' }),
  weapon('coil', '90mm Exp. Coilgun', 'gun', -10, 40, { clip: 2, disp: 3, salvo: 4, maxCharge: 40, dmg: 80, dmgR: 55, rarity: 2, cost: 2910,
    short: 'A high-speed coilgun developed by CLS-T. Fires four rounds at once.', long: 'Less artillery gun and more machine gun.' }),
  weapon('obj261', '181mm Obj. 261', 'shell', 0, 70, { maxCharge: 90, disp: 0.5, dmg: 250, dmgR: 130, explR: 20, rarity: 2, cost: 3520,
    short: 'Retrofitted from Anti-Air to Anti-Everything. Reminds you of twintails...', long: 'Larger shell means large blast radius. Also means one shot.' }),
  weapon('type11', 'Hatsuyuki Type-11/N15', 'shell', 0, 90, { clip: 3, maxCharge: 90, disp: 0.5, dmg: 120, sat: true, dmgR: 70, explR: 10, rarity: 3, cost: 3990,
    short: 'A relic of the Hatsuyuki Project; utilises the MAIA Satellite System', long: "Flexible but doesn't do much damage." }),
  weapon('lensae', '50mm x3 Kotona Lensed-AE Rifle', 'laser', -30, 30, { ceil: 150, clip: 3, maxCharge: 80, disp: 0.5, dmg: 200, explR: 2, dmgR: 50, rarity: 3, cost: 4520,
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
  weapon('lfs75', "75mm 2x3 LFS 'Neko Paradise'", 'laser', -25, 25, { ceil: 170, clip: 2, salvo: 3, maxCharge: 90, disp: 1, dmg: 400, explR: 5, dmgR: 55, rarity: 4, cost: 20880,
    short: 'Part of the next-generation design from the Neko Paradise Project.', long: 'Somewhat bad accuracy for a laser-weapon, but packs a cute sting.' }),
  weapon('triple', '460mm/18.1in Type 94 Triple Turrets', 'shell', -5, 90, { clip: 2, maxCharge: 120, salvo: 3, disp: 4, dmg: 550, dmgR: 160, explR: 22, rarity: 5, cost: 26360,
    short: "A miniaturised version of the Yamato's triple-turrets. For cute girls.", long: 'High damage, long range, but even worse accuracy!' }),
  weapon('laser88', "88mm x3 'Nadeko Snake' Laser Turret", 'laser', -30, 30, { ceil: 180, clip: 2, salvo: 3, maxCharge: 100, disp: 1.55, dmg: 650, dmgR: 80, explR: 10, rarity: 5, cost: 28850,
    short: 'Twice cursed and once more, fires just as hot as the darkness near Shirahebi Shrine.', long: 'A direct hit is deadly, be careful of small-ish explosions.' }),
  weapon('laser15x', '90mm Neko-15X Laser', 'laser', -30, 30, { ceil: 220, clip: 2, maxCharge: 100, dmg: 1150, disp: 0.25, dmgR: 90, explR: 5, sat: true, rarity: 6, cost: 39800,
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
  // Hybrids: two makers' ideas in one gun (w.maker names both; the shop has a Hybrid filter)
  weapon('yukikaze', "Hatsuyuki 'Yukikaze' Uplink Seeker", 'rocket', 10, 80, { salvo: 2, clip: 2, maxCharge: 70, disp: 3.2, dmg: 40, dmgR: 45, explR: 5, rarity: 4, cost: 13000, sat: true,
    maia: { pulses: 6, mult: 3.5, r: 120, gap: 14 }, // the Hatsuyuki barrage: each pulse does mult x the rocket's damage (Game.updateBarrage)
    hybrid: true, maker: 'Hatsuyuki × Lymilark',
    kin: 6, // it comes in hot (no airbrake): six times the usual kinetic damage for a direct hit
    guide: { arm: 6, burn: 230, seek: 999, apex: true, brake: false, turn: 7, range: 480, cone: 140, lift: 0.5 },
    short: 'A Hatsuyuki seeker that dives on the nearest target past the top of its arc, without braking. Its call opens MAIA all the way.', long: 'The warheads barely scratch, but a fast direct hit does six times the usual kinetic damage. The Hatsuyuki barrage does the rest: MAIA spreads its wings and antenna and strikes six times at whatever the rocket locked onto, each pulse three and a half times a warhead, whatever MAIA\'s level. Twice a turn.' }),
  weapon('feuerlilie', "G.W.–LFS 'Feuerlilie' Seeker Flak", 'rocket', 10, 85, { salvo: 2, clip: 2, maxCharge: 75, disp: 2.8, dmg: 90, dmgR: 90, explR: 4, rarity: 3, cost: 7000,
    hybrid: true, maker: 'G.W. × Lymilark', airburst: true,
    guide: { arm: 8, burn: 55, seek: 999, apex: true, turn: 4, range: 390, cone: 80, lift: 0.5 },
    short: 'A G.W. anti-air rocket with a Lymilark seeker: it homes, then bursts like flak.', long: 'Proximity-fused airbursts with shrapnel, double damage to drones. Feuerlilie: fire lily.' }),
  weapon('ichor', "KTS-T × CLS-T 'Ichor' Acid Lance", 'laser', -25, 30, { ceil: 170, clip: 2, maxCharge: 95, disp: 0.6, dmg: 520, dmgR: 70, explR: 6, acid: 1.2, rarity: 5, cost: 25000,
    hybrid: true, maker: 'Kotona × CLS-T',
    short: 'A Kotona lens bolted to a CLS-T acid tank. The beam leaves the ground boiling.', long: 'A laser that lands an acid pool where it strikes, twice a turn.' }),
  // CLS-T's napalm: an autocannon that hoses incendiary flak; every fragment lands burning
  weapon('kagutsuchi', "CLS-T 'Kagutsuchi' 40mm Incendiary Autocannon", 'flak', 5, 85, { salvo: 10, clip: 4, maxCharge: 85, disp: 7, dmg: 60, dmgR: 50, explR: 3, rarity: 7, cost: 135000,
    incendiary: 2.5,
    short: 'Named for the fire god whose birth burned his mother. Forty incendiary shells a turn.', long: 'Wide spread, small bursts, and every fragment lands burning. CLS-T’s napalm.' }),
  // NXi, November Division: the rival to CLS-T. Overbuilt and triple-verified; accurate, a little slow
  weapon('nxi105', "NXi Mk.I 'Bulkhead' 105mm", 'shell', -5, 60, { salvo: 3, disp: 0.6, maxCharge: 55, dmg: 60, dmgR: 55, explR: 7, rarity: 1, cost: 1500,
    short: 'Overbuilt, over-tested, over-documented, and proud of it.', long: 'Three shells in close formation. Every one of them inspected.' }),
  weapon('nxitv', "NXi 'Triple-Verify' 120mm Coilgun", 'gun', -10, 40, { clip: 2, salvo: 3, disp: 0.8, maxCharge: 45, dmg: 70, dmgR: 50, rarity: 2, cost: 3200,
    short: 'Every round is verified three times before it leaves the barrel.', long: "Never fires a shot it hasn't checked. Twice a turn." }),
  weapon('nxisec9', "NXi SEC-9 'Veto' Point-Defence Battery", 'flak', 10, 90, { clip: 2, salvo: 3, disp: 0.8, maxCharge: 85, dmg: 90, dmgR: 100, explR: 5, rarity: 3, cost: 4600,
    short: 'SEC-9 has veto power. Drones do not get a vote.', long: 'Proximity-fused point defence for the gate.' }),
  weapon('nxiarch7', "NXi ARCH-7 'Battlecruiser' 280mm", 'shell', -5, 70, { clip: 2, disp: 0.4, maxCharge: 70, dmg: 600, dmgR: 140, explR: 20, rarity: 4, cost: 9800,
    short: 'Built like a battlecruiser: maximum armour, maximum redundancy, maximum reliability.', long: 'Slow to load, slower to miss.' }),
  weapon('nxiintel3', "NXi INTEL-3 'Gatewatch' Lance", 'laser', -25, 30, { ceil: 200, clip: 2, salvo: 2, disp: 0.4, maxCharge: 100, dmg: 600, dmgR: 70, explR: 6, rarity: 5, cost: 27500,
    short: 'The gate is guarded at all cost. INTEL-3 sees everything that comes through it.', long: 'Paired beams, triple-verified targeting.' }),
  weapon('nxiaeria', "NXi 'Aeria Charlotte' 406mm Royal Battery", 'shell', -5, 85, { clip: 3, salvo: 3, disp: 2, maxCharge: 110, dmg: 450, dmgR: 150, explR: 24, rarity: 6, cost: 58000,
    short: 'Commanded by Queen Aeria Charlotte herself. Every shell is worthy of royal inspection.', long: 'Three triple turrets. For the UAF.' }),
  weapon('nxivoid', "NXi November 'Void Between Stars' Arc Lance", 'laser', 0, 25, { ceil: 240, drift: 0.35, clip: 2, maxCharge: 400, disp: 0.01, dmg: 3000, dmgR: 120, explR: 30, sat: true, rarity: 7, cost: 150000,
    chain: { n: 4, range: 280, fall: 0.8 },
    short: 'Opens a rift for an instant and lets the storm between dimensions through. It does not stay where it lands.', long: 'Lightning that arcs from its target to the next nearest thing, four times, a fifth weaker each jump. Trees and poles draw it off. We advance slowly because we advance forever.' }),
  weapon('massdriver', '210mm Kinetic Mass Driver', 'laser', 0, 20, { ceil: 260, drift: 0.15, clip: 2, maxCharge: 1000, disp: 0.001, explR: 80, dmg: 10000, dmgR: 400, sat: true, rarity: 7, cost: 195420,
    short: 'A mysterious weapon by the Kotona Umbress, it fires entire titanium pillars.', long: 'Holding two rounds, it was salvaged from KTNS Hatsuyuki.' }),
  // Guided rockets (Lymilark Future Sciences). After `arm` frames in flight the seeker locks onto
  // the nearest thing in a `cone` ahead within `range`: a rival, a drone, a supply crate, whatever
  // is closest. It steers at up to `turn` degrees a frame for `burn` frames, with `lift` of gravity
  // cancelled while the motor runs, then falls like a shell. Lighter damage, far better
  // consistency. Long-tube launchers can barely elevate, so they skim terrain and rely on the
  // seeker. Later models transform in flight: `carpet` drops tumbling, wind-blown bomblets one after another,
  // `split` breaks into seekers that each go for the nearest target.
  weapon('wren', "LFS 'Wren' 70mm Seeker", 'rocket', 0, 65, { salvo: 2, maxCharge: 55, disp: 2.6, dmg: 75, dmgR: 50, explR: 6, rarity: 1, cost: 1700,
    guide: { arm: 6, burn: 55, seek: 999, apex: true, turn: 3.5, range: 310, cone: 75, lift: 0.5 },
    short: 'A pair of little seekers. They go for whatever is closest, which is usually what you wanted.', long: 'Lymilark Future Sciences, Tir Chonaill works.' }),
  weapon('kestrel', "LFS 'Kestrel' Twin Launcher", 'rocket', 0, 55, { salvo: 2, clip: 2, maxCharge: 60, disp: 2.6, dmg: 80, dmgR: 55, explR: 7, rarity: 2, cost: 3300,
    guide: { arm: 6, burn: 60, seek: 999, apex: true, turn: 3.5, range: 350, cone: 75, lift: 0.5 },
    short: 'Two pairs a turn. The Dunbarton militia swear by it.', long: 'Seekers lock on ten frames out of the tube.' }),
  weapon('dunbarton', "LFS 'Dunbarton' Long-Tube Rocket", 'rocket', -3, 12, { clip: 2, maxCharge: 95, disp: 1.0, dmg: 230, dmgR: 70, explR: 10, rarity: 3, cost: 6200,
    guide: { arm: 6, burn: 90, seek: 999, apex: true, turn: 5, range: 420, cone: 60, lift: 0.85, popup: { range: 240, frames: 16, angle: 60, height: 160 } },
    short: 'A tube so long it can hardly elevate. It skims the ground, then pops up over its target and dives.', long: 'Flat-flying cruise rocket: find a gap in the terrain. Within about 240 of a target ahead it pulls up hard and comes down on top.' }),
  weapon('tirchonaill', "LFS 'Tir Chonaill' Carpet Rocket", 'rocket', 5, 60, { maxCharge: 70, disp: 2.0, dmg: 150, dmgR: 70, explR: 8, rarity: 4, cost: 12500,
    guide: { arm: 4, burn: 70, seek: 999, apex: true, turn: 3, range: 200, cone: 70, lift: 0.6 }, carpet: { n: 7, frac: 0.5, r: 60, at: 40, every: 3 },
    short: 'Two-thirds of a second out it starts dropping seven bomblets, one after another.', long: 'They tumble and the wind takes them: skim it low over the target and it lays a strip.' }),
  weapon('emain', "LFS 'Emain Macha' Split Rocket", 'rocket', 0, 50, { clip: 2, maxCharge: 75, disp: 2.0, dmg: 300, dmgR: 80, explR: 10, rarity: 5, cost: 22000,
    guide: { arm: 4, burn: 75, seek: 999, apex: true, turn: 4.5, range: 500, cone: 80, lift: 0.6 }, split: { n: 3, at: 32, spread: 14, boost: 1.15 },
    short: 'Breaks into three seekers half a second out, each going for whatever is closest.', long: 'They can all pile onto one target, or spread over a crowd of drones.' }),
  weapon('demigod', "LFS 'Demigod' Lance Rocket", 'rocket', 5, 70, { maxCharge: 80, disp: 1.2, dmg: 900, dmgR: 70, explR: 14, rarity: 7, cost: 160000,
    guide: { arm: 4, burn: 40, seek: 999, turn: 2, range: 600, cone: 80, lift: 0.5 }, lance: { at: 45, hover: 20, speed: 75, range: 1800, kin: 2.5 },
    short: 'It arcs like any rocket. Then it stops dead in the air, becomes a lance of light, and charges.', long: 'Three-quarters of a second out it picks the nearest target in any direction and runs it through. Kinetic damage ×2.5.' }),
  weapon('avalon', "LFS 'Avalon Gate' Carpet Rocket", 'rocket', 0, 60, { clip: 2, maxCharge: 85, disp: 1.6, dmg: 270, dmgR: 90, explR: 12, rarity: 6, cost: 36000,
    guide: { arm: 4, burn: 85, seek: 999, apex: true, turn: 3.5, range: 220, cone: 75, lift: 0.7 }, carpet: { n: 10, frac: 0.5, r: 75, at: 50, every: 2 },
    short: 'Named for the gate the Lymilark knights never found. Ten bomblets, twice a turn.', long: 'Lymilark Future Sciences flagship. Ten bomblets in sequence, unguided and wind-blown.' }),
  // Planes (Sengoku Inc., after KanColle's carrier aircraft; planes.js): the gun is a laser
  // designator. A weapon has air.squads squads (one early on, three or four late), its autoloader
  // rounds: each dot of a turn takes the next. One on her deck takes off (air.planes, one more from
  // a flight deck), flies over the dot's strike zone and attacks it in the same turn, then hovers
  // there, where anyone can shoot it; with none on deck, the squad out longest on its orders is
  // redirected (and attacks the new zone). A squad attacks once a dot, until its loadout is spent (AIR_PASSES: bombers
  // several passes, torpedo jets one, fighters many), then flies home and rearms for air.reload
  // turns; one shot down rearms too. Planes that take off straight up (no flight deck) hit 30%
  // softer. dmg is per bomb, torpedo or rocket; hp per plane (armour: it takes a whole hit).
  //   dive     each plane drops air.ord bombs almost straight down onto the mark
  //   torpedo  each runs in low and drops a torpedo that skims the ground through the mark
  //   fighter  guns: aircraft and drones near the mark first (triple damage), else a strafing run
  //   rocket   each fires air.ord seeker rockets from overhead (LFS)
  //   heavy    one plane, one enormous guided bomb that steers onto the nearest rival in the zone (NXi)
  //   fortress a level bomber: straight across the zone at altitude, walking a stick of air.ord bombs over it
  weapon('kansen0', "SI 'Atlantis Shark' Flying Circus", 'air', 0, 80, { maxCharge: 80, disp: 0.9, dmg: 22, dmgR: 30, explR: 2, clip: 1, rarity: 1, cost: 900,
    air: { squads: 1, type: 'fighter', planes: 3, ord: 6, hp: 70, reload: 2 },
    short: 'Small, toothy and very fast: shark-finned fighters that circle anything else in the sky and bite.', long: 'Fighters: they go for planes and drones near the mark first (triple damage), and strafe it when the sky is clear.' }),
  weapon('kankou97', "SI 'Carrot Rabbit' Torpedo Jet", 'air', 0, 80, { maxCharge: 80, disp: 0.9, dmg: 120, dmgR: 70, explR: 10, clip: 1, rarity: 1, cost: 1000,
    air: { squads: 1, type: 'torpedo', planes: 2, ord: 1, hp: 65, reload: 2 },
    short: 'Hops in low over the ground, lets its torpedo go, and laughs all the way home.', long: 'Torpedoes skim the ground through the mark and go off on the first thing they touch: stepping aside along their line won’t save you.' }),
  weapon('suisei', "SI 'Tenchou Phoenix' Dive Jet", 'air', 0, 80, { maxCharge: 85, disp: 0.8, dmg: 190, dmgR: 70, explR: 11, clip: 1, rarity: 2, cost: 2400,
    air: { squads: 1, type: 'dive', planes: 2, ord: 1, hp: 90, reload: 2 },
    short: 'It bursts into flame on the way down, and somehow comes back for the next shift every time.', long: 'Two dive bombers a squad.' }),
  weapon('tenzan', "SI 'Treasure Captain' Torpedo Wing", 'air', 0, 80, { maxCharge: 90, disp: 0.8, dmg: 150, dmgR: 80, explR: 12, clip: 1, rarity: 3, cost: 4800,
    air: { squads: 2, type: 'torpedo', planes: 3, ord: 1, hp: 120, reload: 2 },
    short: 'Three torpedo jets abreast under a skull and crossbones, running in low for the loot.', long: 'Three torpedoes along the ground through the mark.' }),
  weapon('reppuu', "SI 'Bakery Doggo' Interceptor", 'air', 0, 80, { maxCharge: 90, disp: 0.7, dmg: 32, dmgR: 35, explR: 2, clip: 1, rarity: 3, cost: 4400,
    air: { squads: 2, type: 'fighter', planes: 3, ord: 8, hp: 130, reload: 2 },
    short: 'A loyal good girl: fetches everything with an engine out of the sky and brings it back in pieces.', long: 'Fighters with heavier guns: aircraft first, then a strafing run.' }),
  weapon('taillteann', "SI–LFS 'Taillteann' Rocket Wing", 'air', 0, 80, { maxCharge: 90, disp: 0.8, dmg: 86, dmgR: 55, explR: 7, clip: 1, rarity: 4, cost: 11500,
    hybrid: true, maker: 'Sengoku × Lymilark',
    air: { squads: 2, type: 'rocket', planes: 2, ord: 3, hp: 160, reload: 2 },
    guide: { arm: 4, burn: 60, seek: 6, apex: false, turn: 4, range: 160, cone: 90, lift: 0.4 },
    short: 'Sengoku airframes carrying Lymilark seeker pods. They fire from overhead and the seekers do the rest.', long: 'Three seekers a plane, each going for the nearest target under it: a target that moved a little still gets found.' }),
  weapon('ryusei', "SI 'Morning Dragon' Attack Jet", 'air', 0, 80, { maxCharge: 95, disp: 0.7, dmg: 182, dmgR: 100, explR: 16, clip: 1, rarity: 5, cost: 21000,
    air: { squads: 3, type: 'dive', planes: 3, ord: 1, hp: 220, reload: 2 },
    short: 'Good morning, everyone: it comes down like a dragon with the news, carrying the big bomb.', long: 'Three heavy bombs a squad.' }),
  weapon('fortissimo', "SI 'Live Streaming Reaper' Flying Fortress", 'air', 0, 80, { maxCharge: 95, disp: 0.7, dmg: 140, dmgR: 60, explR: 8, clip: 1, rarity: 5, cost: 20000,
    air: { squads: 2, type: 'fortress', planes: 2, ord: 6, hp: 320, armour: 180, reload: 3 },
    short: 'Four engines, two lift fans, and armour plate that shrugs off a whole burst. The reaper always collects, and she does it live.', long: 'Level bombers: they cross the zone high up and walk six bombs each across it. Unguided, and the wind takes them, but the armour takes one hit of any size.' }),
  weapon('kikka', "SI 'Comet Idol' Jet Bomber", 'air', 0, 80, { maxCharge: 100, disp: 0.6, dmg: 156, dmgR: 85, explR: 13, clip: 1, rarity: 6, cost: 33000,
    air: { squads: 3, type: 'dive', planes: 3, ord: 2, hp: 250, reload: 3, jet: true },
    short: 'In like a comet, out before the encore. Too fast for most AA to track, and it drops two bombs a pass.', long: 'Jets: anti-aircraft fire has half the chance against them and their bombs.' }),
  weapon('shiden', "SI 'Clockwork Warden' Fighter", 'air', 0, 80, { maxCharge: 100, disp: 0.6, dmg: 41, dmgR: 40, explR: 3, clip: 1, rarity: 6, cost: 30000,
    air: { squads: 3, type: 'fighter', planes: 4, ord: 10, hp: 300, reload: 3 },
    short: 'It keeps the time over the mark: the last and best of the Sengoku fighters, four a squad.', long: 'Clears the sky over the mark, then rakes it.' }),
  weapon('tifaun', "NXi × SI 'Taufaun' Strike Jet", 'air', 0, 80, { maxCharge: 110, disp: 0.4, dmg: 254, dmgR: 260, explR: 42, clip: 1, rarity: 7, cost: 150000,
    hybrid: true, maker: 'NXi × Sengoku',
    air: { squads: 4, type: 'heavy', planes: 1, ord: 1, hp: 700, armour: 300, reload: 3, jet: true },
    short: 'The UAF’s minibrieve: one Sengoku lift-fan airframe, built like a battlecruiser by the November Division, carrying one bomb. That is all it needs.', long: 'A single armoured jet with one enormous guided bomb that steers onto the nearest rival within 260 of the mark. AA has half the chance against it.' }),
  // Final weapons: one per girl, only in her own shop (sig), the price of the end game, and a tier
  // of their own above Godly (Parallel Night). Each has a
  // set piece of its own (finals.js).
  weapon('ragnarok', "G.W. 'Ragnarök' Battery Fire", 'shell', 5, 75, { sig: 'gwt', maxCharge: 120, disp: 0.3, drift: 0.5, dmg: 20, dmgR: 20, explR: 2, rarity: 8, cost: 75000,
    battery: { dmg: 900, r: 260, spread: 320, karl: { dmg: 6000, r: 380, explR: 140, quake: { r: 1200, dmg: 600 } } },
    short: 'A marker round for her platoon off the map: four G.W. Tiger SPGs and a Karl-Gerät 60cm siege mortar.', long: 'Eight 290mm rounds across 300 either side of the mark, then the Karl\'s: a giant crater, and an earthquake that hits everyone on the ground within 900. G.W. Tiger only.' }),
  weapon('zeropoint', "KTS-T 'Zero Point' Probe", 'gun', -5, 30, { sig: 'obj', drift: 0.05, pierce: 240, maxCharge: 170, disp: 0, dmg: 1200, dmgR: 60, explR: 8, rarity: 8, cost: 75000,
    naito: { r: 520 },
    short: 'A railgun probe for the Naito MAIA Containment Satellite, out past Jupiter.', long: 'Annihilation orders: the ground 520 either side of the probe is deleted, and anything that falls in is gone. Object 15X only.' }),
  weapon('verdict', "NXi 'Queen's Verdict' Tachyon Lance", 'shell', 0, 80, { sig: 'nxi', drift: 0.6, maxCharge: 120, disp: 0.3, dmg: 20, dmgR: 20, explR: 2, rarity: 8, cost: 75000,
    orbital: { dmg: 6000, r: 260, volley: { n: 60, dmg: 450, r: 150, spread: 600 } },
    short: 'A target dot for the battlecruiser in orbit. It takes its time to line up, then it fires.', long: 'The November Division keeps the gate from above as well. November only.' }),
  weapon('constellation', "Hatsuyuki 'Constellation' MAIA Array", 'shell', 0, 85, { sig: 'int', maxCharge: 90, disp: 0.5, dmg: 20, dmgR: 20, explR: 2, rarity: 8, cost: 75000,
    array: { fore: 22, far: 40, waves: 5, spread: 650, dmg: 320, r: 130, final: { dmg: 6000, r: 380, explR: 120 } },
    short: 'A laser dot. MAIA opens her eye, and the whole sky fills with MAIAs.', long: 'Innocentia only.' }),
  weapon('morrighan', "LFS 'Morrighan' Rift", 'shell', 0, 85, { sig: 'alb', maxCharge: 90, disp: 0.4, dmg: 30, dmgR: 30, explR: 2, rarity: 8, cost: 75000,
    rift: { tears: 5, rockets: 44, dmg: 600, r: 90, reach: 1000 },
    short: 'A flare, and the sky over it tears open like a wound.', long: 'Black rockets rain out of the tears on long dark trails, seeking everything beneath. Alban Eiler only.' }),
  weapon('apollon', "'Apollon' Judgement Bow", 'laser', -20, 40, { sig: 'ang', ceil: 300, maxCharge: 90, disp: 0.3, dmg: 900, dmgR: 60, explR: 6, rarity: 8, cost: 75000,
    meteor: { dmg: 6000, r: 650, explR: 175, size: 300, lava: 920, splash: 30 },
    short: 'Where her arrow of light lands, the sky answers: she marks an asteroid and brings it down.', long: 'Ikaros only.' }),
  weapon('kidobutai', "SI 'Kidō Butai' Strike Fleet", 'air', 0, 80, { sig: 'zui', maxCharge: 100, disp: 0.4, dmg: 300, dmgR: 110, explR: 16, clip: 1, rarity: 8, cost: 75000,
    air: { squads: 1, type: 'fleet', planes: 0, ord: 1, hp: 120, reload: 3 },
    fleet: { carriers: 3, dive: 9, torpedo: 6, fighter: 6 },
    short: 'A laser dot for the carriers off the coast. Their whole air wing comes.', long: 'Zuihou only. One great squad of 21 that strikes as soon as it arrives; each later dot redirects it and it strikes again, until its loadouts are spent (dive bombers three passes, torpedo jets one, fighters six) or it is shot down. Only then can the carriers launch again.' }),
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
// Commons are priced as cheap sidegrades (about 40% under the curve), Uncommons a little under
const REBALANCE = {
  morser: { dmg: 110 }, d76: { dmg: 170 }, katis: { dmg: 30 }, nxi0: { dmg: 60 }, gloria: { dmg: 170 },
  howitzer: { dmg: 260, cost: 700 }, claymore: { dmg: 85, cost: 900 }, lensx2: { dmg: 225, cost: 1100 },
  lance: { dmg: 220, cost: 2100 }, coil: { dmg: 80, cost: 2450 }, obj261: { dmg: 420, cost: 2900 },
  type11: { dmg: 130, cost: 4400 }, lensae: { dmg: 335, cost: 4900 }, type91: { dmg: 515, cost: 5800 },
  bc155: { dmg: 205, cost: 5400 }, typ67: { dmg: 595, cost: 6500 }, gwt290: { dmg: 625, cost: 9000 },
  cls220: { dmg: 205, cost: 12000 }, lfs75: { dmg: 550, cost: 14000 }, triple: { dmg: 510, cost: 18000 },
  laser88: { dmg: 720, cost: 20000 }, laser15x: { dmg: 2505, cost: 25000 }, acid220: { dmg: 710, cost: 28000 },
  cls770: { dmg: 505, cost: 33000 }, horizon: { dmg: 740, cost: 40000 }, terminus: { dmg: 555, cost: 45000 },
  flak40: { dmg: 40, cost: 950 }, akizuki: { dmg: 195, cost: 5000 }, maya: { dmg: 305, cost: 11000 },
  sanshiki: { dmg: 2115, cost: 30000 }, nxi105: { dmg: 110, cost: 950 }, nxitv: { dmg: 105, cost: 2650 },
  nxisec9: { dmg: 135, cost: 5100 }, nxiarch7: { dmg: 740, cost: 10000 }, nxiintel3: { dmg: 1040, cost: 19000 },
  nxiaeria: { dmg: 510, cost: 30000 }, nxivoid: { dmg: 1800, cost: 48000 }, massdriver: { dmg: 2620, cost: 52000 },
  // rockets: about 75% of a shell gun's worth for the price (the seeker makes up the rest)
  lfs0: { dmg: 70 }, wren: { dmg: 85, cost: 850 }, kestrel: { dmg: 90, cost: 2400 }, dunbarton: { dmg: 285, cost: 5200 },
  tirchonaill: { dmg: 390, cost: 10500 }, emain: { dmg: 415, cost: 19000 }, avalon: { dmg: 440, cost: 32000 },
  // the Demigod's lance is overkill on any vehicle (×2.5 kinetic on top); it is rated by whether it lands
  demigod: { dmg: 1600, cost: 50000 }, kagutsuchi: { dmg: 110, cost: 47000 },
  // the Yukikaze's warheads are weak on purpose: MAIA does the damage
  yukikaze: { dmg: 40, cost: 11000 }, feuerlilie: { dmg: 155, cost: 6000 }, ichor: { dmg: 1800, cost: 21000 },
  // planes: per bomb, torpedo, rocket or gun burst (see planes.js)
  // fitted like the guns, then about a third off: a plane weapon flies its squads on several of her
  // turns before it rearms (airValue credits that back, AIR_TEMPO); the more squads it has (each a
  // zone a turn), the less each bomb, so with all of them out it hits like an autoloader of its value
  zui0: { dmg: 120 }, zui1: { dmg: 55 }, kansen0: { dmg: 20, cost: 800 }, kankou97: { dmg: 105, cost: 1000 }, suisei: { dmg: 285, cost: 2500 }, tenzan: { dmg: 184, cost: 5200 },
  reppuu: { dmg: 43, cost: 4600 }, taillteann: { dmg: 224, cost: 12000 }, ryusei: { dmg: 550, cost: 22000 }, kikka: { dmg: 433, cost: 34000 },
  shiden: { dmg: 108, cost: 30000 }, fortissimo: { dmg: 260, cost: 20000 }, tifaun: { dmg: 1196, cost: 50000 },
};
// every girl's starting guns (her signature one, and any extra: Zuihou's sidearm)
const STARTERS = VEHICLES.flatMap((v) => [v.weapon, ...(v.extra || [])]);
const ALL_WEAPONS = [...WEAPONS, ...STARTERS];
const CLASSIC = Object.fromEntries(ALL_WEAPONS.map((w) => [w.id, { dmg: w.dmg, clip: w.clip, cost: w.cost }]));
let BALANCE = 'rebalanced';

for (const w of STARTERS) w.starter = true;

// Reloads (rebalanced only): after a bought gun fires, it sits out this many of its owner's turns,
// by rarity. Starters never reload, so there is always something to fire; a rack of guns fires a
// big one every turn by rotating. Damage rises with tier to pay for the turns a gun spends
// reloading and for the dearer misses (the 'firepower' multiplier, on top of REBALANCE).
const RELOAD_BY_RARITY = [0, 0, 1, 1, 2, 2, 3, 3, 3];
const FIREPOWER_BY_RARITY = [1, 1.15, 1.27, 1.39, 1.51, 1.63, 1.75, 1.87, 1.87];
function reloadOf(w) { return w.air ? w.air.reload : BALANCE === 'rebalanced' && !w.starter ? RELOAD_BY_RARITY[w.rarity] : 0; }

// switch the shared weapon objects between the classic and rebalanced numbers
function applyBalance(mode) {
  BALANCE = mode === 'classic' ? 'classic' : 'rebalanced';
  for (const w of ALL_WEAPONS) {
    Object.assign(w, CLASSIC[w.id], BALANCE === 'rebalanced' ? REBALANCE[w.id] : {});
    if (BALANCE === 'rebalanced') w.dmg = Math.round(w.dmg * FIREPOWER_BY_RARITY[w.starter ? 1 : w.rarity] / 5) * 5;
  }
}
applyBalance(BALANCE);

// A3 shop badge: rarity initial + projectile-type initial, e.g. "Cs" (Common shell), "Gl" (Godly laser)
const KIND_LETTER = { shell: 's', gun: 'g', laser: 'l', acid: 'a', flak: 'k', rocket: 'r' };
// planes by what they carry: bombs (dive, heavy, fortress, and the fleet), torpedoes, fighters, rockets
const AIR_LETTER = { torpedo: 't', fighter: 'f', rocket: 'r' };
// manufacturer, from the weapon's name: NXi (November Division) vs CLS-T and the rest
function makerOf(w) {
  if (w.maker) return w.maker;
  if (w.id.startsWith('nxi')) return 'NXi';
  const n = w.name;
  if (n.includes('CLS-T')) return 'CLS-T';
  if (n.includes('LFS')) return 'Lymilark';
  if (n.includes('KTS-T') || n.includes('Kotona')) return 'Kotona';
  if (n.includes('G.W.')) return 'G.W.';
  if (n.includes('Hatsuyuki')) return 'Hatsuyuki';
  if (/\b(Sengoku|SI)\b/.test(n)) return 'Sengoku Inc.';
  return '';
}

// a gun's short name for the HUD under her: its nickname if it has one ('Doki-Doki'), else its name
// without the maker and the calibre
function shortName(w) {
  if (w.abbr) return w.abbr;
  const q = w.name.match(/'([^']+)'/);
  let s = q ? q[1] : w.name.replace(/\b(CLS-T|LFS|NXi|KTS-T|Sengoku|SI|G\.W\.|Kotona|Hatsuyuki|Mk\.\w+)\b/g, '').replace(/[\d.]+(mm|cm|in)?\b|\/[\d.]+\w*|\b\d+x\d*\b|\bx\d+\b/g, '').replace(/[×–\-·]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return (w.abbr = s.length > 22 ? s.slice(0, 21) + '…' : s || w.name);
}

function badgeText(w) {
  return RARITY[w.rarity].word[0] + (w.air ? (!w.fleet && AIR_LETTER[w.air.type]) || 'b' : KIND_LETTER[w.kind]);
}

// Abilities: bought once in the shop and kept for the match. Each is ready at the start of every
// round and, once used, recharges over `cd` of your own turns. Double Shot and Overcharge are armed
// with their key and spent on the next shot; Deflector switches on at once and lasts until your
// next turn. None of them uses up the turn.
const ABILITIES = [
  { id: 'double', key: '1', tag: 'x2', name: 'Double Shot', cost: 1500, cd: 4, desc: 'Arm, then fire: the shot is fired twice.' },
  { id: 'over', key: '2', tag: 'OVR', name: 'Overcharge', cost: 900, cd: 3, desc: 'Arm, then charge: the bar goes 35% further, for range and kinetic damage.' },
  { id: 'shield', key: '3', tag: 'SHD', name: 'Deflector', cost: 1200, cd: 4, desc: 'Halves all damage you take until your next turn.' },
  { id: 'barrier', key: '4', tag: 'BAR', name: 'Bulwark Barrier', cost: 1300, cd: 3, late: true, desc: 'Late game: raise a wall toward where you are aiming; it blocks 80% of blast damage from that side until your next turn.' },
];
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
const OVERCHARGE = 1.35;
const SHIELD_FACTOR = 0.5;
const BARRIER_BLOCK = 0.8; // share of blast damage a Bulwark Barrier stops from its side
const BARRIER_COS = Math.cos(Math.PI * 0.3); // it covers +-54 degrees around its direction

const WEAPON_BY_ID = Object.fromEntries(ALL_WEAPONS.map((w) => [w.id, w]));
const MAX_WEAPONS = 4; // A3 Character._weaponCapacity
// final weapons (w.sig) are only for their own girl
function forVehicle(w, vid) { return !w.sig || w.sig === vid; }

// Rough worth of a weapon per turn, used by CPUs to rank, buy and pick weapons: damage over the
// whole clip and salvo, scaled by blast radius (easier to hit with) and spread (harder), plus acid
// and MAIA strikes. Rarity adds a little on top for what this doesn't capture.
function weaponValue(w) {
  if (w.air) return airValue(w);
  const shots = w.salvo * Math.min(w.clip, 4);
  const radius = Math.sqrt(w.dmgR / 80);
  // (a seeker takes out part of its launch spread, so a rocket's counts half)
  const spread = 1 / (1 + w.disp * (w.guide ? 0.5 : 1) * (w.salvo > 1 ? 0.05 : 0.12));
  const acid = w.acid * 60 * shots;
  const sat = w.maia ? w.maia.pulses * w.maia.mult * w.dmg * 0.6 * Math.min(w.clip, 3) : w.sat ? 110 * Math.min(w.clip, 3) : 0;
  // rockets: a split multiplies the warheads, a carpet adds bomblets (about half of them land
  // close enough to count), and the seeker is worth some consistency on top
  const heads = w.split ? w.split.n * (w.split.boost || 1) : w.lance ? 1 + (w.lance.speed - KINETIC_MIN_SPEED) * KINETIC_PER_SPEED * w.lance.kin * 0.5 : 1;
  const carpet = w.carpet ? w.carpet.n * w.carpet.frac * 0.45 : 0;
  const fire = w.incendiary ? w.incendiary * 60 * w.salvo * Math.min(w.clip, 4) : 0;
  const guided = w.guide ? 1 + Math.min(w.guide.range, 600) / 1500 : 1; // a longer seeker reach is worth more
  // lightning: each arc jump counts for about half its damage (it often goes to a tree or a pole)
  const arcs = w.chain ? Array.from({ length: w.chain.n }, (_, k) => w.chain.fall ** (k + 1)).reduce((a, b) => a + b, 0) * 0.5 : 0;
  return (w.dmg * shots * (heads + carpet + arcs) * radius * spread * guided + acid + sat + fire) * (1 + 0.12 * (w.rarity - 1));
}

// a plane weapon's worth for its squads on a turn (each a zone): their ordnance, by type, discounted for
// the wait (the target can move, and AA and rivals can shoot the planes down first). Planes are
// counted at 85% (a flight deck adds one, VTOL takes 30% off).
const AIR_TYPE_WORTH = { dive: 1, torpedo: 1.1, rocket: 1.25, heavy: 1.45, fortress: 0.6, fighter: 0.45, fleet: 1 };
const AIR_DELAY_WORTH = 0.7;
const AIR_TEMPO = 1.45; // a plane weapon fires more of its turns than a gun of its tier (passes, then rearm)
function airValue(w) {
  const A = w.air;
  const planes = A.type === 'fleet' ? w.fleet.dive + w.fleet.torpedo : A.planes * 0.85;
  return w.dmg * planes * A.ord * (A.squads || 1) * Math.sqrt(w.dmgR / 80) * (AIR_TYPE_WORTH[A.type] || 1) * AIR_DELAY_WORTH * AIR_TEMPO * (1 + 0.12 * (w.rarity - 1));
}

// Wind on a shell, scaled by its drift (p.drift, 1 by default). Two parts: a steady push (A3's wind,
// made several times stronger), and in a strong wind, air that moves at up to WIND_AIR px/frame and
// drags the shell's horizontal speed toward its own. The drag is what makes a shell into a headwind
// stall and drop short, and one with a tailwind carry, instead of every arc staying a parabola.
// Calm air adds nothing, so a windless shot flies exactly as before.
const WIND_PUSH = 2;
const WIND_AIR = 30;
const WIND_DRAG = 0.0015;
function windAccel(p, wind) {
  const d = p.drift === undefined ? 1 : p.drift;
  if (!d || (!wind.x && !wind.y)) return { x: 0, y: 0 };
  const n = clamp(wind.x / WIND_FULL, -1, 1); // -1..1: full wind to the left .. right
  return {
    x: d * (wind.x * WIND_PUSH + WIND_DRAG * Math.abs(n) * (n * WIND_AIR - p.vx)),
    y: d * wind.y * WIND_PUSH,
  };
}

// Advance a ballistic body by one frame. `p` = {x, y, vx, vy, age}. Returns null while flying,
// or {hit:'terrain'|'tree'|'tank'|'out', tank?}. Shared by real shots and the AI's simulations.
// Rocket seeker (p.guide, see the guided rockets above). Candidates are anything in `seek` with a
// position: vehicles and mobs (center()) and crates. Locks once armed, re-checks every few frames
// while it has nothing; steering turns the velocity, keeping its speed. Returns how much of gravity
// the motor cancels this frame. Deterministic, so the CPU's simulations match the real flight.
const SEEK_FRAMES = 150; // how long a locked seeker can keep steering (no endless loitering)
function seekCenter(c) { return c.center ? c.center() : { x: c.x, y: c.y - 9 }; }
const DESIGNATE_SNAP = 70; // how close to a target her marker must be to designate it
const DESIGNATE_PULL = 0.02; // how hard a designated shot veers toward the dot, per frame
function designPoint(d) { return d.point ? d : seekCenter(d); }
function findLock(p, seek, owner) {
  const G = p.guide;
  const sp = Math.hypot(p.vx, p.vy) || 1;
  // diving (past the top of its arc): any direction, so a rocket that has overflown its target can
  // turn back for it, but only within G.range: far from anything it stays ballistic
  const cosCone = p.dive ? -2 : Math.cos(rad(G.cone));
  const range = G.range; // only what's within its seeker's reach: otherwise it flies on as a shell
  let best = null, bd = range, bestRival = null, brd = range;
  for (const c of seek) {
    if (!c.alive || c === owner || (c.isPlane && c.owner === owner) || (p.taken && p.taken.includes(c))) continue;
    const q = seekCenter(c);
    const dx = q.x - p.x, dy = q.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range || (dx * p.vx + dy * p.vy) / (d * sp || 1) < cosCone) continue;
    if (d < bd) { bd = d; best = c; }
    if (c.vehicle && !c.isMob && d < brd) { brd = d; bestRival = c; }
  }
  return p.prefer === 'rival' && bestRival ? bestRival : best;
}
// carpet bomblets don't seek: they tumble (their heading wanders up to `tumble` degrees a frame) and
// the wind throws them about (BOMBLET_DRIFT), so a carpet is an area weapon, heavy in total
const BOMBLET_GUIDE = { tumble: 3 };
const BOMBLET_DRIFT = 2.5;
const SEEKER_SPREAD = 20; // world units of seeker aim error per point of a rocket's spread
const FIN_GAIN = 0.05; // turn-rate change per frame per radian off the line
const FIN_DAMP = 0.1; // how much of its turn rate it sheds a frame (low: it overshoots)
const FIN_WOBBLE = 6.5; // buffeting in degrees a frame, at full strength (the same for every rocket)
const FIN_WOBBLE_FULL = 150; // frames of flight before buffeting is at full strength
function finFor(p) {
  if (p.wseed === undefined) return { w: 0, n: 0, gain: 1, damp: 1, rand: () => 0 };
  const r = mulberry32(p.wseed);
  return { w: 0, n: 0, gain: 0.7 + 0.6 * r(), damp: 0.5 + 0.8 * r(), rand: () => r() * 2 - 1 };
}
function guideStep(p, seek, owner) {
  const G = p.guide;
  if (G.tumble) { // a bomblet: no seeker, just a wandering heading (none in a simulation)
    const f = p.fin || (p.fin = finFor(p));
    f.n = f.n * 0.85 + 0.15 * f.rand();
    const a = f.n * rad(G.tumble), c = Math.cos(a), sn = Math.sin(a);
    const vx = p.vx * c - p.vy * sn;
    p.vy = p.vx * sn + p.vy * c;
    p.vx = vx;
    return 0;
  }
  if (!G || p.age < G.arm) return 0;
  // the motor lifts while it burns; the fins steer for the whole flight once the seeker is awake
  const lift = p.age <= G.arm + G.burn ? G.lift : 0;
  // pop-up (Dunbarton): it skims along until a target is close ahead, then pulls up hard under
  // full motor for popup.frames and dives onto it from above
  if (G.popup && !p.dive) {
    if (p.popUntil === undefined && p.age % 3 === 0) {
      const c = findLock(p, seek, owner);
      const sp = Math.hypot(p.vx, p.vy);
      if (c && Math.abs(seekCenter(c).x - p.x) < Math.max(G.popup.range, sp * 7)) { p.lock = c; p.popUntil = p.age + G.popup.frames; }
    }
    if (p.popUntil !== undefined) {
      if (p.age < p.popUntil && !(p.lock && p.y < seekCenter(p.lock).y - G.popup.height)) {
        const dir = Math.sign(p.vx) || 1;
        const want = Math.atan2(-Math.sin(rad(G.popup.angle)), dir * Math.cos(rad(G.popup.angle)));
        let diff = want - Math.atan2(p.vy, p.vx);
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const turn = clamp(diff, -rad(G.turn * 2), rad(G.turn * 2));
        const c = Math.cos(turn), sn = Math.sin(turn);
        const vx = p.vx * c - p.vy * sn;
        p.vy = p.vx * sn + p.vy * c;
        p.vx = vx;
        return 1;
      }
      p.dive = true; // keeps its lock
    }
  }
  // javelin: tipping over the top of the climb starts the dive, which re-picks the nearest target
  if (G.apex && !p.dive && p.vy > 0 && p.age > G.arm + 4) { p.dive = true; p.lock = null; }
  if (p.lock && !p.lock.alive) p.lock = null;
  // the seeker wakes late (G.seek frames), or, javelin-style (G.apex), as soon as the rocket tips
  // over the top of its climb, so a tall shot comes down onto its target
  const from = G.seek === undefined ? G.arm : G.seek;
  const awake = p.age >= from || (G.apex && p.vy > 0 && p.age > G.arm + 4);
  if (!p.lock && awake && p.age % 3 === 0) {
    p.lock = findLock(p, seek, owner);
    if (p.lock && p.taken) p.taken.push(p.lock);
  }
  if (p.lock) { p.locked = (p.locked || 0) + 1; p.lastLock = p.lock; } // lastLock: what it was going for (Yukikaze's barrage)
  if (p.lock && p.locked < SEEK_FRAMES) { // steering lasts SEEK_FRAMES once locked, then it falls
    const q = seekCenter(p.lock);
    if (p.aimOff) q.x += p.aimOff; // its seeker's error (see Projectile)
    // aim above the target by the drop it will see on the way (remaining gravity, flight time)
    // (diving rockets aim straight at it: they steer every frame, and gravity is helping; the
    // allowance is capped so a slowed rocket doesn't aim high and hover over its target)
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const dd = Math.hypot(q.x - p.x, q.y - p.y);
    const T = dd / Math.max(sp, 20);
    const drop = p.dive ? 0 : Math.min(0.5 * GRAV * (1 - lift) * T * T, dd * 0.4);
    const want = Math.atan2(q.y - p.y - drop, q.x - p.x);
    const cur = Math.atan2(p.vy, p.vx);
    let diff = want - cur;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    // airbrake: shed speed when it's coming in too fast to make the turn (arrive in about ten
    // frames), so medium-range shots land instead of overshooting
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    const vmax = Math.max(9, d / 10);
    if (G.brake !== false && sp > vmax) { const k = Math.max(0.93, vmax / sp); p.vx *= k; p.vy *= k; }
    const rate = rad(G.turn * (p.dive ? 2 : 1)); // diving, the fins bite harder
    // the fins are a crude P controller on the turn rate (no I or D term): under-damped, so the
    // rocket swings past its line and fishtails back. Each rocket's gain, damping and buffeting are
    // its own (seeded per rocket), and the buffeting grows the longer it has flown, so long lobs
    // wander most. The CPU's simulated rockets (no seed) fly the steady average.
    const f = p.fin || (p.fin = finFor(p));
    f.n = f.n * 0.9 + 0.1 * f.rand();
    f.w += clamp(diff * FIN_GAIN * f.gain - f.w * FIN_DAMP * f.damp, -rate * 0.4, rate * 0.4);
    f.w = clamp(f.w + f.n * rad(FIN_WOBBLE) * Math.min(1, p.age / FIN_WOBBLE_FULL), -rate, rate);
    const turn = f.w;
    const c = Math.cos(turn), sn = Math.sin(turn);
    const vx = p.vx * c - p.vy * sn;
    p.vy = p.vx * sn + p.vy * c;
    p.vx = vx;
  }
  return lift;
}

function stepBallistic(p, terrain, wind, tanks, owner, seek = tanks) {
  const lift = p.guide ? guideStep(p, seek, owner) : 0;
  const a = windAccel(p, wind);
  // Object 15X's designator: the shot drifts sideways to close the gap between where it is going to
  // come down (at the dot's height, ignoring wind) and the dot
  if (p.designate && p.designate.alive) {
    const q = designPoint(p.designate);
    const g = p.noGrav ? 0 : GRAV, h = q.y - p.y;
    const disc = p.vy * p.vy + 2 * g * h;
    if (g > 0 && disc >= 0) {
      const T = (-p.vy + Math.sqrt(disc)) / g;
      const miss = q.x - (p.x + p.vx * T);
      p.vx += Math.sign(miss) * Math.min(DESIGNATE_PULL, Math.abs(miss) / Math.max(T * T, 1));
    }
  }
  p.vx += a.x;
  p.vy += (p.noGrav ? 0 : GRAV * (1 - lift)) + a.y;
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
      // a piercing slug (the Zero Point) spends p.pierce going through ground and cover
      const solid = p.y >= gy || (terrain.forts.length && terrain.fortAt(p.x, p.y)) || (terrain.bridges && terrain.bridges.length && terrain.bridgeAt(p.x, p.y)) || (terrain.towers && terrain.towers.length && terrain.towerAt(p.x, p.y)) || (terrain.giants && terrain.giants.length && terrain.giantAt(p.x, p.y)) || (terrain.ahu && terrain.ahuAt(p.x, p.y));
      if (solid && p.pierce > 0) { p.pierce -= Math.hypot(sx, sy); p.inside = true; continue; }
      if (p.y >= gy) return { hit: 'terrain' };
      if (p.y > gy - TREE_MAX_H) {
        const tree = terrain.treeAt(p.x, p.y);
        if (tree) return { hit: 'tree', tree };
      }
      if (terrain.forts.length && terrain.fortAt(p.x, p.y)) return { hit: 'fort' };
      if (terrain.bridges && terrain.bridges.length && terrain.bridgeAt(p.x, p.y)) return { hit: 'bridge' };
      if (terrain.towers && terrain.towers.length && terrain.towerAt(p.x, p.y)) return { hit: 'tower' };
      if (terrain.giants && terrain.giants.length && terrain.giantAt(p.x, p.y)) return { hit: 'giant' };
      if (terrain.ahu && terrain.ahuAt(p.x, p.y)) return { hit: 'ahu' };
    }
    for (const t of tanks) {
      if (!t.alive || (t === owner && p.age < 8)) continue;
      if (t.isMob && owner && owner.isMob) continue; // hostiles' fire passes through other hostiles
      if (t.isPlane && t.owner === owner) continue; // and a player's through her own planes
      const hw = t.hw || TANK_W / 2 + 2; // mobs carry their own hitbox
      const hh = t.hh || TANK_H + 2;
      const by = t.hitY === undefined ? t.y : t.hitY; // the satellite's box hangs around its centre
      if (Math.abs(p.x - t.x) < hw && p.y > by - hh && p.y < by + 2) return { hit: 'tank', tank: t };
    }
  }
  p.age++;
  return null;
}

// Fire a hypothetical (dispersion-free) shot and return where it lands, how far it fell from the
// top of its arc and how fast it was going (for the altitude / kinetic damage bonuses).
// `past` = { x, dir }: stop once an unguided shell is well past x going away (it can't come back),
// so the solver doesn't fly out every overshoot
function simulateShot(terrain, wind, tanks, owner, mx, my, vx, vy, drift = 1, w = null, seek = tanks, past = null) {
  const p = { x: mx, y: my, vx, vy, age: 0, drift, guide: w && w.guide ? guideFor(w, owner) : null, prefer: w ? preferFor(owner) : null, pierce: w ? w.pierce || 0 : 0 };
  let peak = my;
  // a carpet rocket: follow its middle bomblet from the moment it would drop
  const C = w && w.carpet, dropAt = C ? C.at + C.every * Math.floor(C.n / 2) : -1;
  const splitAt = w && w.split ? w.split.at : C ? C.at : -1;
  for (let i = 0; i < 900; i++) {
    const r = stepBallistic(p, terrain, wind, tanks, owner, seek);
    if (p.y < peak) peak = p.y;
    if (r) return { x: p.x, y: p.y, hit: r.hit, tank: r.tank || null, drop: p.y - peak, speed: Math.hypot(p.vx, p.vy), lock: p.lastLock || null, early: p.age < splitAt }; // early: it hit before it could split or open
    if (past && !p.guide && (p.x - past.x) * past.dir > 160) return { x: p.x, y: p.y, hit: 'past', tank: null, drop: p.y - peak, speed: Math.hypot(p.vx, p.vy), lock: null, early: false };
    if (p.age === dropAt) Object.assign(p, { y: p.y + 4, vx: p.vx * 0.5, vy: Math.min(Math.max(p.vy, 0) * 0.5 + 1, 6), drift: BOMBLET_DRIFT, guide: null });
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

function bonusFactor(w, drop, speed, launch = Math.PI / 4) {
  if (w.kind === 'laser') return 1;
  const alt = altitudeBonus(drop, launch);
  const kin = Math.min(KINETIC_MAX, Math.max(0, speed - KINETIC_MIN_SPEED) * KINETIC_PER_SPEED * (w.kin || 1));
  return (1 + alt) * (1 + kin);
}
