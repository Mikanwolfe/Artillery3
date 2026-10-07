'use strict';
// Turret girls: the playable vehicles drawn as chibi (MapleStory / KanColle SD style) "turret
// girls" wearing their vehicle's rigging. Pure pixel art: every pixel is an axis-aligned fillRect
// on a 2-unit grid (one sprite "pixel" = GIRL_P world units). Sprites are built from string-grid
// layers (one char per pixel, mapped to palette keys): rigging, hair, body, face, bangs, hat.
// Each distinct frame is composed once, given a soft "selective" outline (every edge pixel is
// outlined in a darker shade of its own colour), turned into horizontal runs and cached.
//
// API
//   GIRL_ART[id]            id in 'gwt' | 'obj' | 'int' | 'nxi'
//     .pivot  [lx, ly]      gun trunnion (world units, facing right, relative to the ground point)
//     .barrel { size, twin, triple, n, step, start }  suggested barrel: n squares of `size`,
//                           `step` apart starting `start` from the pivot (twin: two parallel lines,
//                           triple: three)
//     .height, .headTop     overall height (world units, standing) and the y of the top of her
//                           head/hat (negative, relative to the ground point), for name labels
//   drawGirl(ctx, o)        girl + rigging, without the barrel
//   drawGirlMount(ctx, o)   small mount cap over the barrel root (call after the barrel)
//   girlPivotOffset(o)      [dx, dy] world units to add to the pivot this frame (non-zero only
//                           during the 'win' hop, when the whole girl and rig lift off the ground)
//   o = { id, x, y, facing, color, state: 'ok'|'damaged'|'wreck', t, walking, flash,
//         pose: 'idle'|'fire'|'hit'|'win', poseT: seconds since the pose started }
//   Poses: 'fire' (0.35 s) recoil lean, braced legs, hair flicks back, > < eyes;
//          'hit' (0.5 s) flinch backwards, eyes squeezed shut, shock sparks and sweat;
//          'win' (loops) V-sign, ^ ^ eyes, a hop every 0.8 s. 'fire'/'hit' fall back to idle
//          after their length. Wrecks ignore poses.

const GIRL_P = 2; // world units per sprite pixel
const GIRL_GW = 34; // grid width (pixels)
const GIRL_GH = 36; // grid height; the bottom row stands on the ground point
const GIRL_AX = 20; // grid column whose left edge is the ground point x (between her feet)
const GIRL_SIT = 6; // wrecks: how far the upper body drops when she sits down

// Palette keys (per girl overrides in GIRL_DEFS[id].pal):
//   .  transparent        _  erase                         o<k> outline of k (automatic)
//   s/S skin/shade        e  lash/dark   I/i iris dark/light   w/W white/shade  b blush  m mouth
//   d  sweat/tear         h/H/L hair/shade/highlight       c/C/j hat/shade/light  y/Y gold
//   u/U/z uniform / shade / light       x boots         t/T tread/wheel
//   p/P/q player colour / dark / light  r/R/g rigging / dark / light   k/K scorch / soot
//   B  beacon (blinks MAIA pink)       a/n/v aurora teal / blue / violet
const GIRL_BASE_PAL = {
  s: '#ffe8d8', S: '#f6c4ae', e: '#3a2440', w: '#ffffff', W: '#d6d8ee', b: '#ff9db4', m: '#e0607a',
  d: '#a8e6ff', y: '#ffd65a', Y: '#d99a2a', x: '#3e3550', t: '#3c3f4c', T: '#9aa0b0',
  k: '#3a3436', K: '#6e6466', B: '#8a4a72',
};
const GIRL_OUTLINE = { s: '#cf8a7e', S: '#cf8a7e', b: '#cf8a7e', m: '#cf8a7e', e: '#2a1c30', x: '#221c2e', w: '#a9abcc', W: '#a9abcc', y: '#b57a1e', Y: '#9a6418', d: '#6ab4e0' };

// ---- shared parts ----
// round head of hair (back layer; the face is drawn over cols 14-24)
const GIRL_HEAD_BACK = [
  '.....hhhhhh',
  '...hhhhhhhhhh',
  '..hhhhhhhhhhhh',
  '.hhhhhhhhhhhhhh',
  '.hhhhhhhhhhhhhhH',
  'hhhhhhhhhhhhhhhH',
  'hhhhhhhhhhhhhhhH',
  'hhhhhhhhhhhhhhhH',
  'hhhhhhhhhhhhhhhH',
  'HhhhhhhhhhhhhhhH',
  'Hhhh...........H',
  'Hhhh...........H',
  '.HhH...........H',
  '..H',
];
// face: big eyes (lash, highlight, two-tone iris) set low, blush and a tiny mouth
const GIRL_FACE = { at: 13, x0: 14, rows: [
  'sssssssssss',
  'sssssssssss',
  'seeessseees',
  'swIIssswIIs',
  'sIIIsssIIIs',
  'siiisssiiis',
  'sbbssmssbbs',
  '.SsssssssS',
  '...SSSSS',
] };
const GIRL_EYE_CELLS = [];
for (let r = 15; r <= 18; r++) for (const c of [15, 16, 17, 21, 22, 23]) GIRL_EYE_CELLS.push(['s', c, r]);
const GIRL_FACES = {
  blink: [...GIRL_EYE_CELLS, ['e', 15, 17], ['e', 16, 18], ['e', 17, 17], ['e', 21, 17], ['e', 22, 18], ['e', 23, 17]],
  squint: [...GIRL_EYE_CELLS, ['e', 15, 15], ['e', 16, 16], ['e', 17, 17], ['e', 16, 18], ['e', 15, 19],
    ['e', 23, 15], ['e', 22, 16], ['e', 21, 17], ['e', 22, 18], ['e', 23, 19], ['s', 15, 19], ['s', 23, 19],
    ['m', 18, 19], ['m', 19, 19], ['m', 20, 19]],
  hit: [...GIRL_EYE_CELLS, ['e', 15, 15], ['e', 16, 16], ['e', 17, 17], ['e', 16, 18], ['e', 15, 19],
    ['e', 23, 15], ['e', 22, 16], ['e', 21, 17], ['e', 22, 18], ['e', 23, 19],
    ['m', 19, 19], ['m', 19, 20], ['m', 18, 20], ['m', 20, 20], ['d', 25, 13], ['d', 25, 14], ['d', 26, 14]],
  happy: [...GIRL_EYE_CELLS, ['e', 15, 17], ['e', 16, 16], ['e', 17, 17], ['e', 21, 17], ['e', 22, 16], ['e', 23, 17],
    ['m', 18, 19], ['m', 19, 20], ['m', 20, 19], ['s', 19, 19]],
  worried: [['m', 19, 20], ['s', 19, 19], ['d', 25, 13], ['d', 25, 14]],
  dizzy: [...GIRL_EYE_CELLS, ['e', 15, 15], ['e', 17, 15], ['e', 16, 16], ['e', 15, 17], ['e', 17, 17],
    ['e', 21, 15], ['e', 23, 15], ['e', 22, 16], ['e', 21, 17], ['e', 23, 17], ['m', 19, 19], ['m', 18, 20], ['m', 20, 20], ['d', 24, 18], ['d', 24, 19]],
};
// shock sparks above her head (hit)
const GIRL_SPARKS = [['w', 22, 2], ['w', 25, 1], ['w', 27, 3], ['w', 19, 1]];

// victory arm (V-sign) on the front side; '*' = sleeve, '+' = sleeve shade, '#' = armband
const GIRL_ARM_UP = { at: 12, x0: 24, rows: [
  '..s..s',
  '..s.s',
  '..sss',
  '..sSs',
  '..*+',
  '..*+',
  '..#+',
  '..*+',
  '..*+',
  '.**+',
  '**+',
] };

// Layers: { at: first row, x0: first column, rows: [...] }.
const GIRL_DEFS = {
  // G.W. Tiger: blonde twin-tails tied with player-colour bows, a field-grey peaked cap with a
  // gold badge, field-grey jacket, player-colour neckerchief and pleated skirt, blue eyes, a steel
  // rigging block on her lower back with a round turret raised behind her head, tread-unit boots.
  gwt: {
    pivot: [6, 9],
    barrel: { size: 4, twin: false, n: 6, step: 4.5, start: 5 },
    pal: {
      h: '#ffd96e', H: '#e0a53c', L: '#fff4be', I: '#2f6fd0', i: '#6fb4ff',
      c: '#8a9480', C: '#646d5c', j: '#aab39f', u: '#8e977f', U: '#6b735f', z: '#adb59c',
      r: '#9aa3b4', R: '#6c7488', g: '#cfd5e2',
    },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front', 'hat'],
    rig: { at: 7, x0: 1, rows: [
      '..gggg',
      '.gggrrrR',
      'ggrrrrrrR',
      'grppppprR',
      'RrrrrrrRR',
      '.RRRRRRR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '...gggggggg',
      '..grrrrrrrrR',
      '.grqqqqqqrrR',
      '.grpppppprrR',
      '.grPPPPPPrrR',
      '.grrrrrrrrrR',
      '.gRrRrRrRrRR',
      '..RRRRRRRRR',
    ] },
    tail: { at: 10, x0: 3, sway: [16, 19], rows: [
      '....pp.pp',
      '....pqPqp',
      '....pp.pp',
      '...hhhhh',
      '..hLLhhhH',
      '.hLhhhhhH',
      'hLhhhhhHH',
      'hhhhhhHH',
      'hhhhhHH',
      '.hhhhH',
      '..hhH',
      '...H',
    ] },
    back: { at: 7, x0: 10, rows: GIRL_HEAD_BACK },
    front: { at: 11, x0: 10, rows: [
      '.hLLhhhLLLLhhhhH',
      'hhhhhhhhhhhhhhhH',
      'hhhhLLhhhhhLLhhH',
      'hhhhh..hhh..hh.H',
      '...hH....h',
      '...hH',
      '...hH',
      '....H',
    ] },
    hat: { at: 4, x0: 11, rows: [
      '....jjjjjjj',
      '..jjjjccccccc',
      '.jjcccccccccccc',
      '.jcccccccyycccc',
      'cccccccccYYccccC',
      'CCCCCCCCCCCCCCCC',
      '........UUUUUUUUU',
    ] },
    body: { at: 22, x0: 14, rows: [
      '.zzwpppwuu',
      '.zuuuPuuuU',
      '.zuuuyuuuU',
      '.UUUUyUUUU',
      '.qqpqqpqqp',
      'qpppqpppqpP',
      'ppppPpppPpP',
      'PPPPPPPPPPP',
    ] },
    arm: { at: 22, x0: 24, rows: ['uU', 'uU', 'uU', 'sS'] },
    sleeve: 'uUu',
    legs: [
      { at: 30, x0: 14, rows: [
        '...ss..ss',
        '...UU..UU',
        '.ggggggggg',
        'grrrrrrrrrrR',
        'tTttTttTttTt',
        '.tttttttttt',
      ] },
      { at: 30, x0: 14, rows: [
        '..ss....ss',
        '..UU....UU',
        '.ggggggggg',
        'grrrrrrrrrrR',
        'ttTttTttTttT',
        '.tttttttttt',
      ] },
    ],
    wreckLegs: { at: 33, x0: 22, rows: ['sssUU', 'ssUUUgrrR', '.SSUUtTtT'] },
    mount: [['R', -1, -1, 4, 3], ['g', -1, -1, 4, 1], ['p', 0, 1, 2, 1]],
  },

  // Object 15X: short silver bob, an ushanka (olive crown, fur flaps, gold star), long olive
  // greatcoat with gold buttons, player-colour scarf, ruby eyes, a tall armoured gun housing on
  // her back with player-colour plates, a stowed recoil spade, and a round turret on top.
  obj: {
    pivot: [7, 8],
    barrel: { size: 6, twin: false, n: 5, step: 4.5, start: 6 },
    pal: {
      h: '#eef2f8', H: '#b4bdd0', L: '#ffffff', I: '#b8283c', i: '#ff6f84',
      c: '#d8c8ae', C: '#a8957a', j: '#6e7a55', u: '#6f7b55', U: '#525c3e', z: '#8d9a6e',
      r: '#93a57c', R: '#65744f', g: '#c0d0a4',
    },
    order: ['rig', 'back', 'tail', 'legs', 'body', 'arm', 'face', 'front', 'hat'],
    rig: { at: 6, x0: 1, rows: [
      '....gggg',
      '...ggrrrrR',
      '..ggrrrrrrR',
      '..grppppprRR',
      '..RRRRRRRRRR',
      '...gggggggggg',
      '..grrrrrrrrrrR',
      '..grqqqqqqqqrR',
      '.Rgrpppppppprr',
      'gRgrpppppppprR',
      'gRgrPPPPPPPPrR',
      'gRgrrrrrrrrrrR',
      'gRgRgRgRgRgRrR',
      'gRgrrrrrrrrrrR',
      'gRgrqqqqqqqqrR',
      'gRgrpppppppprR',
      'gRgrPPPPPPPPrR',
      '.Rgrrrrrrrrrr',
      '..gRRRRRRRRRRR',
      '...RRRRRRRRRR',
    ] },
    tail: { at: 22, x0: 10, sway: [23, 24], rows: [
      '.pppp',
      'Pppp',
      'PPp',
      '.P',
    ] },
    back: { at: 7, x0: 10, rows: GIRL_HEAD_BACK },
    front: { at: 10, x0: 10, rows: [
      '...hLLhhhLLLhhh',
      'hhhLLhhhhhLLhhhH',
      'hhhhhhhhhhhhhhhH',
      'hhhhhhhhhhhhhhhH',
      'hhhhhHhhhhhHhhhH',
      '...hH',
      '...hH',
      '...hH',
    ] },
    hat: { at: 4, x0: 10, rows: [
      '.....jjjjjjj',
      '...jjjjjjjjjjj',
      '..cccccccyccccccC',
      '.cccccccyyycccccC',
      '.ccccccccccccccccC',
      'ccCCCCCCCCCCCCCCC',
      'ccC............Cc',
      'ccC............Cc',
      'ccC............Cc',
      'ccC............Cc',
      'ccC............Cc',
      'ccC.............C',
      'ccC',
      '.cC',
      '..C',
    ] },
    body: { at: 21, x0: 13, rows: [
      '...ppppppp',
      '..qqqqqqqqp',
      '..zuyuuyuuU',
      '..zuuuuuuuU',
      '..zuyuuyuuU',
      '..UUUUUUUUU',
      '..zuyuuyuuU',
      '.zuuuuuuuuuU',
      '.zuuuuuuuuuU',
      '.UUUUUUUUUUU',
    ] },
    arm: { at: 23, x0: 24, rows: ['uU', 'uU', 'uU', 'sS'] },
    sleeve: 'uUp',
    legs: [
      { at: 31, x0: 14, rows: [
        '...xx..xx',
        '...xx..xx',
        '...xx..xx',
        '...xxx.xxx',
        '...xxx.xxx',
      ] },
      { at: 31, x0: 14, rows: [
        '..xx....xx',
        '..xx....xx',
        '.xx......xx',
        '.xxx.....xxx',
        '.xxx.....xxx',
      ] },
    ],
    wreckLegs: { at: 33, x0: 23, rows: ['uuxxx', 'Uuxxxx', 'UUxxxx'] },
    mount: [['R', -2, -1, 5, 3], ['g', -2, -1, 5, 1], ['p', -1, 1, 3, 1]],
  },

  // Innocentia: long pink-lavender hair with an ahoge and a player-colour bow, sailor uniform
  // (white blouse, player-colour collar and pleated skirt, yellow bow), white socks, violet eyes,
  // a white backpack with a raised twin-gun turret and an uplink mast with a dish and a blinking
  // MAIA-pink beacon.
  int: {
    pivot: [5, 9],
    barrel: { size: 3, twin: true, n: 7, step: 3, start: 5 },
    pal: {
      h: '#f7b9e8', H: '#d98bd0', L: '#fff0fb', I: '#8a3ab8', i: '#d58cf0',
      r: '#dfe3ee', R: '#a4aac0', g: '#ffffff',
    },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front'],
    rig: { at: 0, x0: 0, rows: [
      '...BB',
      'g..rR..g',
      'gg.rR.gg',
      '.gggggg',
      '...rR',
      '...rR',
      '...rR',
      '..gggggg',
      '.ggrrrrrR',
      '.grrrrrrR',
      '.grppppRR',
      '.RRRRRRRR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '....rR',
      '....ggggggg',
      '...grrrrrrrR',
      '...grqqqqqrR',
      '...grpppppRR',
      '...grPPPPPrR',
      '...grrrrrrrR',
      '...gBrRrRrrR',
      '....RRRRRRR',
    ] },
    tail: { at: 18, x0: 7, sway: [22, 25], rows: [
      '...hhhh',
      '..hLhhhH',
      '..hhhhhH',
      '.hhhhhhH',
      '.hLhhhHH',
      '.hhhhhH',
      'hhhhhHH',
      'hhhhhH',
      '.hhhH',
      '.hhH',
      '..hH',
      '..H',
    ] },
    back: { at: 7, x0: 10, rows: GIRL_HEAD_BACK.slice(0, 10).concat([
      'hhhh...........hH',
      'hhhh...........hH',
      'hhhh...........hH',
      'hhhh...........hH',
      'Hhhh...........hH',
      'Hhh............hH',
      '...............H',
    ]) },
    front: { at: 4, x0: 9, rows: [
      '...........hh',
      '..........h',
      '..........h',
      '',
      '',
      'pp.pp.LLLL..LLL',
      'pqPqp.....LL',
      'pp.pp',
      '',
      '.hhhhhLhhhhhLhhhH',
      '.hhhhh..hhh..hh.H',
      '....hH....h',
      '....hH',
      '....hH',
      '....hH',
      '.....H',
    ] },
    body: { at: 22, x0: 13, rows: [
      'pppwyyywwwW',
      'PppwwywwwwW',
      '.PpwwwwwwwW',
      '..WwwwwwwwW',
      '..qqpqqpqqp',
      '.qpppqpppqpP',
      '.ppppPpppPpP',
      '.PPPPPPPPPPP',
    ] },
    arm: { at: 22, x0: 24, rows: ['wW', 'wW', 'wW', 'sS'] },
    sleeve: 'wWw',
    legs: [
      { at: 30, x0: 14, rows: [
        '...ss..ss',
        '...ww..ww',
        '...ww..ww',
        '...WW..WW',
        '...xxx.xxx',
        '...xxx.xxx',
      ] },
      { at: 30, x0: 14, rows: [
        '..ss....ss',
        '..ww....ww',
        '..ww....ww',
        '..WW....WW',
        '..xxx...xxx',
        '..xxx...xxx',
      ] },
    ],
    wreckLegs: { at: 33, x0: 23, rows: ['sswww', 'swwwxx', 'SWWWxx'] },
    mount: [['R', -1, -1, 4, 3], ['g', -1, -1, 4, 1], ['B', 1, 1, 1, 1]],
  },

  // November (NXi, November Division of the United Aurora Federation): a composed naval officer
  // in void-navy with royal gold trim, a white peaked cap with the Queen's gold crown, long teal
  // hair with a violet streak and an aurora tip, player-colour sash and armband, teal eyes, and an
  // overbuilt battlecruiser rigging block (bulkheads, player-colour plates, aurora seam) with a
  // wide triple-turret base.
  nxi: {
    pivot: [6, 9],
    barrel: { size: 4, twin: false, triple: true, n: 5, step: 4.5, start: 6 },
    pal: {
      h: '#27ae9f', H: '#187b73', L: '#86f2e0', v: '#9a6cf0', a: '#5ef0d0', n: '#6aa8ff',
      c: '#f6f8fc', C: '#c8cde0', U: '#171b36', u: '#262e5a', z: '#3d4986', I: '#0f8f84', i: '#5ef0d0',
      r: '#55669c', R: '#323d6c', g: '#93a3dc', x: '#1d2140',
    },
    order: ['rig', 'tail', 'back', 'legs', 'body', 'arm', 'face', 'front', 'hat'],
    rig: { at: 7, x0: 0, rows: [
      '...gggggg',
      '..gggrrrrrR',
      '.ggrrrrrrrRR',
      '.grppppppprR',
      '.RaaannnvvvR',
      '..RRRRRRRRR',
      '.gggggggggggg',
      'grrrrrrrrrrrR',
      'grqqqqRqqqqrR',
      'grppppRpppprR',
      'grPPPPRPPPPrR',
      'RaaaannnnvvvR',
      'grrrRrrrrRrrR',
      'grppppRpppprR',
      'grPPPPRPPPPrR',
      'grrrrrrrrrrrR',
      'gRrRrRrRrRrRR',
      '.RRRRRRRRRRR',
    ] },
    tail: { at: 15, x0: 7, sway: [20, 24], rows: [
      '...hhhh',
      '..hhvhhH',
      '..hhvhhH',
      '.hhhvhhH',
      '.hLhvhhH',
      '.hhhvhH',
      '.hhhvhH',
      'hhhvhhH',
      'hhhvhH',
      'ahhvha',
      'aanvna',
      '.nnvv',
      '..vv',
    ] },
    back: { at: 7, x0: 10, rows: GIRL_HEAD_BACK.slice(0, 13).concat(['.HhH...........H', '...............H']) },
    front: { at: 10, x0: 10, rows: [
      '.hLLhhhLLL',
      '.hLLhhvLLLLhhhhH',
      'hhhhhhvhhhhhhhhH',
      'hhhhhhvhhhhLLhhH',
      'hhhhhhv.hhh..h.H',
      '...hHv...h',
      '...hHv',
      '...hH',
      '....H',
    ] },
    hat: { at: 3, x0: 10, rows: [
      '........y.y.y',
      '.....cccyyyyy',
      '...ccccccyyyccc',
      '..cccccccccccccC',
      '.ccccccccccccccC',
      '.CCCCCCCCCCCCCCC',
      '.yyyyyyyyyyyyyyy',
      '.........UUUUUUUUU',
    ] },
    body: { at: 22, x0: 14, rows: [
      '.zuyyyyypU',
      '.zuuuuypPU',
      '.zuuuppuuU',
      '.yyyppyyyy',
      '.zupPuuuuU',
      'zuuuuuuuuuU',
      'zuuuuuuuuuU',
      'yyyyyyyyyyy',
    ] },
    arm: { at: 22, x0: 24, rows: ['uU', 'pP', 'uU', 'sS'] },
    sleeve: 'uUp',
    legs: [
      { at: 30, x0: 14, rows: [
        '...xx..xx',
        '...xx..xx',
        '...yy..yy',
        '...xx..xx',
        '...xxx.xxx',
        '...xxx.xxx',
      ] },
      { at: 30, x0: 14, rows: [
        '..xx....xx',
        '..xx....xx',
        '..yy....yy',
        '..xx....xx',
        '..xxx...xxx',
        '..xxx...xxx',
      ] },
    ],
    wreckLegs: { at: 33, x0: 23, rows: ['uuxx', 'uuxyxx', 'UUxyxx'] },
    mount: [['R', -2, -1, 5, 3], ['g', -2, -1, 5, 1], ['a', -1, 1, 3, 1]],
  },
};

const GIRL_ART = {};
for (const id in GIRL_DEFS) {
  const d = GIRL_DEFS[id];
  let top = GIRL_GH;
  for (const k of ['hat', 'front', 'back']) if (d[k]) top = Math.min(top, d[k].at + d[k].rows.findIndex((r) => /[^.]/.test(r)));
  GIRL_ART[id] = {
    pivot: [(d.pivot[0] + 0.5 - GIRL_AX) * GIRL_P, (d.pivot[1] + 0.5 - GIRL_GH) * GIRL_P],
    barrel: d.barrel,
    headTop: (top - 1 - GIRL_GH) * GIRL_P, // including the 1-px outline
    height: (GIRL_GH - top + 1) * GIRL_P,
  };
}

const GIRL_PHASE = { gwt: 0, obj: 0.37, int: 0.71, nxi: 0.53 };
const GIRL_POSE_LEN = { fire: 0.35, hit: 0.5 };

// ---- composition (cached) ----
function girlGrid() {
  const g = [];
  for (let r = 0; r < GIRL_GH; r++) g.push(new Array(GIRL_GW).fill('.'));
  return g;
}

// a layer as a full-width grid fragment: { at, rows: [[chars]] }
function girlLayer(l) {
  return { at: l.at, rows: l.rows.map((s) => {
    const a = new Array(GIRL_GW).fill('.');
    for (let c = 0; c < s.length; c++) if (c + (l.x0 || 0) < GIRL_GW) a[c + (l.x0 || 0)] = s[c];
    return a;
  }) };
}

function girlMark(L, marks, sub) {
  for (let [ch, c, r] of marks) {
    const i = r - L.at;
    if (i < 0 || i >= L.rows.length || c < 0 || c >= GIRL_GW) continue;
    if (sub && sub[ch]) ch = sub[ch];
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
      else if (which === 'cloth') { if ('uUzpPqwWcj'.includes(ch) && h < 0.07) row[c] = 's'; }
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
    const open = new Map(); // `${c},${w}` -> index in out of a box ending on the previous row
    let row = -1, next = new Map();
    for (let i = 0; i < runs.length; i += 3) {
      const [c, r, w] = [runs[i], runs[i + 1], runs[i + 2]];
      if (r !== row) { if (r === row + 1) { open.clear(); next.forEach((v, k) => open.set(k, v)); } else open.clear(); next = new Map(); row = r; }
      const k = c * 64 + w;
      const j = open.get(k);
      if (j !== undefined) { out[j + 3]++; next.set(k, j); } else { next.set(k, out.length); out.push(c, r, w, 1); }
    }
    return out;
  };
  return { keys: Object.keys(byKey).map((k) => [k, tall(byKey[k])]), mask: tall(mask) };
}

// f = { bob, face, step, bdx, ldx, h1, h2, arm }: upper-body bob / x shift, leg frame / x shift,
// hair sway shifts, raised arm. Each distinct frame is composed once and cached.
const _girlFrames = new Map();
function girlFrame(id, state, f) {
  const key = state === 'wreck' ? `${id}|wreck` :
    `${id}|${state}|${f.bob}|${f.face}|${f.step}|${f.bdx}|${f.ldx}|${f.h1}|${f.h2}|${f.arm}`;
  let fr = _girlFrames.get(key);
  if (fr) return fr;
  const d = GIRL_DEFS[id];
  const g = girlGrid();
  const wreck = state === 'wreck';
  const dmg = state === 'damaged' || wreck;
  const sleeveSub = { '*': d.sleeve[0], '+': d.sleeve[1], '#': d.sleeve[2] };
  const L = {};
  for (const k of d.order) {
    if (k === 'face') L.face = girlLayer(GIRL_FACE);
    else if (k === 'arm') L.arm = girlLayer(f && f.arm ? GIRL_ARM_UP : d.arm);
    else if (k === 'legs') L.legs = girlLayer(wreck ? d.wreckLegs : d.legs[f.step]);
    else L[k] = girlLayer(d[k]);
  }
  if (L.arm && f && f.arm) L.arm.rows = L.arm.rows.map((row) => row.map((ch) => sleeveSub[ch] || ch));
  if (dmg) {
    girlDamage(L.rig, id.charCodeAt(0), 'rig');
    girlDamage(L.body, 3, 'cloth');
    const hem = { at: L.body.at + L.body.rows.length - 1, rows: [L.body.rows[L.body.rows.length - 1]] };
    girlDamage(hem, 5, 'hem');
    if (L.hat) girlDamage(L.hat, 9, 'rig');
  }
  if (wreck) {
    // the rig has toppled behind her: dropped, holed and charred
    L.rig.rows.forEach((row, i) => {
      for (let c = 0; c < GIRL_GW; c++) if (row[c] !== '.' && hash2(c + 3, i + L.rig.at) < 0.1) row[c] = '_';
    });
    L.rig.at += 10;
  }
  // expressions and sparks live on the face layer, which moves with her head
  const face = girlSpan(L.face, 0, 21);
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
      else if ('rRgBTtanv'.includes(k)) v = mixRgb([lum, lum, lum], ash, 0.55); // charred rigging
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
  const f = { bob: 0, face: '', step: 0, bdx: 0, ldx: 0, h1: 0, h2: sway, arm: 0 };
  if (pose === 'fire') {
    const early = pt < 0.15;
    Object.assign(f, { face: 'squint', step: 1, bdx: -1, h1: early ? 1 : 0, h2: early ? 2 : 1 });
  } else if (pose === 'hit') {
    const early = pt < 0.15;
    Object.assign(f, { face: 'hit', bdx: early ? -2 : -1, ldx: early ? -1 : 0, h1: 1, h2: 1 });
  } else if (pose === 'win') {
    Object.assign(f, { face: 'happy', arm: 1 });
  } else {
    f.bob = o.walking ? 0 : Math.floor(t / 0.6 + ph * 2) % 2;
    if ((t + ph * 3.1) % 3.1 > 2.98) f.face = 'blink';
    f.step = o.walking ? Math.floor(t * 6) % 2 : 0;
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
