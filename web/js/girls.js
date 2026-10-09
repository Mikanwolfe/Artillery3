'use strict';
// Turret girls: the playable vehicles drawn as slim, posed MapleStory-style chibi "turret girls"
// (after the original Artillery illustrations) wearing a compact rig with a little round turret.
// Pure pixel art: every pixel is an axis-aligned fillRect on a 2-unit grid (one sprite "pixel" =
// GIRL_P world units). Sprites are built from string-grid layers (one char per pixel, mapped to
// palette keys): rig, hair, body, arm, legs, face, bangs, hat. Each distinct frame is composed
// once, given a soft "selective" outline (every edge pixel is outlined in a darker shade of the
// colour it touches), merged into boxes and cached.
//
// API
//   GIRL_ART[id]            id in 'gwt' | 'obj' | 'int' | 'nxi' | 'alb' | 'ang'
//     .pivot  [lx, ly]      gun trunnion (world units, facing right, relative to the ground point)
//     .barrel { size, twin, triple, n, step, start }  suggested barrel: n squares of `size`,
//                           `step` apart starting `start` from the pivot (twin: two parallel lines,
//                           triple: three)
//     .height, .headTop     overall height (world units, standing) and the y of the top of her
//                           head/hat/hair ornament (negative, relative to the ground point)
//   drawGirl(ctx, o)        girl + rigging, without the barrel
//   drawGirlMount(ctx, o)   small mount cap over the barrel root (call after the barrel)
//   girlPivotOffset(o)      [dx, dy] world units to add to the pivot this frame (non-zero only
//                           during the 'win' hop, when the whole girl and rig lift off the ground)
//   o = { id, x, y, facing, color, state: 'ok'|'damaged'|'wreck', t, walking, flash,
//         pose: 'idle'|'fire'|'hit'|'win', poseT: seconds since the pose started }
//   Poses: 'fire' (0.35 s) recoil lean, braced legs, hair flicks back, > < eyes;
//          'hit' (0.5 s) flinch backwards, eyes squeezed shut, shock sparks and sweat;
//          'win' (loops) V-sign, ^ ^ eyes, a hop every 0.8 s. 'fire'/'hit' fall back to idle
//          after their length. Wrecks ignore poses. Walking is a 4-frame stride.

const GIRL_P = 2; // world units per sprite pixel
const GIRL_GW = 34; // grid width (pixels)
const GIRL_GH = 36; // grid height; the bottom row stands on the ground point
const GIRL_AX = 19; // grid column whose left edge is the ground point x
const GIRL_SIT = 9; // wrecks: how far the upper body drops when she sits down

// Palette keys (per girl overrides in GIRL_DEFS[id].pal):
//   .  transparent        _  erase                         o<k> outline of k (automatic)
//   s/S skin/shade        e  lash/dark   I/i iris dark/light   w/W white/shade  b blush  m mouth
//   d  sweat/tear         h/H/L hair/shade/highlight       c/C hat or scarf / shade   y/Y gold
//   u/U/z top / shade / light          x/X stockings, boots    T shell nose / grey
//   p/P/q player colour / dark / light  r/R/g rigging / dark / light   k/K scorch / soot
//   n  hair tie        B  beacon (blinks MAIA pink)       a/v/N aurora teal / violet / blue
const GIRL_BASE_PAL = {
  s: '#ffe8d8', S: '#f4c2ac', e: '#3a2440', w: '#ffffff', W: '#d6d8ee', b: '#ff9db4', m: '#e0607a',
  d: '#a8e6ff', y: '#ffd65a', Y: '#d99a2a', x: '#2e2a3a', X: '#5a5470', f: '#2a2430', T: '#7c8090',
  k: '#3a3436', K: '#6e6466', B: '#8a4a72',
};
const GIRL_OUTLINE = { f: '#1c1826', s: '#cf8a7e', S: '#cf8a7e', b: '#cf8a7e', m: '#cf8a7e', e: '#2a1c30', x: '#1c1826', X: '#1c1826', w: '#a9abcc', W: '#a9abcc', y: '#b57a1e', Y: '#9a6418', d: '#6ab4e0' };

// ---- shared parts (columns: face 14-23, eyes 15-17 / 20-22, rows: head 5-16, body 17-24,
// legs 25-35) ----
const GIRL_HEAD_BACK = [
  '....hhhhhh',
  '..hhhhhhhhhh',
  '.hhhhhhhhhhhh',
  '.hhhhhhhhhhhhH',
  'hhhhhhhhhhhhhH',
  'hhhhhhhhhhhhhH',
  'hhhhhhhhhhhhhH',
  'hhhh.........H',
  'hhhh.........H',
  'Hhhh.........H',
  '.Hhh.........H',
  '..H',
];
const GIRL_FACE = { at: 9, x0: 14, rows: [
  'ssssssssss',
  'ssssssssss',
  'seeesseees',
  'swIIsswIIs',
  'sIIIssIIIs',
  'siiissiiis',
  'sbbssmsbbs',
  '..SssssS',
] };
const GIRL_EYE_CELLS = [];
for (let r = 11; r <= 14; r++) for (const c of [15, 16, 17, 20, 21, 22]) GIRL_EYE_CELLS.push(['s', c, r]);
const GIRL_FACES = {
  blink: [...GIRL_EYE_CELLS, ['e', 15, 13], ['e', 16, 13], ['e', 17, 13], ['e', 20, 13], ['e', 21, 13], ['e', 22, 13]],
  squint: [...GIRL_EYE_CELLS, ['e', 15, 11], ['e', 16, 12], ['e', 17, 13], ['e', 16, 14], ['e', 15, 15],
    ['e', 22, 11], ['e', 21, 12], ['e', 20, 13], ['e', 21, 14], ['e', 22, 15], ['m', 18, 15], ['m', 19, 15]],
  hit: [...GIRL_EYE_CELLS, ['e', 15, 11], ['e', 16, 12], ['e', 17, 13], ['e', 16, 14], ['e', 15, 15],
    ['e', 22, 11], ['e', 21, 12], ['e', 20, 13], ['e', 21, 14], ['e', 22, 15],
    ['m', 19, 15], ['m', 19, 16], ['m', 18, 16], ['d', 24, 9], ['d', 24, 10], ['d', 25, 10]],
  happy: [...GIRL_EYE_CELLS, ['e', 15, 13], ['e', 16, 12], ['e', 17, 13], ['e', 20, 13], ['e', 21, 12], ['e', 22, 13],
    ['m', 18, 15], ['m', 19, 16], ['m', 20, 15], ['s', 19, 15]],
  worried: [['m', 19, 16], ['s', 19, 15], ['d', 24, 9], ['d', 24, 10]],
  dizzy: [...GIRL_EYE_CELLS, ['e', 15, 11], ['e', 17, 11], ['e', 16, 12], ['e', 15, 13], ['e', 17, 13],
    ['e', 20, 11], ['e', 22, 11], ['e', 21, 12], ['e', 20, 13], ['e', 22, 13],
    ['m', 18, 16], ['m', 19, 15], ['m', 20, 16], ['s', 19, 16], ['d', 23, 13], ['d', 23, 14]],
};
const GIRL_SPARKS = [['w', 21, 1], ['w', 24, 0], ['w', 26, 2], ['w', 18, 0]];

// victory arm (V-sign) beside her face; '*' = sleeve, '+' = sleeve shade, '#' = armband
const GIRL_ARM_UP = { at: 6, x0: 22, rows: [
  '..s.s',
  '..s.s',
  '..sss',
  '..sS',
  '..*',
  '..*',
  '..#',
  '..*',
  '..+',
  '.*',
  '.*',
  '*',
] };

// Legs, drawn from templates: A thigh (skin), T upper leg (stockings or skin), B shin, F foot.
// Rows 25-35, columns from x0 14.
const GIRL_LEGS = {
  // weight on the back leg, front knee bent in, front foot on its toes (G.W. Tiger)
  contra: [
    '.AA..AA', '.AA..AA', '.TT..TT', '.TT.TT', '.TT.TT', '.BB..BB',
    '.BB..BB', '.BB...BB', '.BB...BB', '.FFF..FF', '.FFF...FF'],
  // one boot stepped forward (Object 15X)
  step: [
    '..AA.AA', '..AA.AA', '..TT..TT', '..TT..TT', '..TT...TT', '..BB...BB',
    '..BB...BB', '..BB....BB', '..BB....BB', '..FFF...FFF', '..FFF...FFF'],
  // knees together, feet apart (Innocentia)
  knock: [
    '..AA.AA', '..AA.AA', '..TT.TT', '...TTTT', '...TTTT', '..BB.BB',
    '..BB..BB', '.BB...BB', '.BB...BB', '.FFF..FFF', '.FFF..FFF'],
  // parade rest, feet a little apart (November)
  parade: [
    '..AA.AA', '..AA.AA', '..TT.TT', '..TT.TT', '..TT.TT', '.BB...BB',
    '.BB...BB', '.BB...BB', '.BB...BB', '.FFF..FFF', '.FFF..FFF'],
  // 4-frame stride
  w0: [
    '..AAAAA', '..AA.AA', '.TT...TT', '.TT...TT', 'TT.....TT', 'BB.....BB',
    'BB......BB', 'BB......BB', 'BB......BB', 'FF......FFF', 'F.......FFF'],
  w1: [
    '..AAAA', '..AAAA', '..TTTT', '..TTTT', '.TT.TT', 'BB..BB',
    'BB..BB', 'FF..BB', '....BB', '....FFF', '....FFF'],
  w2: [
    '..AAAAA', '..AA.AA', '..TT..TT', '.TT...TT', '.TT....TT', 'BB.....BB',
    'BB.....BB', 'BB......BB', 'BB......BB', 'FF......FFF', 'FF......FFF'],
  w3: [
    '..AAAA', '..AA.AA', '..TT.TTT', '..TT..TT', '..TT..BB', '..BB..BB',
    '..BB..FFF', '..BB', '..BB', '..FFF', '..FFF'],
  // wide braced stance (fire)
  brace: [
    '..AA.AA', '.AA...AA', '.TT...TT', 'TT.....TT', 'TT.....TT', 'BB.....BB',
    'BB......BB', 'BB......BB', 'BB......BB', 'FFF.....FFF', 'FFF.....FFF'],
};
// sitting (wreck): legs stretched forward along the ground, from column 20
const GIRL_LEGS_SIT = { at: 33, x0: 20, rows: ['..........F', 'AAAATTBBBBF', 'AAAATTBBBBF'] };

// Layers: { at: first row, x0: first column, rows: [...] }.
const GIRL_DEFS = {
  // G.W. Tiger: long straight platinum hair past her waist (player-colour bow), red-orange eyes,
  // a dark navy sleeveless bodysuit with a gold collar ornament on a player-colour choker, black
  // thigh-highs; leaning on one hip, hand on hip. Dark-steel back pack with a round turret.
  gwt: {
    pivot: [7, 10],
    barrel: { size: 4, twin: false, n: 6, step: 4.5, start: 5 },
    pal: {
      h: '#f1e8d2', H: '#c8bb9c', L: '#ffffff', I: '#c2402a', i: '#ff8a4a',
      u: '#2c3260', U: '#1c2042', z: '#4a5390',
      r: '#6c7280', R: '#474c58', g: '#a2a8b6',
    },
    legs: 'contra', legMap: { A: 's', T: 'x', B: 'x', F: 'f' },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front'],
    rig: { at: 8, x0: 3, rows: [
      '...ggg',
      '..ggrrR',
      '.grrrrrR',
      '.grpppRR',
      '.gggggggg',
      'grrrrrrrrR',
      'grqqqqqrrR',
      'grpppppRrR',
      'grPPPPPrrR',
      'grrrrrrrrR',
      'gRrRrRrRrR',
      '.RRRRRRRR',
    ] },
    tail: { at: 12, x0: 7, sway: [19, 23], rows: [
      '...hhhh',
      '..hhhhh',
      '..hLhhhh',
      '.hhLhhhH',
      '.hhLhhhH',
      '.hhLhhhH',
      '.hhLhhhH',
      'pphpphH',
      'pqPqphH',
      'pphppH',
      'hhhhhH',
      '.hhhhH',
      '.hhhH',
      '..hhH',
      '..hH',
      '...H',
    ] },
    back: { at: 5, x0: 11, rows: GIRL_HEAD_BACK },
    front: { at: 7, x0: 11, rows: [
      '..LLLhhLLLh',
      '.hhhhhhhhhhhhH',
      'hhhhLhhhhhLhhH',
      'hhhhhhh.hhh.hH',
      '..hH', '..hH', '..hH', '..hH', '..hH', '..hH', '..hH', '..hH',
      '...H',
    ] },
    body: { at: 17, x0: 14, rows: [
      '....pP',
      '..suuyus',
      '.szuuuuU',
      '.szuuuuU',
      '.s.uuuU',
      '.SzuuuuU',
      '..zuuuU',
      '.ss..ss',
    ] },
    arm: { at: 19, x0: 21, rows: ['.s', '..s', '.s', 's'] },
    sleeve: 'sSs',
    mount: [['R', -1, -1, 4, 3], ['g', -1, -1, 4, 1], ['p', 0, 1, 2, 1]],
  },

  // Object 15X: blonde high ponytail (player-colour tie) swinging behind her, blue eyes, khaki
  // cropped jacket with a high collar, khaki pleated mini skirt, player-colour armband, black
  // thigh-highs and boots, one boot forward, hand on hip. Brass/olive hip pack with a stowed spade and a turret on a tall mast.
  obj: {
    pivot: [6, 4],
    barrel: { size: 6, twin: false, n: 5, step: 4.5, start: 6 },
    pal: {
      h: '#ffd65a', H: '#e0a43a', L: '#fff3b0', n: '#6ac8ff', I: '#2f6fd0', i: '#6fb4ff',
      u: '#b49a5a', U: '#8a7440', z: '#d6c080', X: '#3a2a26',
      r: '#7f8a5a', R: '#5a6340', g: '#aab67e',
    },
    legs: 'step', legMap: { A: 's', T: 'x', B: 'x', F: 'f' },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front'],
    rig: { at: 2, x0: 2, rows: [
      '...ggg',
      '..ggrrR',
      '.grrrrrR',
      '.grpppRR',
      '.gggggggg',
      'grrrrrrrrR',
      'grqqqqqrrR',
      'grpppppRrR',
      'grPPPPPrrR',
      'grrrrrrrrR',
      'gRgRgRgRrR',
      'grrrrrrrrR',
      'grqqqqqrrR',
      'grpppppRrR',
      'grPPPPPrrR',
      'grrrrrrrrR',
      '.RRRRRRRR',
      '.gR',
      '.gR',
      '.gg',
    ] },
    tail: { at: 5, x0: 1, sway: [9, 12], rows: [
      '........hh',
      '......hhhhpp',
      '...hhhhLhhpP',
      '.hhhLLhhhH',
      'hhhLhhhHH',
      'hhLhhHH',
      'hLhhH',
      'hhhH',
      '.hhH',
      '.hH',
      '..H',
    ] },
    back: { at: 5, x0: 11, rows: GIRL_HEAD_BACK.slice(0, 10).concat(['..H']) },
    front: { at: 7, x0: 11, rows: [
      '..LLLhhLLLh',
      '.hhhhhhhhhhhhH',
      'hhhhhLhhhhLhhH',
      'hhhhh.hhhh.hhH',
      '..hH', '..hH', '..hH', '..hH',
      '...H',
    ] },
    body: { at: 17, x0: 14, rows: [
      '...zuuU',
      '..zuuuuU',
      '.szuuyuU',
      '.szuuuuU',
      '.s.UUUU',
      '.Szzzzzu',
      '.uuUuuUuu',
      '.UUUUUUUU',
    ] },
    arm: { at: 18, x0: 21, rows: ['pP', '.s', '..s', '.s', 's'] },
    sleeve: 'sSp',
    mount: [['R', -2, -1, 5, 3], ['g', -2, -1, 5, 1], ['p', -1, 1, 3, 1]],
  },

  // Innocentia: short-medium red hair with an ahoge and a little uplink antenna clip with a
  // blinking MAIA-pink beacon, violet eyes, a long player-colour scarf with gold ends trailing
  // behind, a tan sleeveless bodysuit, black knee socks and chunky boots, hugging a shell.
  // White uplink pack with a dish and a twin-gun turret behind her shoulder.
  int: {
    pivot: [6, 10],
    barrel: { size: 3, twin: true, n: 7, step: 3, start: 5 },
    pal: {
      h: '#e4553e', H: '#a8302a', L: '#ff9f7e', I: '#7a3ab0', i: '#c88cf0',
      c: '#d42c3c', C: '#981a2a', u: '#cda476', U: '#9e7852', z: '#e6c896', X: '#26222e',
      r: '#dfe3ee', R: '#a4aac0', g: '#ffffff',
    },
    legs: 'knock', legMap: { A: 's', T: 's', B: 'x', F: 'f' },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front'],
    rig: { at: 8, x0: 0, rows: [
      '....ggg',
      '...ggrrR',
      '..grrrrrR',
      '..grpppRR',
      'g.gggggggg',
      'gggrrrrrrrR',
      '.ggrqqqqrrR',
      '..grppppRrR',
      '..grPPPPrrR',
      '..grrrrrrrR',
      '..gBrRrRrrR',
      '...RRRRRRR',
    ] },
    tail: { at: 17, x0: 8, sway: [21, 24], rows: [
      '......ppp',
      '....pppP',
      '...ppPp',
      '..ppP.pP',
      '..pP..pP',
      '.ppP..yY',
      '.pP',
      'ppP',
      'pP',
      'yY',
      'yY',
    ] },
    back: { at: 5, x0: 11, rows: GIRL_HEAD_BACK.slice(0, 11).concat(['.Hhh.........H', '.hhH.........H', '..hH', '..H']) },
    front: { at: 1, x0: 11, rows: [
      '..BB',
      '..R.....hh',
      '..R....h',
      '..R',
      '..R',
      '..pp',
      '..LLLhhLLLh',
      '.hhhhhhhhhhhhH',
      'hhhhLhhhhhLhhH',
      'hhhh.hhh.hh.hH',
      '..hH', '..hH', '..hH', '..hH', '..hH',
      '...H',
    ] },
    body: { at: 17, x0: 14, rows: [
      '...pppp',
      '..qppppP',
      '.szuuuuU',
      '.szuuuuU',
      '...uuuU',
      '..zuuuuU',
      '...uuuU',
      '..ss.ss',
    ] },
    // both arms round a shell (brass, grey nose)
    arm: { at: 19, x0: 13, rows: ['.Yyysyyysyy.', 'YYYYsYYYsYTT', '.YYY.....T'] },
    sleeve: 'sSs',
    mount: [['R', -1, -1, 4, 3], ['g', -1, -1, 4, 1], ['B', 1, 1, 1, 1]],
  },

  // November (NXi, November Division of the United Aurora Federation): composed at parade rest.
  // White peaked cap with the Queen's gold crown, long teal hair with a violet streak and an
  // aurora tip, teal eyes, a void-navy jacket with gold trim and coat tails, player-colour sash and
  // armband, navy thigh boots with gold bands. Battlecruiser hip block (aurora seam, player plates)
  // with a wide triple turret behind her shoulder.
  nxi: {
    pivot: [5, 10],
    barrel: { size: 4, twin: false, triple: true, n: 5, step: 4.5, start: 6 },
    pal: {
      h: '#27ae9f', H: '#187b73', L: '#86f2e0', v: '#9a6cf0', a: '#5ef0d0', N: '#6aa8ff',
      c: '#f6f8fc', C: '#c8cde0', U: '#171b36', u: '#262e5a', z: '#3d4986', I: '#0f8f84', i: '#5ef0d0',
      x: '#1d2140', X: '#1d2140', r: '#55669c', R: '#323d6c', g: '#93a3dc',
    },
    legs: 'parade', legMap: { A: 's', T: 'x', B: 'x', F: 'f' }, legBand: 27,
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front', 'hat'],
    rig: { at: 8, x0: 1, rows: [
      '..gggggg',
      '.gggrrrrR',
      'ggrrrrrrRR',
      'grpppppprR',
      'gggggggggg',
      'grrrrrrrrrR',
      'grqqqRqqqrR',
      'grpppRppprR',
      'RaaaNNNvvvR',
      'grPPPRPPPrR',
      'grrrrRrrrrR',
      'gRrRrRrRrRR',
      '.RRRRRRRRR',
    ] },
    tail: { at: 12, x0: 7, sway: [19, 23], rows: [
      '...hhhh',
      '..hhvhh',
      '..hhvhhh',
      '.hhhvhhH',
      '.hLhvhhH',
      '.hhhvhhH',
      '.hhhvhhH',
      'hhhvhhH',
      'hhLvhhH',
      'hhhvhH',
      'ahhvha',
      'aaNvNa',
      '.NNvv',
      '..vv',
    ] },
    back: { at: 5, x0: 11, rows: GIRL_HEAD_BACK },
    front: { at: 9, x0: 11, rows: [
      'hhhhhhvhhhLhhH',
      'hhhhhhv.hhh.hH',
      '..hHv', '..hHv', '..hH', '..hH', '..hH', '..hH', '..hH',
      '...H',
    ] },
    hat: { at: 3, x0: 11, rows: [
      '......y.y.y',
      '....ccyyyyycc',
      '..ccccccccccC',
      '.cccccccccccccC',
      '.CCCCCCCCCCCCCC',
      '.yyyyyyyyyyyyy',
      '.........UUUUUU',
    ] },
    body: { at: 17, x0: 14, rows: [
      '...yuuy',
      '..zuuupy',
      '..zuuppU',
      '.uzuppuU',
      'uu.ppuU',
      'uuzpuuuU',
      'uyyyyyyy',
      'uyss.ss',
    ] },
    arm: { at: 19, x0: 21, rows: ['p', 'P'] },
    sleeve: 'uUp',
    mount: [['R', -2, -1, 5, 3], ['g', -2, -1, 5, 1], ['a', -1, 1, 3, 1]],
  },

  // Alban Eiler (Lymilark Future Sciences): a knight-academy look after Mabinogi. Long chestnut
  // hair in a single braid down her back with a player-colour ribbon, green eyes, a forest-green
  // beret with a white feather, a white tunic coat with green collar, gold buttons and a green hem,
  // brown boots, one boot forward. A boxy rocket pod on her hip (tube mouths in a grid) with the
  // launcher turret on top.
  alb: {
    pivot: [6, 9],
    barrel: { size: 4, twin: true, n: 5, step: 4.5, start: 5 },
    pal: {
      h: '#8a4a2a', H: '#5e2e1a', L: '#c27c4a', I: '#2e8a4a', i: '#6fd08a',
      c: '#2f6e4a', C: '#1e4a32', u: '#eef0e8', U: '#b8bfb2', z: '#ffffff',
      x: '#4a3226', X: '#6a4a38', r: '#8a8f7a', R: '#5c604e', g: '#c4c8b0',
    },
    legs: 'step', legMap: { A: 's', T: 's', B: 'x', F: 'x' },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front', 'hat'],
    rig: { at: 8, x0: 1, rows: [
      '..ggg',
      '.ggrrR',
      '.gggggggg',
      'grrrrrrrrR',
      'grRgRgRgrR',
      'grrrrrrrrR',
      'grRgRgRgrR',
      'grrrrrrrrR',
      'grpppppprR',
      'grPPPPPPrR',
      'grrrrrrrrR',
      '.RRRRRRRR',
      '..gR',
      '..gR',
    ] },
    tail: { at: 12, x0: 8, sway: [19, 23], rows: [
      '...hhh',
      '..hhLh',
      '..hhhH',
      '..hLhH',
      '..hhH',
      '..hLhH',
      '..hhH',
      '..hLH',
      '..hhH',
      '..ppP',
      '..qpP',
      '..hhH',
      '...hH',
      '...H',
    ] },
    back: { at: 5, x0: 11, rows: GIRL_HEAD_BACK },
    hat: { at: 3, x0: 11, rows: [
      '.........ww',
      '....ccccccwW',
      '..ccccccccccC',
      '.cccccccccccCC',
      '.CCyCCCCCCCCC',
    ] },
    front: { at: 8, x0: 11, rows: [
      '.hhhhhhhhhhhhH',
      'hhhhLhhhhhLhhH',
      'hhhh.hhh.hh.hH',
      '..hH', '..hH', '..hH', '..hH', '..hH', '..hH',
      '...H',
    ] },
    body: { at: 17, x0: 14, rows: [
      '...cyyc',
      '..zuccuU',
      '.szuyuuU',
      '.szuyuuU',
      '...uyuU',
      '..zuyuuU',
      '.cccccccc',
      '.cUUcUUc',
    ] },
    arm: { at: 19, x0: 21, rows: ['.u', '..s', '.s', 's'] },
    sleeve: 'uUc',
    mount: [['R', -1, -1, 4, 3], ['g', -1, -1, 4, 1], ['p', 0, 1, 2, 1]],
  },

  // Ikaros (secret, from beyond the gate): an angel. Pale gold hair to her waist, sky-blue
  // eyes, a floating gold halo, white feathered wings folded behind her (the laser pointer sits
  // in the wing joint), a white dress with gold trim and a player-colour sash, white boots.
  ang: {
    pivot: [7, 11],
    barrel: { size: 3, n: 4, step: 3, start: 4 },
    pal: {
      h: '#f6e2a4', H: '#cfae68', L: '#fff6d4', I: '#2f6cc0', i: '#8ec8ff',
      u: '#ffffff', U: '#d2d6ea', z: '#fffaf0', x: '#f2f0f8', X: '#c8c6d8',
      r: '#ffffff', R: '#cfd2e6', g: '#fffef8',
    },
    legs: 'step', legMap: { A: 's', T: 's', B: 'x', F: 'y' },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front', 'hat'],
    // folded wings: long feathers sweeping down behind her back
    rig: { at: 6, x0: 0, rows: [
      '.......gg',
      '.....ggrR',
      '...ggrrrR',
      '..grrrrRR',
      '.grrrRrrR',
      'grrRrrRrR',
      'grRrrRrrR',
      'gRrrRrRrR',
      'grrRrRrR',
      '.gRrRrRR',
      '..gRrRR',
      '...gRR',
      '....gR',
      '.....R',
    ] },
    tail: { at: 15, x0: 9, sway: [19, 23], rows: [
      '...hhh',
      '..hhLh',
      '..hhhH',
      '..hLhH',
      '..hhH',
      '..hLhH',
      '..hhH',
      '..hhH',
      '...H',
    ] },
    back: { at: 5, x0: 11, rows: GIRL_HEAD_BACK.slice(0, 11).concat(['.Hhh.........H', '.hhH.........H', '..hH', '..H']) },
    // the halo floats a pixel above her hair
    hat: { at: 1, x0: 14, rows: [
      '..yyyyyy',
      '.y......Y',
      '..YYYYYY',
    ] },
    front: { at: 5, x0: 11, rows: [
      '....LLLLLL',
      '..LhhhhhhhhL',
      '.hhhhhhhhhhhh',
      '.hhhhhhhhhhhhH',
      'hhhhLhhhhhLhhH',
      'hhhh.hhh.hh.hH',
      '..hH', '..hH', '..hH', '..hH', '..hH', '..hH',
      '...H',
    ] },
    body: { at: 17, x0: 14, rows: [
      '...yuuy',
      '..zuuuuU',
      '.szppppU',
      '.szuuuuU',
      '..zuyuuU',
      '.zuuyuuuU',
      'zuuuyuuuuU',
      '.yyyyyyyyY',
    ] },
    arm: { at: 19, x0: 21, rows: ['.u', '..s', '.s', 's'] },
    sleeve: 'uUz',
    mount: [['g', -1, -1, 3, 3], ['y', 0, 0, 1, 1]],
  },
};

// the Hatsuyuki android (mobs.js): the hostiles' final ground unit, built on November's frame in
// drone black and silver, with glowing pink eyes and no blush
GIRL_DEFS.android = Object.assign({}, GIRL_DEFS.nxi, {
  pal: Object.assign({}, GIRL_DEFS.nxi.pal, {
    h: '#d8dce6', H: '#9aa0b4', L: '#ffffff', I: '#ff2a7a', i: '#ff9ad0',
    s: '#eef0f6', S: '#c4c8d8', b: '#c4c8d8', m: '#9a9eb0',
    c: '#2a2a34', C: '#1a1a22', u: '#1a1a22', U: '#0e0e14', z: '#3a3a48', x: '#14141a', X: '#2a2a34',
    r: '#3c3c48', R: '#24242e', g: '#6a6a7a', a: '#ff78c8', v: '#ff3a8a', N: '#ff78c8', y: '#c8ccd8', Y: '#8a8ea0',
  }),
});
const GIRL_ART = {};
for (const id in GIRL_DEFS) {
  const d = GIRL_DEFS[id];
  let top = GIRL_GH;
  for (const k of ['hat', 'front', 'back', 'tail']) if (d[k]) top = Math.min(top, d[k].at + d[k].rows.findIndex((r) => /[^.]/.test(r)));
  GIRL_ART[id] = {
    pivot: [(d.pivot[0] + 0.5 - GIRL_AX) * GIRL_P, (d.pivot[1] + 0.5 - GIRL_GH) * GIRL_P],
    barrel: d.barrel,
    headTop: (top - 1 - GIRL_GH) * GIRL_P, // including the 1-px outline
    height: (GIRL_GH - top + 1) * GIRL_P,
  };
}

const GIRL_PHASE = { gwt: 0, obj: 0.37, int: 0.71, nxi: 0.53, alb: 0.19, ang: 0.88, android: 0.42 };
const GIRL_POSE_LEN = { fire: 0.35, hit: 0.5 };

// ---- composition (cached) ----
function girlGrid() {
  const g = [];
  for (let r = 0; r < GIRL_GH; r++) g.push(new Array(GIRL_GW).fill('.'));
  return g;
}

// a layer as full-width rows: { at, rows: [[chars]] }; `map(ch, row)` may substitute chars
function girlLayer(l, map) {
  return { at: l.at, rows: l.rows.map((s, i) => {
    const a = new Array(GIRL_GW).fill('.');
    for (let c = 0; c < s.length; c++) {
      const cc = c + (l.x0 || 0);
      if (cc >= GIRL_GW || s[c] === '.') continue;
      a[cc] = map ? map(s[c], l.at + i, s[c - 1]) : s[c];
    }
    return a;
  }) };
}

function girlMark(L, marks) {
  for (const [ch, c, r] of marks) {
    const i = r - L.at;
    if (i < 0 || i >= L.rows.length || c < 0 || c >= GIRL_GW) continue;
    L.rows[i][c] = ch;
  }
}

// grow a layer upwards / downwards so marks outside it have somewhere to land
function girlSpan(L, r0, r1) {
  while (L.at > r0) { L.rows.unshift(new Array(GIRL_GW).fill('.')); L.at--; }
  while (L.at + L.rows.length <= r1) L.rows.push(new Array(GIRL_GW).fill('.'));
  return L;
}

// move hair back: `s1` pixels for rows >= sway[0], `s2` for rows >= sway[1]
function girlSway(L, sway, s1, s2) {
  if (!sway || (!s1 && !s2)) return;
  L.rows.forEach((row, i) => {
    const r = L.at + i;
    const sh = r >= sway[1] ? s2 : r >= sway[0] ? s1 : 0;
    if (!sh) return;
    const out = new Array(GIRL_GW).fill('.');
    for (let c = 0; c < GIRL_GW; c++) if (row[c] !== '.' && c - sh >= 0) out[c - sh] = row[c];
    L.rows[i] = out;
  });
}

// battle damage, picked deterministically from the layer's own pixels
function girlDamage(L, salt, which) {
  L.rows.forEach((row, i) => {
    const r = L.at + i;
    for (let c = 0; c < GIRL_GW; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const h = hash2(c * 7 + salt, r * 13 + salt);
      if (which === 'rig') { if (h < 0.07) row[c] = 'k'; else if (h < 0.17) row[c] = 'K'; }
      else if (which === 'cloth') { if ('uUzpPqcC'.includes(ch) && h < 0.08) row[c] = 's'; }
      else if (which === 'hem') { if (h < 0.3) row[c] = '_'; }
    }
  });
}

function girlPut(g, L, dx, dy) {
  L.rows.forEach((row, i) => {
    const r = L.at + i + dy;
    if (r < 0 || r >= GIRL_GH) return;
    for (let c = 0; c < GIRL_GW; c++) {
      if (row[c] === '.' || c + dx < 0 || c + dx >= GIRL_GW) continue;
      g[r][c + dx] = row[c];
    }
  });
}

// soft selective outline: every empty pixel touching the sprite takes the darker shade of the
// colour it touches (below first, so heads are outlined in their hair colour)
function girlOutline(g) {
  const out = g.map((row) => row.slice());
  const at = (r, c) => (r >= 0 && r < GIRL_GH && c >= 0 && c < GIRL_GW ? g[r][c] : '.');
  for (let r = 0; r < GIRL_GH; r++) {
    for (let c = 0; c < GIRL_GW; c++) {
      if (g[r][c] !== '.') continue;
      for (const [dr, dc] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
        const n = at(r + dr, c + dc);
        if (n !== '.' && n !== 'd') { out[r][c] = 'o' + n; break; }
      }
    }
  }
  return out;
}

function girlRuns(g) {
  const byKey = {};
  const mask = [];
  for (let r = 0; r < GIRL_GH; r++) {
    let c = 0;
    while (c < GIRL_GW) {
      const ch = g[r][c];
      if (ch === '.') { c++; continue; }
      let e = c + 1;
      while (e < GIRL_GW && g[r][e] === ch) e++;
      (byKey[ch] || (byKey[ch] = [])).push(c, r, e - c);
      c = e;
    }
    c = 0;
    while (c < GIRL_GW) {
      if (g[r][c] === '.') { c++; continue; }
      let e = c + 1;
      while (e < GIRL_GW && g[r][e] !== '.') e++;
      mask.push(c, r, e - c);
      c = e;
    }
  }
  // merge identical runs in consecutive rows into taller boxes: [c, r, w, h, ...]
  const tall = (runs) => {
    const out = [];
    const open = new Map();
    let row = -1, next = new Map();
    for (let i = 0; i < runs.length; i += 3) {
      const c = runs[i], r = runs[i + 1], w = runs[i + 2];
      if (r !== row) {
        open.clear();
        if (r === row + 1) next.forEach((v, k) => open.set(k, v));
        next = new Map();
        row = r;
      }
      const k = c * 64 + w;
      const j = open.get(k);
      if (j !== undefined) { out[j + 3]++; next.set(k, j); } else { next.set(k, out.length); out.push(c, r, w, 1); }
    }
    return out;
  };
  return { keys: Object.keys(byKey).map((k) => [k, tall(byKey[k])]), mask: tall(mask) };
}

// f = { bob, face, legs, bdx, ldx, h1, h2, arm }: upper-body bob / x shift, leg frame / x shift,
// hair sway shifts, raised arm. Each distinct frame is composed once and cached.
const _girlFrames = new Map();
function girlFrame(id, state, f) {
  const key = state === 'wreck' ? `${id}|wreck` :
    `${id}|${state}|${f.bob}|${f.face}|${f.legs}|${f.bdx}|${f.ldx}|${f.h1}|${f.h2}|${f.arm}`;
  let fr = _girlFrames.get(key);
  if (fr) return fr;
  const d = GIRL_DEFS[id];
  const g = girlGrid();
  const wreck = state === 'wreck';
  const dmg = state === 'damaged' || wreck;
  const legMap = (ch, r, left) => {
    if (d.legBand === r && ch === 'T') return 'y';
    const k = d.legMap[ch] || ch;
    return k === 'x' && left !== ch ? 'X' : k;
  };
  const sleeve = { '*': d.sleeve[0], '+': d.sleeve[1], '#': d.sleeve[2] };
  const L = {};
  for (const k of d.order) {
    if (k === 'face') L.face = girlLayer(GIRL_FACE);
    else if (k === 'arm') L.arm = f && f.arm ? girlLayer(GIRL_ARM_UP, (ch) => sleeve[ch] || ch) : girlLayer(d.arm);
    else if (k === 'legs') {
      L.legs = wreck ? girlLayer(GIRL_LEGS_SIT, legMap) : girlLayer({ at: 25, x0: 14, rows: GIRL_LEGS[f.legs] }, legMap);
    } else L[k] = girlLayer(d[k]);
  }
  if (dmg) {
    girlDamage(L.rig, id.charCodeAt(0), 'rig');
    girlDamage(L.body, 3, 'cloth');
    const n = L.body.rows.length - 1;
    girlDamage({ at: L.body.at + n, rows: [L.body.rows[n]] }, 5, 'hem');
    if (L.hat) girlDamage(L.hat, 9, 'rig');
  }
  if (wreck) {
    // the rig has toppled behind her: dropped, holed and charred
    L.rig.rows.forEach((row, i) => {
      for (let c = 0; c < GIRL_GW; c++) if (row[c] !== '.' && hash2(c + 3, i + L.rig.at) < 0.1) row[c] = '_';
    });
    L.rig.at = GIRL_GH - L.rig.rows.length + 4;
  }
  // expressions and sparks live on the face layer, which moves with her head
  const face = girlSpan(L.face, 0, 16);
  if (wreck) girlMark(face, GIRL_FACES.dizzy);
  else {
    if (state === 'damaged' && !f.face) girlMark(face, GIRL_FACES.worried);
    if (f.face) girlMark(face, GIRL_FACES[f.face]);
    if (f.face === 'hit') girlMark(face, GIRL_SPARKS);
  }
  if (L.tail && !wreck) girlSway(L.tail, d.tail.sway, f.h1, f.h2);
  const upDx = wreck ? 0 : f.bdx;
  const upDy = wreck ? GIRL_SIT : f.bob;
  for (const k of d.order) {
    if (k === 'rig') girlPut(g, L.rig, 0, 0);
    else if (k === 'legs') girlPut(g, L.legs, wreck ? 0 : f.ldx, 0);
    else if (k === 'arm' && f && f.arm) continue;
    else girlPut(g, L[k], upDx, upDy);
  }
  // a raised arm goes in front of everything
  if (f && f.arm && !wreck) girlPut(g, L.arm, upDx, upDy);
  for (let r = 0; r < GIRL_GH; r++) for (let c = 0; c < GIRL_GW; c++) if (g[r][c] === '_') g[r][c] = '.';
  fr = girlRuns(girlOutline(g));
  _girlFrames.set(key, fr);
  return fr;
}

// ---- palettes (cached per girl, colour and state) ----
function girlHex(c) { return '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function girlShade(hex, k) {
  const c = hexToRgb(hex);
  return girlHex(k >= 0 ? mixRgb(c, [255, 255, 255], k) : mixRgb(c, [0, 0, 0], -k));
}

const _girlPals = new Map();
function girlPalette(id, color, state) {
  const key = `${id}|${color}|${state}`;
  let pal = _girlPals.get(key);
  if (pal) return pal;
  const d = GIRL_DEFS[id];
  pal = Object.assign({}, GIRL_BASE_PAL, d.pal);
  pal.p = color;
  pal.P = girlShade(color, -0.28);
  pal.q = girlShade(color, 0.35);
  if (state === 'damaged') {
    for (const k of ['r', 'g']) pal[k] = girlHex(mixRgb(hexToRgb(pal[k]), [70, 66, 70], 0.18));
  } else if (state === 'wreck') {
    const ash = [58, 56, 62];
    for (const k in pal) {
      if (k === 'e') continue;
      const c = hexToRgb(pal[k]);
      const lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
      let v = mixRgb(c, ash, 0.25);
      if ('pPq'.includes(k)) v = mixRgb([lum, lum, lum], ash, 0.45); // player colour: desaturated
      else if ('rRgBTavN'.includes(k)) v = mixRgb([lum, lum, lum], ash, 0.55); // charred rigging
      else if ('sSbmw'.includes(k)) v = mixRgb(c, ash, 0.12);
      pal[k] = girlHex(v);
    }
  }
  // outline shades
  for (const k of Object.keys(pal)) {
    let o = GIRL_OUTLINE[k] || girlHex(mixRgb(hexToRgb(pal[k]), [46, 24, 58], 0.52));
    if (state === 'wreck' && GIRL_OUTLINE[k]) o = girlHex(mixRgb(hexToRgb(o), [58, 56, 62], 0.3));
    pal['o' + k] = o;
  }
  pal.oB = '#5a2a4a';
  _girlPals.set(key, pal);
  return pal;
}

const GIRL_BEACON = 'rgb(255,120,200)';

function girlFill(ctx, o, c, r, w, h) {
  const P = GIRL_P;
  const lx = (c - GIRL_AX) * P;
  const left = o.facing < 0 ? o.x - lx - w * P : o.x + lx;
  ctx.fillRect(Math.round(left), Math.round(o.y + (r - GIRL_GH) * P), w * P, h * P);
}

// current pose, falling back to idle once a one-shot pose has run its course
function girlPose(o) {
  const pose = o.pose || 'idle';
  const pt = o.poseT || 0;
  if (GIRL_POSE_LEN[pose] && pt > GIRL_POSE_LEN[pose]) return ['idle', 0];
  return [pose, pt];
}

// victory hop height in sprite pixels
function girlLift(o) {
  if (o.state === 'wreck') return 0;
  const [pose, pt] = girlPose(o);
  if (pose !== 'win') return 0;
  const h = pt % 0.8;
  return h < 0.06 ? 1 : h < 0.16 ? 2 : h < 0.24 ? 1 : 0;
}

// [dx, dy] world units to add to GIRL_ART[id].pivot this frame (only the victory hop moves the
// rig; recoil and flinch only move the girl, so the barrel stays on its mount)
function girlPivotOffset(o) { return [0, -girlLift(o) * GIRL_P]; }

function girlSpec(o, id) {
  const t = o.t || 0;
  const ph = GIRL_PHASE[id] || 0;
  const [pose, pt] = girlPose(o);
  const sway = Math.floor(t / 0.5 + ph * 2) % 2;
  const f = { bob: 0, face: '', legs: GIRL_DEFS[id].legs, bdx: 0, ldx: 0, h1: 0, h2: sway, arm: 0 };
  if (pose === 'fire') {
    const early = pt < 0.15;
    Object.assign(f, { face: 'squint', legs: 'brace', bdx: -1, h1: early ? 1 : 0, h2: early ? 2 : 1 });
  } else if (pose === 'hit') {
    const early = pt < 0.15;
    Object.assign(f, { face: 'hit', bdx: early ? -2 : -1, ldx: early ? -1 : 0, h1: 1, h2: 1 });
  } else if (pose === 'win') {
    Object.assign(f, { face: 'happy', arm: 1 });
  } else {
    f.bob = o.walking ? Math.floor(t * 8) % 2 : Math.floor(t / 0.6 + ph * 2) % 2;
    if ((t + ph * 3.1) % 3.1 > 2.98) f.face = 'blink';
    if (o.walking) {
      f.legs = ['w0', 'w1', 'w2', 'w3'][Math.floor(t * 8) % 4];
      f.h1 = 1;
    }
  }
  return f;
}

function drawGirl(ctx, o) {
  const id = GIRL_DEFS[o.id] ? o.id : 'gwt';
  const state = o.state === 'wreck' || o.state === 'damaged' ? o.state : 'ok';
  const t = o.t || 0;
  const p = { x: Math.round(o.x), y: Math.round(o.y) - girlLift(o) * GIRL_P, facing: o.facing < 0 ? -1 : 1 };
  const frame = girlFrame(id, state, state === 'wreck' ? null : girlSpec(o, id));
  const pal = girlPalette(id, o.color || '#3d6fa8', state);
  const beaconOn = state !== 'wreck' && Math.floor(t * 2) % 2 === 0;
  for (const [k, runs] of frame.keys) {
    ctx.fillStyle = k === 'B' && beaconOn ? GIRL_BEACON : pal[k];
    for (let i = 0; i < runs.length; i += 4) girlFill(ctx, p, runs[i], runs[i + 1], runs[i + 2], runs[i + 3]);
  }
  if (o.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(o.flash, 0, 1) * 0.85})`;
    const m = frame.mask;
    for (let i = 0; i < m.length; i += 4) girlFill(ctx, p, m[i], m[i + 1], m[i + 2], m[i + 3]);
  }
}

function drawGirlMount(ctx, o) {
  if (o.state === 'wreck') return;
  const id = GIRL_DEFS[o.id] ? o.id : 'gwt';
  const d = GIRL_DEFS[id];
  const pal = girlPalette(id, o.color || '#3d6fa8', o.state === 'damaged' ? 'damaged' : 'ok');
  const p = { x: Math.round(o.x), y: Math.round(o.y) - girlLift(o) * GIRL_P, facing: o.facing < 0 ? -1 : 1 };
  const beaconOn = Math.floor((o.t || 0) * 2) % 2 === 0;
  const [pc, pr] = d.pivot;
  // a little rounded cap: soft outline in the rig's dark shade, then the parts
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, dx, dy, w, h] of d.mount) {
    x0 = Math.min(x0, dx); y0 = Math.min(y0, dy); x1 = Math.max(x1, dx + w); y1 = Math.max(y1, dy + h);
  }
  ctx.fillStyle = pal.oR;
  girlFill(ctx, p, pc + x0 - 1, pr + y0, x1 - x0 + 2, y1 - y0);
  girlFill(ctx, p, pc + x0, pr + y0 - 1, x1 - x0, y1 - y0 + 2);
  for (const [k, dx, dy, w, h] of d.mount) {
    ctx.fillStyle = k === 'B' && beaconOn ? GIRL_BEACON : pal[k];
    girlFill(ctx, p, pc + dx, pr + dy, w, h);
  }
  if (o.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(o.flash, 0, 1) * 0.85})`;
    girlFill(ctx, p, pc + x0 - 1, pr + y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
  }
}
