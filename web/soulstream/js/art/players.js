'use strict';
// Soulstream II: player figures (face right), title logo, menu sigil and shop-screen pieces.
Object.assign(ART, {
  pl_adventurer: {
    kind: 'player',
    name: 'Adventurer',
    color: '#c9ab7f',
    accent: '#ffcf5a',
    accent2: '#8f6a43',
    art: String.raw`
      ___
     /   \_
    (    o >
     \  -,'
  ___/'-'\___
 /##|  +  |  \
|###|     |\  \
|###|     | \_o]===-
 \__|=====|
    |     |
    |_____|
    /  _  \
   /  / \  \
 _/  /   \  \_
(___/     \___)
`,
    mask: String.raw`
      ddd
     d   dd
    d    . .
     d  ddd
  bb.........
 bbb.  a  .  .
bbbb.     ..  .
bbbb.     . ..ahhhhh
 bbb.bbbbb.
    .     .
    .......
    .  .  .
   .  . .  .
 ..  .   .  ..
.....     .....
`,
  },
  pl_eweca: {
    kind: 'player',
    name: 'Eweca',
    color: '#c6d2ec',
    accent: '#9fe8ff',
    accent2: '#6f86c8',
    art: String.raw`
       _       ,-.
      / \     ( ( *
     /   \     '-|'
    (  o  >      |
    _\ -'/_      |
   /  \+/  \___  |
  /|   |   |\__\(|)
 / |   |   |     |
'  |   |   |     |
   |   |   |     |
   |   |   |     |
   /   |   \     |
  /    |    \    |
 /     |     \   |
/_____~^~_____\ _|_
`,
    mask: String.raw`
       b       aaa
      b b     a a h
     b   b     aaaa
    b  .  .      d
    bb bbbb      d
   .  bab  ....  d
  ..   .   ......d.
 . .   .   .     d
.  .   .   .     d
   .   .   .     d
   .   .   .     d
   .   .   .     d
  .    .    .    d
 .     .     .   d
......aaa...... ddd
`,
  },
  pl_laceda: {
    kind: 'player',
    name: 'Laceda',
    color: '#c3c7d3',
    accent: '#ff3b4a',
    accent2: '#9a2234',
    art: String.raw`
                  .
                 /)
       .==.     //
     ~(  o >   //
       \ -'   //
   ___/'-'\__//
  /\  \+/  \=@=
 |  \  V  /  \)
 |  |\___/|\_/
  \_|=====|
    |__|__|
    /  _  \
   /  / \  \
 _/  /   \  \_
(___/     \___)
`,
    mask: String.raw`
                  h
                 hh
       .aa.     hh
     a.  . .   hh
       . ..   hh
   .........hhh
  ..  .a.  .aaa
 .  .  b  .  ..
 .  ..........
  ...bbbbb.
    .......
    .  .  .
   .  . .  .
 ..  .   .  ..
.....     .....
`,
  },
  pl_falias: {
    kind: 'player',
    name: 'Falias',
    color: '#a9b2c0',
    accent: '#ffd36b',
    accent2: '#7d8798',
    art: String.raw`
 .
 |     _||_
 |    /    \
_|_   | -==|
 #    |____|
 \\___/'--'\.-----.
  \ | .--. ||  |  |
   \| |  | ||  |  |
    | '--' ||--+--|
    |======||  |  |
    |______|'. | .'
    /  _  \   \|/
   /  / \  \   '
 _/  /   \  \_
(___/     \___)
`,
    mask: String.raw`
 h
 h     .aa.
 h    .    .
aaa   . .dd.
 b    ......
 ...........bbbbbbb
  . . .... .b  a  b
   .. .  . .b  a  b
    . .... .aaaaaaa
    .bbbbbb.b  a  b
    ........bb a bb
    .  .  .   bab
   .  . .  .   b
 ..  .   .  ..
.....     .....
`,
  },
  pl_luminous: {
    kind: 'player',
    name: 'Luminous',
    color: '#f5f1ff',
    accent: '#ffd36b',
    accent2: '#b38cff',
    art: String.raw`
._     .-=-.     .
| '.   '---'     |
\   '.  .--.     |
 \'.  '(  o >    |
  \ '.  \ -'     |
   \  '_/'-'\_  _|_
  /\'. \ + /  \_(_)
 |  \ '.\ /|     '
 |  |'._V_||
  \_|=====|
    |__|__|
    /  _  \
   /  / \  \
 _/  /   \  \_
(___/     \___)
`,
    mask: String.raw`
bb     aaaaa     h
b bb   aaaaa     h
b   bb  ....     h
 bbb  b.  . .    h
  b bb  . ..     h
   b  b.......  aaa
  .bb. . a .  .aaaa
 .  b ... ..     a
 .  ....a...
  ...aaaaa.
    .......
    .  .  .
   .  . .  .
 ..  .   .  ..
.....     .....
`,
  },
  logo: {
    kind: 'logo',
    color: '#7fe3ff',
    accent: '#c9a8ff',
    accent2: '#ffd36b',
    art: String.raw`
   _____  ____  _    _ _       _____ _______ _____  ______          __  __   _____ _____
  / ____|/ __ \| |  | | |     / ____|__   __|  __ \|  ____|   /\   |  \/  | |_   _|_   _|
 | (___ | |  | | |  | | |    | (___    | |  | |__) | |__     /  \  | \  / |   | |   | |
  \___ \| |  | | |  | | |     \___ \   | |  |  _  /|  __|   / /\ \ | |\/| |   | |   | |
  ____) | |__| | |__| | |____ ____) |  | |  | | \ \| |____ / ____ \| |  | |  _| |_ _| |_
 |_____/ \____/ \____/|______|_____/   |_|  |_|  \_\______/_/    \_\_|  |_| |_____|_____|
  .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ <+> ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.
`,
    mask: String.raw`
   hhhhh  hhhh  h    h h       hhhhh hhhhhhh hhhhh  hhhhhh          hh  hh   bbbbb bbbbb
  h hhhhhh hh hh h  h h h     h hhhhhhh   hhh  hh hh  hhhhh   hh   h  hh  h bb   bbb   bb
 . .... . .  . . .  . . .    . ....    . .  . .... . ...     .  .  . .  . .   b b   b b
  .... .. .  . . .  . . .     .... .   . .  .  .  ..  ...   . .. . . .... .   b b   b b
  aaaaa a aaaa a aaaa a aaaaa aaaaa a  a a  a a a aa aaaaa a aaaa aa a  a a  bb bb bb bb
 aaaaaaa aaaaaa aaaaaaaaaaaaaaaaaaaa   aaa  aaa  aaaaaaaaaaaa    aaaaa  aaa bbbbbbbbbbbbb
  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa hbh aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
`,
  },
  sigil: {
    kind: 'logo',
    color: '#7fe3ff',
    accent: '#c9a8ff',
    accent2: '#ffd36b',
    art: String.raw`
              ()
              ||
          <===++===>
              ||
        _.-~~~||~~~-._
      .'   .--||--.   '.
  ~~~(    (   ||   )    )~~~
      '.   '--||--'   .'
        '-.___||___.-'
              ||
              \/
`,
    mask: String.raw`
              bb
              dd
          bbbbbbbbbb
              hh
        ..aaaahhaaaa..
      ..   aaahhaaa   ..
  ddd.    a   hh   a    .ddd
      ..   aaahhaaa   ..
        ..aaaahhaaaa..
              hh
              hh
`,
  },
  emporium: {
    kind: 'regular',
    color: '#b89a72',
    accent: '#d9534f',
    accent2: '#ffd36b',
    art: String.raw`
    .----------------------.
    |  ~ E M P O R I U M ~ |
    '-----.----------.-----'
 _________|__________|_________
/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/\
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/
 ||  :    :    :     :    :  ||
(@)  n    Y    Y     Y    n (@)
 || [_]  (_)  {_}   (_)  [_] ||
 ||==========================||
 || .--. .--. .--. .--. .--. ||
 || |::| |  | |::| |  | |::| ||
 ||_|__|_|__|_|__|_|__|_|__|_||
`,
    mask: String.raw`
    ........................
    .  a b b b b b b b b a .
    ........................
 ..............................
..aa..aa..aa..aa..aa..aa..aa..aa
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
 ..  d    d    d     d    d  ..
bhb  .    .    .     .    . .hb
 .. bbb  aaa  hhh   aaa  bbb ..
 ..............................
 .. dddd dddd dddd dddd dddd ..
 .. dbbd d  d dbbd d  d dbbd ..
 ...dddddddddddddddddddddddd...
`,
  },
  forge: {
    kind: 'regular',
    color: '#8e96a3',
    accent: '#ff9a3c',
    accent2: '#ffd36b',
    art: String.raw`
                             //
     .   '   *   '  .       //
  *    \   \ | /   /   *   //
    '   --  .*.  --   '  _//_
          _[=====]_     |    |
 _______________________|____|
 \______                     |
        '-.__           ___.-'
             |         |
             |         |
           __|         |__
         _/_______________\_
        |___________________|
`,
    mask: String.raw`
                             dd
     a   a   h   a  a       dd
  h    a   a a a   a   .   dd
    a   aa  aha  aa   a  ....
          aahhhhhaa     .    .
 .............................
 .......                     .
        .....           ......
             .         .
             .         .
           ddd         ddd
         ddddddddddddddddddd
        ddddddddddddddddddddd
`,
  },
  shrine: {
    kind: 'regular',
    color: '#9a96a8',
    accent: '#ffb347',
    accent2: '#ffe08a',
    art: String.raw`
               /\
              /  \
          ___/____\___
         /____________\
          |  .----.  |
          | /   (  \ |
          ||   ) )  ||
          ||  ( ( ) ||
          || \____/ ||
          || [____] ||
        __||________||__
       /________________\
      |__________________|
`,
    mask: String.raw`
               ..
              .  .
          ............
         ..............
          .  dddddd  .
          . .   h  . .
          ..   b b  ..
          ..  a a a ..
          .. aaaaaa ..
          .. ...... ..
        dddddddddddddddd
       dddddddddddddddddd
      dddddddddddddddddddd
`,
  },
});
