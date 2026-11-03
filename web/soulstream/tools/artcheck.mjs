// Art checker: node tools/artcheck.mjs js/art/s1.js [id ...]
// Loads an art file the way the game does, validates each piece and prints it with its mask colours
// (24-bit ANSI) so alignment can be checked by eye. Piped (or with --plain) it prints the art and its
// mask side by side instead.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const LIMITS = { regular: { w: 32, h: 16 }, boss: { w: 44, h: 20 }, player: { w: 20, h: 16 }, logo: { w: 96, h: 14 }, homage: { w: 20, h: 26 } };
const file = process.argv[2];
const only = process.argv.slice(3).filter((a) => !a.startsWith('--'));
if (!file) { console.log('usage: node tools/artcheck.mjs <art file> [id ...]'); process.exit(1); }
const ctx = { ART: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: path.basename(file) });

const trimBlock = (s) => {
  const lines = s.replace(/\r/g, '').split('\n');
  if (lines.length && lines[0].trim() === '') lines.shift();
  if (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.map((l) => l.replace(/\s+$/, ''));
};
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const fg = (h, dim) => { let [r, g, b] = hex(h); if (dim) { r = r * 0.45 | 0; g = g * 0.45 | 0; b = b * 0.45 | 0; } return `\x1b[38;2;${r};${g};${b}m`; };

let bad = 0;
for (const [id, a] of Object.entries(ctx.ART)) {
  if (only.length && !only.includes(id)) continue;
  const errs = [];
  const kind = a.kind || 'regular';
  const lim = LIMITS[kind] || LIMITS.regular;
  if (typeof a.art !== 'string') { console.log(`${id}: no art string`); bad++; continue; }
  const lines = trimBlock(a.art);
  const w = Math.max(...lines.map((l) => l.length));
  if (w > lim.w) errs.push(`too wide: ${w} > ${lim.w}`);
  if (lines.length > lim.h) errs.push(`too tall: ${lines.length} > ${lim.h}`);
  if (/[^\x20-\x7e]/.test(lines.join(''))) errs.push('non-ASCII character');
  for (const k of ['color']) if (!/^#[0-9a-f]{6}$/i.test(a[k] || '')) errs.push(`bad ${k}`);
  for (const k of ['accent', 'accent2']) if (a[k] && !/^#[0-9a-f]{6}$/i.test(a[k])) errs.push(`bad ${k}`);
  let mask = null;
  if (a.mask) {
    mask = trimBlock(a.mask);
    if (mask.length !== lines.length) errs.push(`mask rows ${mask.length} != art rows ${lines.length}`);
    mask.forEach((m, i) => {
      if (/[^ .adbh]/.test(m)) errs.push(`mask row ${i} has chars other than " .abdh"`);
      if (lines[i] !== undefined && m.length > lines[i].length) {
        // a mask letter over a blank art cell does nothing, but usually means the mask is shifted
        const extra = m.slice(lines[i].length).replace(/[ .]/g, '');
        if (extra) errs.push(`mask row ${i} paints past the end of the art row`);
      }
    });
  }
  console.log(`\n\x1b[1m${id}\x1b[0m  [${kind}] ${w}x${lines.length}${a.name ? '  ' + a.name : ''}`);
  const pal = { '.': a.color, ' ': a.color, a: a.accent || a.color, b: a.accent2 || a.accent || a.color, d: a.color, h: '#ffffff' };
  const plain = !process.stdout.isTTY || process.argv.includes('--plain');
  lines.forEach((l, i) => {
    if (plain) { console.log('  |' + l.padEnd(w) + '|   |' + ((mask && mask[i]) || '').padEnd(w) + '|'); return; }
    let out = '';
    for (let x = 0; x < l.length; x++) {
      const m = (mask && mask[i] && mask[i][x]) || '.';
      out += fg(pal[m] || a.color, m === 'd') + l[x];
    }
    console.log('  |' + out + '\x1b[0m' + ' '.repeat(Math.max(0, w - l.length)) + '|');
  });
  if (errs.length) { bad++; console.log('  \x1b[31m' + errs.join('\n  ') + '\x1b[0m'); }
}
console.log(bad ? `\n${bad} piece(s) with problems` : '\nall pieces OK');
process.exit(bad ? 1 : 0);
