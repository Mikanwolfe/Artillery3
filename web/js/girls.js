'use strict';
// Turret girls: the three playable vehicles drawn as chibi shipgirl-style "turret girls" wearing
// their vehicle's rigging. Pure pixel art: every pixel is an axis-aligned fillRect on a 2-unit
// grid (one sprite "pixel" = GIRL_P world units). Sprites are string grids, one char per pixel,
// mapped to palette keys; each frame is composed once, outlined, turned into horizontal runs and
// cached, so drawing a girl is ~100-200 fillRects.
//
// API
//   GIRL_ART[id]            id in 'gwt' | 'obj' | 'int'
//     .pivot  [lx, ly]      gun trunnion (world units, facing right, relative to the ground point)
//     .barrel { size, twin, n, step, start }  suggested barrel: n squares of `size`, `step` apart
//                           starting `start` from the pivot (twin: two parallel lines)
//   drawGirl(ctx, o)        girl + rigging, without the barrel
//   drawGirlMount(ctx, o)   small mount cap over the barrel root (call after the barrel)
//   o = { id, x, y, facing, color, state: 'ok'|'damaged'|'wreck', t, walking, flash }

const GIRL_P = 2; // world units per sprite pixel
const GIRL_GW = 26; // grid width (pixels)
const GIRL_GH = 26; // grid height; the bottom row stands on the ground point
const GIRL_AX = 13; // grid column whose left edge is the ground point x

// Palette keys:
//   .  transparent        o  outline (added automatically)    _  erase (damage overlays)
//   s/S skin/shade        e  eye/dark    i iris    b blush    m mouth    d sweat drop
//   h/H hair/shade        c/C cap or hat / its shade         y gold (badge, buckle, bow)
//   u/U uniform/shade     w/W white/shade   x boots           t/T tread/road wheel
//   p/P/q player colour / dark / light                          r/R/g rigging / dark / light
//   k/K scorch / soot     B beacon (blinks MAIA pink)
const GIRL_BASE_PAL = {
  o: '#2a2433', s: '#ffe2cf', S: '#eeb49c', e: '#2a2433', b: '#ff9aa8', m: '#b04858', d: '#8fd0ff',
  w: '#f7f7fb', W: '#c6c8de', x: '#2e2a33', y: '#f2c84b', t: '#2b2d33', T: '#7a7f8a',
  k: '#2c2a2e', K: '#5a5452', B: '#7a3a62',
};

// Layers are { at: firstRow, rows: [...] }; rows shorter than GIRL_GW are padded with '.'.
const GIRL_DEFS = {
  // G.W. Tiger: blonde twin-tails with player-colour ribbons, field-grey peaked cap and uniform,
  // a heavy rigging block on her back with the gun ring on its rear top, and a little tread
  // unit for boots.
  gwt: {
    pivot: [5, 6], // grid cell of the trunnion
    barrel: { size: 4, twin: false, n: 6, step: 4.5, start: 5 },
    pal: {
      h: '#f4d27a', H: '#c79c45', c: '#7b8473', C: '#535a4e', u: '#848c78', U: '#5f6656', i: '#3f7fd6',
      r: '#7c8290', R: '#4f5361', g: '#acb2c0',
    },
    rig: { at: 6, rows: [
      '....RRRR',
      '...gggggg',
      '..rrrrrrrr',
      '.RrpppppRr',
      '.RrpqqqpRr',
      '.RrpppppRr',
      '..rPPPPPRr',
      '..rrrrrrRr',
      '..RRRRRRRR',
      '...RR..RR',
    ] },
    body: { at: 4, rows: [
      '...........ccccccc',
      '..........cccccyccc',
      '.........CCCCCCCCCCCC',
      '......pphhhhhhhhhhhh',
      '......PhhHhhhhsshssh',
      '......hHhHhhhssesses',
      '......hHhHhhhssissis',
      '......hHhHhhhsbssssb',
      '......hHhHhhhssssmsS',
      '......hH.HhhhSsssss',
      '......hHh...uwssw',
      '.......hH.uuupppuuu',
      '.......h..uUuuPuuUu',
      '..........RRRRyRRss',
      '..........pppppppp',
      '.........PPPPPPPPPP',
    ] },
    legs: [
      { at: 20, rows: [
        '...........ss..ss',
        '...........UU..UU',
        '..........xxx..xxx',
        '.........gggggggggg',
        '........tTttTttTttTt',
        '.........tttttttttt',
      ] },
      { at: 20, rows: [
        '..........ss....ss',
        '..........UU....UU',
        '.........xxx....xxx',
        '.........gggggggggg',
        '........ttTttTttTttT',
        '.........tttttttttt',
      ] },
    ],
    dmgRig: [['k', 4, 9], ['K', 5, 9], ['K', 5, 10], ['k', 7, 12], ['K', 3, 13], ['k', 8, 8], ['_', 9, 14]],
    dmgBody: [['s', 18, 16], ['s', 12, 16], ['_', 11, 19], ['_', 15, 19], ['s', 16, 18], ['d', 20, 9], ['d', 20, 10], ['m', 16, 12], ['K', 17, 4]],
    dmgLegs: [['k', 12, 23], ['_', 18, 24]],
    wreck: { at: 10, rows: [
      '...........hhhhhhh',
      '.........hhhhhhhhhhh',
      '......PhhHhhhhsshssh',
      '......hHhHhhhsessses',
      '......hHhHhhhssesess',
      '......hHhHhhhsessses',
      '......hHhHhhhsssmsssd',
      '......hH.HhhhSsssss',
      '......hHh...uwssw',
      '.gR....hH.uuupppuuu',
      '.rrRk.....uUusPuuUu',
      'rrkrrR....RRRRyRRss',
      'rKrrkrRR.ppppppppppp',
      'rrrkrrrRppppppppppppp',
      'RRRRRRRRPPPPPPPPPPPsssUxx',
      '.tTt.tT.PPPPPPPPPPPUUUUxx',
    ] },
    mount: [['R', -1, -1, 3, 3], ['g', -1, -1, 3, 1], ['p', 0, 0, 1, 1]],
  },

  // Object 15X: short silver hair, ushanka with a gold badge, long olive greatcoat with a
  // player-colour scarf, and a tall armoured gun housing (player-colour plates) towering
  // behind her with the recoil spade stowed on its tail.
  obj: {
    pivot: [7, 5],
    barrel: { size: 6, twin: false, n: 5, step: 4.5, start: 6 },
    pal: {
      h: '#e9edf3', H: '#a6afc2', c: '#a8977f', C: '#5d5144', u: '#5f684f', U: '#434a38', i: '#c8463f',
      r: '#6f7a68', R: '#454d40', g: '#9ba78f',
    },
    rig: { at: 5, rows: [
      '..gggggggg',
      '.grrrrrrrrR',
      '.rpqqqqqprR',
      'RrppppppprR',
      'grppppppprR',
      'grPPPPPPPrR',
      'grrrrrrrrrR',
      'grRgRgRgRrR',
      'grrrrrrrrrR',
      'grppppppprR',
      'grPPPPPPPrR',
      'RgrrrrrrrrR',
      '..RRRRRRRR',
    ] },
    body: { at: 4, rows: [
      '...........CCCCCCC',
      '..........CCCCCCCCC',
      '.........ccccccyccc',
      '.........cccccccccccc',
      '.........cChhhhhhhhh',
      '.........cChhssesses',
      '.........cChhssissis',
      '.........cChHsbssssb',
      '.........cCHhssssmsS',
      '..........HHhSsssss',
      '...........pppppppp',
      '..........PpuuyuuyuU',
      '..........PuuuuuuuUu',
      '..........PuuuyuuyUs',
      '...........RRRRyRRR',
      '..........uuuuyuuyuu',
      '..........uuuuuuuuuu',
      '..........UuuuUuuuuU',
      '..........UUUUUUUUUU',
    ] },
    legs: [
      { at: 23, rows: [
        '............xx.xx',
        '............xx.xx',
        '...........xxx.xxx',
      ] },
      { at: 23, rows: [
        '...........xx...xx',
        '..........xx.....xx',
        '.........xxx.....xxx',
      ] },
    ],
    dmgRig: [['k', 3, 8], ['K', 4, 8], ['K', 4, 9], ['k', 6, 14], ['K', 7, 15], ['k', 2, 12], ['K', 8, 5], ['_', 9, 5], ['k', 9, 6]],
    dmgBody: [['s', 12, 20], ['s', 17, 21], ['s', 19, 16], ['_', 10, 22], ['_', 16, 22], ['d', 20, 10], ['d', 20, 11], ['m', 16, 12], ['K', 13, 5]],
    dmgLegs: [],
    wreck: { at: 10, rows: [
      '...........CCCCCCC',
      '..........CCCCCCCCC',
      '.........ccccccccccc',
      '.........cChhhhhhhhh',
      '.........cChhsessses',
      '.........cChhssesess',
      '..gg.....cChHsessses',
      '.grrR....cCHhsssmsss',
      '.rKrrR....HHhSsssss',
      'grrrkrR....pppppppp',
      'grrkrrR...PuuuyuusuU',
      'rKrrrKrR...RRRRRRRRs',
      'rrkrrrrRRuuuuuuuuuuuu',
      'rRRrKrrRRuuuuUuuuuUuu',
      'RRRRRRRRRUUUUUUUUUUxxxxx',
      'RgR.RRRR.UUUUUUUUUUxxxxxx',
    ] },
    mount: [['R', -2, -1, 4, 3], ['g', -2, -1, 4, 1], ['p', -1, 1, 2, 1]],
  },

  // Innocentia: long pink-lavender hair, sailor uniform with a player-colour collar and skirt,
  // a white backpack rig with twin guns on a turret behind her head and an uplink mast with a
  // dish and a blinking MAIA-pink beacon.
  int: {
    pivot: [4, 7],
    barrel: { size: 3, twin: true, n: 7, step: 3, start: 5 },
    pal: {
      h: '#f1b2e2', H: '#c77fc4', u: '#f7f7fb', U: '#c6c8de', i: '#a24fc6',
      r: '#c9cdda', R: '#8a8fa3', g: '#eceff6',
    },
    rig: { at: 0, rows: [
      '..BB',
      'g.R.g',
      '.ggg',
      '..R',
      '..R',
      '..R',
      '..R',
      '..Rgggggg',
      '..RrrrrrrR',
      '..RRRRRRRR',
      '.gggggggg',
      '.rrrrrrrrR',
      '.rpppppprR',
      '.rPPPPPPrR',
      '.rrrrrrrrR',
      '.rBrRrRrrR',
      '..RRRRRRR',
    ] },
    body: { at: 3, rows: [
      '...............h',
      '...........hhhhhh',
      '.........pphhhhhhhh',
      '........pPhhhhhhhhhh',
      '.......hhhhhhhhhhhhh',
      '.......hhhHhhhsshssh',
      '.......hhHhhhssesses',
      '.......hhHhhhssissis',
      '.......hhHhhhsbssssb',
      '.......hhHhhhssssmsS',
      '.......hhHhhhSsssss',
      '.......hhppppwssw',
      '.......hhPpppwyywww',
      '.......hHPPPwwwywWw',
      '.......hH.WwwwwwwWs',
      '.......hhppppppppp',
      '.......hpPpPpPpPpPp',
    ] },
    legs: [
      { at: 20, rows: [
        '...........ss..ss',
        '...........ss..ss',
        '...........ww..ww',
        '...........ww..ww',
        '...........ww..ww',
        '..........xxx..xxx',
      ] },
      { at: 20, rows: [
        '..........ss....ss',
        '..........ss....ss',
        '..........ww....ww',
        '..........ww....ww',
        '.........ww......ww',
        '.........xxx.....xxx',
      ] },
    ],
    dmgRig: [['k', 4, 12], ['K', 5, 12], ['K', 6, 13], ['k', 3, 14], ['_', 0, 1], ['K', 7, 8], ['k', 1, 15]],
    dmgBody: [['s', 18, 16], ['s', 12, 17], ['_', 10, 19], ['_', 16, 19], ['s', 14, 17], ['d', 20, 9], ['d', 20, 10], ['m', 16, 12], ['K', 11, 5]],
    dmgLegs: [['s', 11, 23], ['_', 16, 24]],
    wreck: { at: 9, rows: [
      '...............h',
      '...........hhhhhh',
      '.........hhhhhhhhhh',
      '........hhhhhhhhhhhh',
      '..R....hhhhhhhhhhhhh',
      '..R....hhhHhhhsshssh',
      '..R....hhHhhhsessses',
      '..R....hhHhhhssesess',
      '.gR....hhHhhhsessses',
      'grrR...hhHhhhsssmsssd',
      'rkrrR..hhHhhhSsssss',
      'rrKrR.hhhppppwssw',
      'rPkrR.hhhPpppwyywws',
      'RRRRRhhhhPPPwwwywWs',
      'RkgRhhhh.ppppppppppp',
      'gggghhhhpPpPpPpPpPpPwwwxx',
      'g..ghhhhPPPPPPPPPPPPwwwxx',
    ] },
    mount: [['R', -1, -1, 4, 3], ['g', -1, -1, 4, 1], ['B', 1, 0, 1, 1]],
  },
};

const GIRL_ART = {};
for (const id in GIRL_DEFS) {
  const d = GIRL_DEFS[id];
  GIRL_ART[id] = {
    pivot: [(d.pivot[0] + 0.5 - GIRL_AX) * GIRL_P, (d.pivot[1] + 0.5 - GIRL_GH) * GIRL_P],
    barrel: d.barrel,
  };
}

// ---- composition (cached) ----
function girlGrid() {
  const g = [];
  for (let r = 0; r < GIRL_GH; r++) g.push(new Array(GIRL_GW).fill('.'));
  return g;
}

function girlStamp(g, layer, dy = 0, map = null) {
  layer.rows.forEach((row, i) => {
    const r = layer.at + i + dy;
    if (r < 0 || r >= GIRL_GH) return;
    for (let c = 0; c < row.length && c < GIRL_GW; c++) {
      let ch = row[c];
      if (ch === '.') continue;
      if (map && map[ch]) ch = map[ch];
      g[r][c] = ch;
    }
  });
}

function girlOverlay(layer, marks, open) {
  if (!marks || !marks.length) return layer;
  const rows = layer.rows.map((s) => s.padEnd(GIRL_GW, '.').split(''));
  for (const [ch, c, r] of marks) {
    const i = r - layer.at;
    if (i < 0 || i >= rows.length) continue;
    // marks only land on the layer's own pixels (except sweat drops / scorch in the open air)
    if (rows[i][c] === '.' && !open.includes(ch)) continue;
    rows[i][c] = ch;
  }
  return { at: layer.at, rows: rows.map((a) => a.join('')) };
}

function girlOutline(g) {
  const out = g.map((row) => row.slice());
  for (let r = 0; r < GIRL_GH; r++) {
    for (let c = 0; c < GIRL_GW; c++) {
      if (g[r][c] !== '.') continue;
      const n = (rr, cc) => rr >= 0 && rr < GIRL_GH && cc >= 0 && cc < GIRL_GW && g[rr][cc] !== '.' && g[rr][cc] !== 'd';
      if (n(r - 1, c) || n(r + 1, c) || n(r, c - 1) || n(r, c + 1)) out[r][c] = 'o';
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
  return { keys: Object.keys(byKey).map((k) => [k, byKey[k]]), mask };
}

const _girlFrames = new Map();
function girlFrame(id, state, bob, blink, step) {
  const key = `${id}|${state}|${bob}|${blink}|${step}`;
  let f = _girlFrames.get(key);
  if (f) return f;
  const d = GIRL_DEFS[id];
  const g = girlGrid();
  if (state === 'wreck') {
    girlStamp(g, d.wreck);
  } else {
    const dmg = state === 'damaged';
    const rig = dmg ? girlOverlay(d.rig, d.dmgRig, '') : d.rig;
    const body = dmg ? girlOverlay(d.body, d.dmgBody, 'd') : d.body;
    const legs = dmg ? girlOverlay(d.legs[step], d.dmgLegs, '') : d.legs[step];
    girlStamp(g, rig);
    girlStamp(g, legs);
    girlStamp(g, body, bob, blink ? { e: 's', i: 'e' } : null);
    for (let r = 0; r < GIRL_GH; r++) for (let c = 0; c < GIRL_GW; c++) if (g[r][c] === '_') g[r][c] = '.';
  }
  f = girlRuns(girlOutline(g));
  _girlFrames.set(key, f);
  return f;
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
  pal.P = girlShade(color, -0.3);
  pal.q = girlShade(color, 0.35);
  if (state === 'damaged') {
    // rigging a little sooty
    for (const k of ['r', 'g']) pal[k] = girlHex(mixRgb(hexToRgb(pal[k]), [70, 66, 70], 0.18));
  } else if (state === 'wreck') {
    const ash = [58, 56, 62];
    for (const k in pal) {
      if (k === 'o' || k === 'e') continue;
      const c = hexToRgb(pal[k]);
      const lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
      let t = 0.25; // everything a little darker / greyer
      let rgbv = mixRgb(c, ash, t);
      if ('pPq'.includes(k)) rgbv = mixRgb([lum, lum, lum], ash, 0.45); // player colour: desaturated
      else if ('rRgBTt'.includes(k)) rgbv = mixRgb([lum, lum, lum], ash, 0.55); // rigging: charred greys
      else if ('sSb'.includes(k)) rgbv = mixRgb(c, ash, 0.12);
      pal[k] = girlHex(rgbv);
    }
  }
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

function drawGirl(ctx, o) {
  const d = GIRL_DEFS[o.id] || GIRL_DEFS.gwt;
  const id = GIRL_DEFS[o.id] ? o.id : 'gwt';
  const state = o.state === 'wreck' || o.state === 'damaged' ? o.state : 'ok';
  const t = o.t || 0;
  const x = Math.round(o.x);
  const y = Math.round(o.y);
  const p = { x, y, facing: o.facing < 0 ? -1 : 1 };
  let frame;
  if (state === 'wreck') frame = girlFrame(id, state, 0, 0, 0);
  else {
    // per-girl phase so a row of girls doesn't bob/blink in lockstep
    const ph = id === 'obj' ? 0.37 : id === 'int' ? 0.71 : 0;
    const bob = o.walking ? 0 : Math.floor(t / 0.6 + ph * 2) % 2;
    const bt = (t + ph * 3.1) % 3.1;
    const blink = bt > 2.98 ? 1 : 0;
    const step = o.walking ? Math.floor(t * 6) % 2 : 0;
    frame = girlFrame(id, state, bob, blink, step);
  }
  const pal = girlPalette(id, o.color || '#3d6fa8', state);
  const beaconOn = state !== 'wreck' && Math.floor(t * 2) % 2 === 0;
  for (const [k, runs] of frame.keys) {
    ctx.fillStyle = k === 'B' && beaconOn ? GIRL_BEACON : pal[k];
    for (let i = 0; i < runs.length; i += 3) girlFill(ctx, p, runs[i], runs[i + 1], runs[i + 2], 1);
  }
  if (o.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(o.flash, 0, 1) * 0.85})`;
    const m = frame.mask;
    for (let i = 0; i < m.length; i += 3) girlFill(ctx, p, m[i], m[i + 1], m[i + 2], 1);
  }
  return d;
}

function drawGirlMount(ctx, o) {
  if (o.state === 'wreck') return;
  const id = GIRL_DEFS[o.id] ? o.id : 'gwt';
  const d = GIRL_DEFS[id];
  const pal = girlPalette(id, o.color || '#3d6fa8', o.state === 'damaged' ? 'damaged' : 'ok');
  const p = { x: Math.round(o.x), y: Math.round(o.y), facing: o.facing < 0 ? -1 : 1 };
  const beaconOn = Math.floor((o.t || 0) * 2) % 2 === 0;
  const [pc, pr] = d.pivot;
  // dark outline box first, then the parts
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, dx, dy, w, h] of d.mount) {
    x0 = Math.min(x0, dx); y0 = Math.min(y0, dy); x1 = Math.max(x1, dx + w); y1 = Math.max(y1, dy + h);
  }
  ctx.fillStyle = GIRL_BASE_PAL.o;
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
