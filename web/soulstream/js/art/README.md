# Soulstream II art format

Each file under `js/art/` adds pieces to the global `ART` object:

```js
'use strict';
Object.assign(ART, {
  wolf: {
    kind: 'regular',            // regular (<= 32x16), boss (<= 44x20), player (<= 20x16), logo (<= 96x14)
    color: '#c8b48a',           // base colour
    accent: '#ff6a4d',          // mask 'a'
    accent2: '#ffd36b',         // mask 'b'
    art: String.raw`
   ...the picture...
`,
    mask: String.raw`
   ...same shape: ' ' or '.' base, 'a' accent, 'b' accent2, 'd' dim, 'h' white highlight...
`,
  },
});
```

- Printable ASCII only (32-126). No backtick and no `${` (the art sits in a `String.raw` template).
- The first and last blank lines of each block are dropped; trailing spaces are ignored.
- Enemies face LEFT (toward the player on the left); players face RIGHT.
- The mask is optional; when given it must have the same number of rows as the art, and each
  mask character colours the art character in the same row and column.
- Check a file with `node tools/artcheck.mjs js/art/<file>.js` (prints the art in colour and lists problems).
