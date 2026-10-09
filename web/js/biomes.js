'use strict';
// Map environments. A3 shipped one, "Snowy Day"; Forest and Desert follow the same recipe: a sky,
// three parallax ridges, ground colours, a kind of tree, ambient particles, the weather fronts that
// can form there, and the rising sudden-death hazard. Terrain shape varies a little too (desert
// dunes are smoother and lower).

const BIOMES = {
  snow: {
    // A3's Snowy Day, now placed: the far territories of Alstroemeria, out past the stilt-cities,
    // where all you see of the cooperative is the ring across the sky
    id: 'snow', name: 'The Far Territories',
    sky: [[166, 160, 204], [188, 172, 210]],
    skyArt: { ring: true },
    layers: [
      { color: 'rgb(3,21,46)', rough: 0.7, parallax: 0.45, lift: 60 },
      { color: 'rgb(52,51,50)', rough: 0.65, parallax: 0.6, lift: 90 },
      { color: 'rgb(188,195,210)', rough: 0.55, parallax: 0.75, lift: 230 },
    ],
    ground: 'rgb(241,243,246)', cap: null, soot: [96, 66, 44],
    tree: 'pine', trees: 1, ridgeTrees: true,
    particles: { kind: 'snow', n: 70, colors: [[248, 244, 252]] },
    terrain: { rough: 0.5, disp: 320, peaks: [2, 3], h: [280, 560], w: [320, 520] },
    fronts: ['force', 'storm', 'blizzard', 'updraft'],
    sudden: { name: 'Whiteout', color: [236, 240, 250], alpha: 0.62, start: 'Whiteout! Freezing fog is rising: get to high ground.', hurt: 'is freezing in the fog' },
    fort: { stone: '#8d8c95', light: '#a9a8b2', dark: '#6b6a74', cap: '#f4f5f8' },
  },
  forest: {
    id: 'forest', name: 'Autumn Forest',
    sky: [[158, 196, 214], [214, 222, 196]],
    layers: [
      { color: 'rgb(34,58,44)', rough: 0.7, parallax: 0.45, lift: 60 },
      { color: 'rgb(70,96,60)', rough: 0.65, parallax: 0.6, lift: 90 },
      { color: 'rgb(150,170,130)', rough: 0.55, parallax: 0.75, lift: 230 },
    ],
    ground: 'rgb(120,92,62)', cap: 'rgb(104,150,72)', soot: [40, 30, 22],
    tree: 'broadleaf', trees: 2.4, ridgeTrees: true,
    particles: { kind: 'leaves', n: 40, colors: [[214, 120, 40], [230, 170, 50], [170, 70, 40], [120, 150, 60]] },
    terrain: { rough: 0.5, disp: 300, peaks: [2, 3], h: [240, 480], w: [320, 520] },
    fronts: ['force', 'storm', 'rain', 'gale'],
    sudden: { name: 'Flood', color: [70, 112, 132], alpha: 0.6, start: 'Flood! The river is rising: get to high ground.', hurt: 'is caught in the flood' },
    fort: { stone: '#7a5a3a', light: '#94704a', dark: '#5a4028', cap: '#6a9a48' },
  },
  desert: {
    id: 'desert', name: 'Dune Sea',
    sky: [[236, 196, 150], [250, 226, 182]],
    layers: [
      { color: 'rgb(150,96,60)', rough: 0.6, parallax: 0.45, lift: 60 },
      { color: 'rgb(196,140,88)', rough: 0.55, parallax: 0.6, lift: 90 },
      { color: 'rgb(226,184,126)', rough: 0.5, parallax: 0.75, lift: 230 },
    ],
    ground: 'rgb(222,184,124)', cap: 'rgb(240,212,160)', soot: [90, 60, 40],
    tree: 'cactus', trees: 0.6, ridgeTrees: false,
    particles: { kind: 'sand', n: 60, colors: [[214, 176, 120], [190, 150, 100]] },
    terrain: { rough: 0.44, disp: 260, peaks: [2, 3], h: [200, 400], w: [400, 620] },
    fronts: ['force', 'sandstorm', 'updraft', 'gale'],
    sudden: { name: 'Quicksand', color: [200, 160, 104], alpha: 0.7, start: 'Quicksand! The sand is rising: get to high ground.', hurt: 'is sinking in the sand' },
    fort: { stone: '#c49a64', light: '#dcb47c', dark: '#9a744a', cap: '#e8c890' },
  },
  alstroemeria: {
    id: 'alstroemeria', name: 'Alstroemeria',
    sky: [[248, 206, 210], [255, 234, 218]],
    layers: [
      { color: 'rgb(150,112,160)', rough: 0.6, parallax: 0.45, lift: 60 },
      { color: 'rgb(214,150,178)', rough: 0.55, parallax: 0.6, lift: 90 },
      { color: 'rgb(214,232,206)', rough: 0.5, parallax: 0.75, lift: 230 },
    ],
    ground: 'rgb(110,150,90)', cap: 'rgb(150,196,112)', soot: [70, 50, 40],
    tree: 'lily', trees: 2.6, ridgeTrees: false,
    rail: true, // a Melbourne-style skyrail across the near ridge, with a train now and then (background.js)
    particles: { kind: 'leaves', n: 50, colors: [[246, 150, 186], [252, 176, 96], [255, 222, 120], [255, 244, 250]] },
    terrain: { rough: 0.48, disp: 280, peaks: [2, 3], h: [220, 440], w: [360, 560] },
    fronts: ['force', 'storm', 'gale', 'rain'],
    sudden: { name: 'Pollen haze', color: [244, 196, 214], alpha: 0.66, start: 'Pollen haze! It is rising from the meadow: get to high ground.', hurt: 'is choking on pollen' },
    fort: { stone: '#d8d0dc', light: '#ece6ee', dark: '#b4a8ba', cap: '#f6a8c4' },
  },
  // Alstroemeria, the cooperative's core-world tundra planet, far out from a small M-dwarf, and the
  // Alstroemeria Exo-Surface Ring (AESR) NXi built round it. Three faces of one world, and one rule
  // across them: heat is hierarchy.
  // AESR-U, the upper skin: the ring's top face, the deck, where most people live on the ring's own
  // exhaust: stilt-rows with warm windows, the heat main, radiator fields, sky relays, the patch train.
  aesru: {
    id: 'aesru', name: 'AESR-U · The Deck',
    sky: [[22, 20, 44], [74, 54, 80]],
    skyArt: { stars: 90, sun: [0.8, 0.2, 7, [255, 120, 80]] },
    layers: [
      { color: 'rgb(30,30,52)', rough: 0.6, parallax: 0.45, lift: 90, blocks: [40, 110], windows: [255, 196, 120] },
      { color: 'rgb(52,48,74)', rough: 0.55, parallax: 0.6, lift: 120, blocks: [30, 80], windows: [255, 176, 96] },
      { color: 'rgb(86,82,104)', rough: 0.5, parallax: 0.75, lift: 200 },
    ],
    ground: 'rgb(76,82,98)', cap: 'rgb(150,156,170)', soot: [30, 26, 30], style: 'deck',
    tree: 'vent', trees: 1.2, ridgeTrees: false, rail: true, props: 'deck',
    particles: { kind: 'steam', n: 16, colors: [[236, 236, 244], [210, 214, 228]] },
    terrain: { rough: 0.44, disp: 240, peaks: [2, 3], h: [200, 420], w: [380, 560], terrace: 44 },
    fronts: ['force', 'gale', 'storm', 'updraft'],
    sudden: { name: 'Heat cut', color: [176, 214, 240], alpha: 0.6, start: 'The exchangers have cut this district\'s heat: the cold is rising off the deck. Get to high ground.', hurt: 'is freezing as the heat goes' },
    fort: { stone: '#6a7084', light: '#868ca0', dark: '#4c5064', cap: '#c8a040' },
  },
  // AESR-L, the infra face: the ring's underside at bedrock datum. Old, industrial, warm, dark and
  // breathing: derelict datacentre halls nobody isolated, the ground mains, risers into the dark,
  // the AHUs nobody has dated, and ruins far older than any of it.
  aesrl: {
    id: 'aesrl', name: 'AESR-L · The Roots',
    sky: [[12, 10, 12], [58, 36, 26]],
    skyArt: { ceiling: true },
    layers: [
      { color: 'rgb(40,32,34)', rough: 0.7, parallax: 0.45, lift: 110, blocks: [50, 140], ruins: true },
      { color: 'rgb(30,32,40)', rough: 0.55, parallax: 0.6, lift: 120, blocks: [60, 120], racks: true },
      { color: 'rgb(58,48,46)', rough: 0.6, parallax: 0.75, lift: 210 },
    ],
    ground: 'rgb(48,42,46)', cap: 'rgb(86,70,60)', soot: [20, 14, 12], style: 'veins',
    tree: 'rack', trees: 1, ridgeTrees: false, props: 'roots',
    particles: { kind: 'motes', n: 40, colors: [[255, 170, 80], [255, 120, 60], [255, 210, 140]] },
    terrain: { rough: 0.6, disp: 340, peaks: [2, 3], h: [240, 500], w: [300, 480] },
    fronts: ['force', 'storm', 'updraft', 'rain'],
    sudden: { name: 'Coolant flood', color: [40, 150, 156], alpha: 0.62, start: 'A ground main has burst: coolant is flooding the roots. Get to high ground.', hurt: 'is drowning in coolant' },
    fort: { stone: '#4a4448', light: '#62585a', dark: '#2e2a2e', cap: '#c87a3a' },
  },
  // ASTM-G, the ground: alpine, dry and cold, fractured by recent quakes, right under the
  // stilt-cities: their stilts, drilled kilometres into bedrock, stand all round, and the cities'
  // undersides hang overhead, warm with waste heat. Everything not on stilts is a test range.
  astmg: {
    id: 'astmg', name: 'ASTM-G · The Ground',
    sky: [[118, 120, 140], [196, 188, 186]],
    skyArt: { underside: true },
    layers: [
      { color: 'rgb(120,128,150)', rough: 0.78, parallax: 0.45, lift: 200, stilts: [240, 420] },
      { color: 'rgb(92,96,112)', rough: 0.6, parallax: 0.6, lift: 110, stilts: [260, 460] },
      { color: 'rgb(150,146,144)', rough: 0.6, parallax: 0.75, lift: 210, stilts: [380, 640] },
    ],
    ground: 'rgb(132,124,118)', cap: 'rgb(214,220,228)', soot: [50, 40, 34], style: 'fractured',
    tree: 'marker', trees: 0.5, ridgeTrees: false, props: 'range',
    particles: { kind: 'snow', n: 28, colors: [[236, 240, 248]] },
    terrain: { rough: 0.56, disp: 340, peaks: [2, 4], h: [300, 600], w: [260, 440] },
    fronts: ['force', 'blizzard', 'gale', 'storm'],
    sudden: { name: 'Range smoke', color: [140, 132, 126], alpha: 0.66, start: 'Live test on the range: smoke and fallout are rolling in. Get to high ground.', hurt: 'is choking on the range smoke' },
    fort: { stone: '#7e7a7c', light: '#9a9698', dark: '#5c585a', cap: '#d8dce4' },
  },
};
const BIOME_IDS = Object.keys(BIOMES);

// trees by kind: height in world units for size h (3..5), and the box art
function treeHeight(kind, h) {
  return kind === 'broadleaf' ? 14 + h * 9 : kind === 'cactus' ? 8 + h * 7 : kind === 'lily' ? 16 + h * 6 :
    kind === 'vent' ? 10 + h * 5 : kind === 'rack' ? 12 + h * 4 : kind === 'marker' ? 16 + h * 6 : 8 + h * 8;
}

// Alstroemeria (Peruvian lily): a tall stem with leaves and a head of streaked petals
const LILY_COLS = [['rgb(244,128,176)', 'rgb(200,80,130)'], ['rgb(252,160,72)', 'rgb(210,100,40)'], ['rgb(250,214,90)', 'rgb(200,150,40)']];

function drawTree(ctx, kind, x, base, h, autumn) {
  if (kind === 'vent' || kind === 'rack' || kind === 'marker') { drawFixture(ctx, kind, x, base, h, autumn); return; }
  if (kind === 'lily') {
    const top = base - treeHeight(kind, h);
    ctx.fillStyle = 'rgb(76,128,64)';
    ctx.fillRect(x - 1, top + 6, 3, base - top - 6);
    ctx.fillRect(x - 6, base - 12, 5, 3);
    ctx.fillRect(x + 2, base - 18, 5, 3);
    const [petal, streak] = LILY_COLS[(autumn || 0) % 3];
    ctx.fillStyle = petal; // six petals as boxes around the heart
    ctx.fillRect(x - 7, top + 2, 6, 5);
    ctx.fillRect(x + 2, top + 2, 6, 5);
    ctx.fillRect(x - 3, top - 3, 7, 5);
    ctx.fillRect(x - 5, top + 6, 4, 4);
    ctx.fillRect(x + 2, top + 6, 4, 4);
    ctx.fillStyle = streak; // the tiger-stripe streaks alstroemeria petals have
    ctx.fillRect(x - 5, top + 3, 2, 1);
    ctx.fillRect(x + 4, top + 3, 2, 1);
    ctx.fillRect(x - 1, top - 2, 2, 1);
    ctx.fillStyle = 'rgb(255,236,140)';
    ctx.fillRect(x - 1, top + 3, 3, 3);
    return;
  }
  if (kind === 'broadleaf') {
    ctx.fillStyle = 'rgb(84,58,40)';
    ctx.fillRect(x - 2, base - 14, 5, 14);
    const top = base - treeHeight(kind, h);
    const leaf = autumn === 0 ? 'rgb(196,104,40)' : autumn === 1 ? 'rgb(214,160,52)' : 'rgb(92,132,58)';
    const shade = autumn === 0 ? 'rgb(160,80,34)' : autumn === 1 ? 'rgb(176,128,40)' : 'rgb(70,104,46)';
    const w = 10 + h * 4;
    ctx.fillStyle = shade;
    ctx.fillRect(x - w / 2, top + 6, w, base - 12 - top - 6);
    ctx.fillStyle = leaf;
    ctx.fillRect(x - w / 2 + 3, top, w - 6, base - 14 - top - 2);
    ctx.fillRect(x - w / 2, top + 6, w - 4, base - 20 - top - 6);
  } else if (kind === 'cactus') {
    const top = base - treeHeight(kind, h);
    ctx.fillStyle = 'rgb(78,128,70)';
    ctx.fillRect(x - 3, top, 7, base - top);
    ctx.fillRect(x - 10, top + 10, 4, 12);
    ctx.fillRect(x - 10, top + 18, 8, 4);
    ctx.fillRect(x + 7, top + 6, 4, 10);
    ctx.fillRect(x + 3, top + 14, 8, 4);
    ctx.fillStyle = 'rgb(108,160,92)';
    ctx.fillRect(x - 1, top + 2, 2, base - top - 4);
  } else {
    ctx.fillStyle = 'rgb(70,56,50)';
    ctx.fillRect(x - 2, base - 8, 4, 8);
    for (let i = 0; i < h; i++) {
      const w = (h - i) * 6 + 4;
      const y = base - 8 - (i + 1) * 8;
      ctx.fillStyle = 'rgb(38,62,64)';
      ctx.fillRect(x - w / 2, y, w, 8);
      ctx.fillStyle = 'rgb(236,240,246)';
      ctx.fillRect(x - w / 2, y, Math.ceil(w * 0.45), 2); // snow on the boughs
    }
  }
}

// the AESR / ASTM-G maps' small furniture, standing in for trees (they stop shells and get knocked
// down the same way): heat vents on the deck, server racks in the roots, range markers on the ground
function drawFixture(ctx, kind, x, base, h, v) {
  const top = base - treeHeight(kind, h);
  if (kind === 'vent') { // an exhaust stack, its cowl, and the warm glow inside
    ctx.fillStyle = 'rgb(96,100,116)'; ctx.fillRect(x - 3, top + 4, 7, base - top - 4);
    ctx.fillStyle = 'rgb(130,134,150)'; ctx.fillRect(x - 6, top, 13, 5);
    ctx.fillStyle = 'rgb(255,150,70)'; ctx.fillRect(x - 4, top + 5, 9, 2);
    ctx.fillStyle = 'rgb(70,74,90)'; ctx.fillRect(x - 6, base - 4, 13, 4);
  } else if (kind === 'rack') { // a server cabinet: a dark box with rows of status lights, some dead
    const w = 12;
    ctx.fillStyle = 'rgb(30,30,38)'; ctx.fillRect(x - w / 2, top, w, base - top);
    ctx.fillStyle = 'rgb(56,56,68)'; ctx.fillRect(x - w / 2, top, w, 2);
    for (let y = top + 4, i = 0; y < base - 3; y += 4, i++) {
      const on = hash2(x + i, h) > 0.3;
      ctx.fillStyle = on ? (hash2(i, x) > 0.8 ? 'rgb(255,170,60)' : 'rgb(90,240,190)') : 'rgb(50,50,60)';
      ctx.fillRect(x - w / 2 + 2, y, 2, 2);
      ctx.fillStyle = 'rgb(44,44,54)'; ctx.fillRect(x - w / 2 + 5, y, 5, 2);
    }
  } else { // a test-range marker: a striped pole with a flag and a number board
    for (let y = top, i = 0; y < base; y += 6, i++) { ctx.fillStyle = i % 2 ? 'rgb(240,240,236)' : 'rgb(214,64,48)'; ctx.fillRect(x - 1, y, 3, Math.min(6, base - y)); }
    ctx.fillStyle = 'rgb(240,180,60)'; ctx.fillRect(x + 2, top, 8, 5);
    ctx.fillStyle = 'rgb(40,40,44)'; ctx.fillRect(x - 5, base - 14, 11, 7);
    ctx.fillStyle = 'rgb(240,240,236)'; ctx.fillRect(x - 3, base - 12, 2, 3); ctx.fillRect(x + 1, base - 12, 3, 3);
  }
}
