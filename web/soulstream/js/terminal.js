'use strict';
// The terminal look. The original ran in a Windows console (it set `color 0F` and printed with echo),
// so everything here is drawn in the sixteen console colours (Windows' Campbell scheme): art, tiers,
// statuses and strata are snapped to the nearest one at load, and the console renderer snaps anything
// else it is given. Dim parts of the art use bright black, as a terminal would.
const CONSOLE = {
  black: '#0c0c0c', red: '#c50f1f', green: '#13a10e', yellow: '#c19c00', blue: '#0037da', magenta: '#881798', cyan: '#3a96dd', white: '#cccccc',
  gray: '#767676', bred: '#e74856', bgreen: '#16c60c', byellow: '#f9f1a5', bblue: '#3b78ff', bmagenta: '#b4009e', bcyan: '#61d6d6', bwhite: '#f2f2f2',
};
const CONSOLE_FG = Object.entries(CONSOLE).filter(([k]) => k !== 'black');
const _cc = new Map();
// nearest console colour (weighted RGB, hue-ish), cached; leaves non-hex values (hsl()) to a fixed pick
function consoleColor(c) {
  if (!c || c[0] !== '#') return CONSOLE.white;
  if (_cc.has(c)) return _cc.get(c);
  const n = parseInt(c.slice(1), 16);
  const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  let best = CONSOLE.white, bd = Infinity;
  for (const [, h] of CONSOLE_FG) {
    const m = parseInt(h.slice(1), 16);
    const dr = r - (m >> 16 & 255), dg = g - (m >> 8 & 255), db = b - (m & 255);
    const rm = (r + (m >> 16 & 255)) / 2;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = h; }
  }
  _cc.set(c, best);
  return best;
}
const DIM_INK = CONSOLE.gray;

// snap the data's colours once, so the HTML screens and the console agree
(function terminalize() {
  for (const a of Object.values(ART)) for (const k of ['color', 'accent', 'accent2']) if (a[k]) a[k] = consoleColor(a[k]);
  for (const s of STRATA) s.color = consoleColor(s.color);
  for (const s of Object.values(STATUS_INFO)) s.color = consoleColor(s.color);
  // A3's tiers in console colours: Common blue, Uncommon green, Rare red, Epic magenta, Mythical dark
  // magenta, Legendary cyan, Godly white, Luminous yellow
  const tier = { common: 'bblue', uncommon: 'bgreen', rare: 'bred', epic: 'bmagenta', mythical: 'magenta', legendary: 'bcyan', godly: 'bwhite', luminous: 'byellow' };
  for (const R of RARITIES) R.color = CONSOLE[tier[R.id]];
  for (const R of Object.values(RARITY_BY_ID)) R.color = CONSOLE[tier[R.id]];
  for (const e of Object.values(ENEMIES)) if (e.passive && e.passive.cycle) for (const set of e.passive.cycle.sets) if (set.color) set.color = consoleColor(set.color);
})();
