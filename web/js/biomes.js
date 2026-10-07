'use strict';
// Map environments. A3 shipped one, "Snowy Day"; Forest and Desert follow the same recipe: a sky,
// three parallax ridges, ground colours, a kind of tree, ambient particles, the weather fronts that
// can form there, and the rising sudden-death hazard. Terrain shape varies a little too (desert
// dunes are smoother and lower).

const BIOMES = {
  snow: {
    id: 'snow', name: 'Snowy Day',
    sky: [[166, 160, 204], [188, 172, 210]],
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
    particles: { kind: 'leaves', n: 50, colors: [[246, 150, 186], [252, 176, 96], [255, 222, 120], [255, 244, 250]] },
    terrain: { rough: 0.48, disp: 280, peaks: [2, 3], h: [220, 440], w: [360, 560] },
    fronts: ['force', 'storm', 'gale', 'rain'],
    sudden: { name: 'Pollen haze', color: [244, 196, 214], alpha: 0.66, start: 'Pollen haze! It is rising from the meadow: get to high ground.', hurt: 'is choking on pollen' },
    fort: { stone: '#d8d0dc', light: '#ece6ee', dark: '#b4a8ba', cap: '#f6a8c4' },
  },
};
const BIOME_IDS = Object.keys(BIOMES);

// trees by kind: height in world units for size h (3..5), and the box art
function treeHeight(kind, h) {
  return kind === 'broadleaf' ? 14 + h * 9 : kind === 'cactus' ? 8 + h * 7 : kind === 'lily' ? 16 + h * 6 : 8 + h * 8;
}

// Alstroemeria (Peruvian lily): a tall stem with leaves and a head of streaked petals
const LILY_COLS = [['rgb(244,128,176)', 'rgb(200,80,130)'], ['rgb(252,160,72)', 'rgb(210,100,40)'], ['rgb(250,214,90)', 'rgb(200,150,40)']];

function drawTree(ctx, kind, x, base, h, autumn) {
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
