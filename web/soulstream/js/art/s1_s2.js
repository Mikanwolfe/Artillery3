'use strict';
// Stratum 1 (The Outskirts) and Stratum 2 (The Barrow) enemies.
Object.assign(ART, {
  cutpurse: {
    kind: 'regular',
    name: 'Cutpurse',
    color: '#a88f6c',
    accent: '#d4dae4',
    accent2: '#f0c040',
    art: String.raw`
            _.-""""-._
          .'  .----.  '.
         /  .'      '.  \
        |  /  o    o  \  |
        |  |    ''    |  |
         \  '.______.'  /'.
          '.          .'   '.
<=====|]=(_)-.______.-'  ,   \
         '-./  /[$]\  \   '.  \
           /  /'---'\  \    '. |
          /  /       \  \     \|
     ____/  /         \  \____/
    (______/           \______)
`,
    mask: String.raw`
            ..........
          ..  ......  ..
         .  dd      dd  .
        .  d  b    b  d  .
        .  d    dd    d  .
         .  dddddddddd  ...
          ..          ..   ..
haaaaabb...............  .   .
         ....  .bbb.  .   ..  .
           .  .bbbbb.  .    .. .
          .  .       .  .     ..
     .....  .         .  ......
    ........           ........
`,
  },
  wolf: {
    kind: 'regular',
    name: 'Feral Wolf',
    color: '#a59e92',
    accent: '#ff4a3a',
    accent2: '#ffd24a',
    art: String.raw`
        /\ /\
       /  V  \.^^^^^^^^._
    .-'  @    \ ^ ^ ^ ^  '-.  ,
 .-'           \           './ )
<'____          |            /
 \VvVv)         | .------.  |
  ^^^^\        / /        \ \
  '---'\      / /          \ \
        \    / /            ) )
        /   /'             / /
       /   /             _/ /
     _/  .'             /  /
    /___/              /__/
`,
    mask: String.raw`
        .. ..
       .  .  .ddddddddddd
    ...  b    d d d d d  ...  .
 ...           .           ... .
a.....          .            .
 ahhhh.         . dddddddd  .
  hhhha        . d        d .
  ......      . .          . .
        .    . .            . .
        .   ..             . .
       .   .             dd .
     ..  ..             d  .
    .....              dddd
`,
  },
  brute: {
    kind: 'regular',
    name: 'Bandit Brute',
    color: '#c39a76',
    accent: '#c0642a',
    accent2: '#d6dbe2',
    art: String.raw`
                        ,^.^.
                      <'     '>
                     <  ^ ^ ^  >
          _____       '>.^.^.<'
        .' ___ '.      / /
       /  /o  o\ \    / /
       |  \ <   /|   / /
       \  '==='  /  / /
     __.'.____.'.__/_/
   .'   \\     //  (__)
  /  /|  \\   //  |  \
 |  | |   \\ //   |   |
 |  | |  ( '@' )  |   |
(____)|  (     )  |   |
      |___\___/___|___/
       /__/   \__\
`,
    mask: String.raw`
                        dbdbd
                      bd     db
                     b  b b b  b
          .....       bbdddddbb
        .. ... ..      d .
       .  .a  a. .    d d
       .  . .   ..   d d
       .  .....  .  d d
     ..............ddd
   ..   aa     aa  ....
  .  ..  aa   aa  .  .
 .  . .   aa aa   .   .
 .  . .  . ... .  .   .
.......  .     .  .   .
      .aaaaaaaaaaa.....
       ....   ....
`,
  },
  spearman: {
    kind: 'regular',
    name: 'Deserter Spearman',
    color: '#a3a39a',
    accent: '#dfe4ea',
    accent2: '#b8783a',
    art: String.raw`
               ______
           ___/______\___
              (o    |
             <     _|
              \_='_/
           .--'|  |'--.
<|>====------/--(=)----\--(=)---
         .-''-,-.  :    |  |
        / .--,. \  :    | /
       | | (@)  ||  :   |/
       |  '---' ||  :   |
        \  '.' / |__:__/
         '-..-' /\/\/\/\
            /   /    \  \
          _/   /      \  \_
         (____/        \___)
`,
    mask: String.raw`
               aaaaaa
           aaaaaaaaaaaaaa
              .a    .
             .     ..
              ......
           .....  .....
hhhaaaabbbbbb...................
         bbbbbbbb  .    .  .
        b bbbbb b  .    . .
       b b aaa  b.  .   ..
       b  bbbbb b.  .   .
        b  bbb b .d.d...
         bbbbbb b.......
            .   .    .  .
          ..   .      .  ..
         ......        .....
`,
  },
  hedgewitch: {
    kind: 'regular',
    name: 'Hedge Witch',
    color: '#9e9a80',
    accent: '#86d65e',
    accent2: '#e8a642',
    art: String.raw`
              _
            /' )
           /  /
          /   \
  _      /     \
 ( )    /       \
  \\ __/_________\__
  ||'--.________.---'  __
 %||%  ,'o  |\\\\\   <(o )_
%%||%%<     | \\\\\   (  ._>
 \||/  \ ~  /  \\\\\._/\/\
  ||    '-./ .--.  '.     \
 (||)-----' /    \   \     |
  ||   *   | (@@) |   \    |
  ||   ~ ~  \ '' /  ___\   |
 _||_ ______/    \_/    \__|
`,
    mask: String.raw`
              .
            .. .
           .  .
          .   .
  b      .     .
 b b    .       .
  .. ...............
  ..bbbbbbbbbbbbbbbbb  dd
 adda  ..a  .ddddd   bdb dd
aaddaa.     . ddddd   d  ddb
 adda  . .  .  ddddd.ddddd
  ..    .... ....  ..     .
 .......... .    .   .     .
  ..   b   . bbbb .   .    .
  ..   a a  . bb .  ....   .
 .... .......    ...    ....
`,
  },
  grell: {
    kind: 'boss',
    name: 'Captain Grell of the Red Hand',
    color: '#bba07c',
    accent: '#e8402e',
    accent2: '#e8c24a',
    art: String.raw`
       ,                        ||_________
      /)               .~~.     ||  _ _ _  |
     / )        _.~~~~~'        || | | | |_|
    /  /    ___/__________\___  || |     / |
   /  /    '--.____________.--' ||  \___/  /
  /  /        |  ____  _   |    ||/\/\/\/\/
 /  /         | |####|(@)  |    ||
(==(_         |  '--'   \  |    ||
  \___)       \   ~~~~~~   /    ||
   \  \        \  \||||/  /     ||
    \  \__.----'.__'--'_.'--._  ||
     \     /   \  '----'  /  \\ ||
      '---/     \ [o][o] /  \ \ ||
         /    |  \======/  | \ \||
        /     |   |    |   |  ) ||
       /  o==========[]===(__/  ||
      /   /   |   |    |   |    ||
     /   /    |   |    |   |    ||
    /   /     |___|    |___|    ||
   /___/     (____)   (____)  __||__
`,
    mask: String.raw`
       .                        ddddddddddd
      ..               aaaa     dd  a a a  d
     h .        aaaaaaaa        dd a a a aad
    h  .    ..................  dd a     a d
   h  .    dddddddddddddddddddd dd  aaaaa  d
  h  h        .  ....  .   .    ddddddddddd
 h  h         . .dddd.bhb  .    dd
bbbb.         .  ....   .  .    dd
  .....       .   dddddd   .    dd
   .  .        .  dddddd  .     dd
    .  .......................  dd
     .     .   .  ......  .  .. dd
      .....     . bbbbbb .  . . dd
         .    .  .aaaaaa.  . . .dd
        .     .   .    .   .  . dd
       .  dddddddddddbb.......  dd
      .   .   .   .    .   .    dd
     .   .    .   .    .   .    dd
    .   .     .....    .....    dd
   .....     ......   ......  dddddd
`,
  },
  skeleton: {
    kind: 'regular',
    name: 'Barrow Skeleton',
    color: '#ddd6c0',
    accent: '#b8703c',
    accent2: '#7fe08a',
    art: String.raw`
            .-""-.
           / _  _ \
          | (o)(o) |
          |   /\   |    ______
           \ |||| /    /  /   \
            '-..-'    |  /     |
 _________[]=O-.||.-._|  \     |
<_v____v__[]   =||=   |   >    |
             ==||==   |  /     |
              =||=     \ \    /
               ||       \_|__/
             .-''-.
            (  /\  )
             ||  ||
             ||  ||
           _//    \\_
`,
    mask: String.raw`
            ......
           . .  . .
          . .b..b. .
          .   ..   .    ......
           . .... .    d  d   .
            ......    .  d     .
 aaaaaaaaadd...........  d     .
haaaaaaaaadd   ....   .   d    .
             ......   .  d     .
              ....     d d    .
               d.       ......
             ......
            .  ..  .
             ..  ..
             ..  ..
           ...    ...
`,
  },
  ghoul: {
    kind: 'regular',
    name: 'Ghoul',
    color: '#a3b48e',
    accent: '#c6ff5a',
    accent2: '#e05050',
    art: String.raw`
                 _ ^ ^ ^ _
            _.-^' ^ ^ ^ '^-._
         .-'               '-.
      _.'                    \
    .' (O)  '-.               \
 _.'      ,_   )      ,        |
<__,  ,-'   \  \     /    .-.  |
 \VvV/       |  \___/    /   \ /
 ;: \;       |   /      /     \/
  ;   \     /   /      /      /
  :   ,\   /   /     ,'     _/
<\\\\'  ) /   /    <'''-.  /
<\\\\__/ (___/      '''-_)/
`,
    mask: String.raw`
                 . . . . .
            ..... . . . .....
         ...               ...
      ...                    .
    .. aha  ...               .
 ...      ..   .      .        .
....  ...   .  .     d    ddd  d
 .hhh.       .  ...dd    d   d d
 bb bb       .   .      d     dd
  b   .     .   .      d      d
  b   ..   .   .     dd     dd
hhhhh.  . .   .    dddddd  d
hhhhh... .....      ddddddd
`,
  },
  wisp: {
    kind: 'regular',
    name: 'Corpse Wisp',
    color: '#8fe6b0',
    accent: '#e4fff0',
    accent2: '#3fcf7f',
    art: String.raw`
           (
   (       )\      )
 )  \    _/  )    (
(    )  (   (   )  \
 )  (    )   \ (    )
(   .-'''   '''-.  (
 ) /             \  )
( |   .--. .--.   |(
  |  ( () V () )  |
   \  '--'^'--'  /
    '. '"'"'"' .'
      '-.___.-'
     .   : :   ,
  '    .  '  .    '
     ,   . .    .
          '
`,
    mask: String.raw`
           b
   b       bb      b
 b  b    bb  b    b
b    b  b   b   b  b
 b  b    b   b b    b
b   .....   .....  b
 b .             .  b
b .   .... ....   bb
  .  d aa d aa d  .
   .  ddddddddd  .
    .. ddddddd ..
      .........
     b   h h   b
  b    b  b  b    b
     b   b b    b
          d
`,
  },
  cultist: {
    kind: 'regular',
    name: 'Grave Cultist',
    color: '#949cb0',
    accent: '#ffcf5a',
    accent2: '#6cf08c',
    art: String.raw`
     (
     )'
    _|_         _.---._
  .'   '.     .'  ___  '.
 | () () |   /  .'   '.  \
  \  ^  /   |  /  * *  \  |
   |'"'|    |  |       |  |
    '|'    _|   \     /   |
     |===( (_/   '---'    |\
     |     /    |   |      \
     |    /    /|   |\      \
     |   /    / |   | \      \
  _.-|--/____/__|___|__\_____\._
.'   | +   *   +   *   +   * '.
 '-._|____________________..-'
`,
    mask: String.raw`
     a
     aa
    hah         .......
  ..   ..     ..  ...  ..
 . bb bb .   .  dd   dd  .
  .  .  .   .  d  b b  d  .
   .....    .  d       d  .
    ...    ..   d     d   .
     d.... ...   ddddd    ..
     d     .    .   .      .
     d    .    ..   ..      .
     d   .    . .   . .      .
  bbbd........................bb
bb   . b   b   b   b   b   b bb
 bbbb.....................bbbb
`,
  },
  wight: {
    kind: 'regular',
    name: 'Barrow Wight',
    color: '#9ea9b8',
    accent: '#7cf0ff',
    accent2: '#d6dce6',
    art: String.raw`
            .-----.
           /  _|_  \
          | -=='==- |
          |   _|_   |
           \ |||||  /
      _.---'-.___.-'---._
    .' .--.   _|_   .--. '.
   / /(    )=(___)=(    )\ \
  / /  '--' \ | | / '--'  \ \
 / /|       || | ||       |\ \
/_/ |  .----|| | ||----.  | \_\
  / |  |####|| | ||####|  |  \
 /  |  '-.  || | ||  .-'  |   \
/\/\|    |  ||  V||  |    |/\/\
    |   _|  |'   '|  |_   |
   _/  (___/       \___)  \_
`,
    mask: String.raw`
            .......
           .  ...  .
          . aaa.aaa .
          .   ...   .
           . .....  .
      ...................
    .. ....   bbb   .... ..
   d ..    .bbbbbbb.    .. d
  d .  .... . b b . ....  . d
 d d.       .b b b.       .d d
ddd .  ......b b b......  . ddd
  d .  .dddd.b b b.dddd.  .  d
 d  .  ...  .b b b.  ...  .   d
dddd.    .  .b  bb.  .    .dddd
    .   ..  ..   ..  ..   .
   d.  .....       .....  .d
`,
  },
  barrowking: {
    kind: 'boss',
    name: 'The Barrow King',
    color: '#dcd6c2',
    accent: '#5cff8a',
    accent2: '#e8c24a',
    art: String.raw`
       .-.        _/\/\/\_        .-.
      (o o)      |_o_<>_o_|      (o o)
       |=|       /  _  _  \       |=|
       |=|      |  (@)(@)  |      |=|
  _    |=|      |    /\    |      |=|
 / \   |=|       \ ,||||, /       |=|
( @ )  |=|   .---'\||||||/'---.   |=|
 \ /   |=| .'      \||||/      '. |=|
  |    |=|/  .-.    \||/    .-.  \|=|
  |  __|=|  /   \   |\/|   /   \  |=|__
,/|\==='--./  .-'\  |  |  /'-.  \.--'===(
'\|/'  |=| | / |  \  \/  /  | \ | |=|  |||
  |    |=| | | |   \    /   | | | |=|  '''
  |    |=| | | |____\  /____| | | |=|
  |    |=| | |      |\/|      | | |=|
  |    |=| | |      |  |      | | |=|
  |  __|=|_|_|______|  |______|_|_|=|__
  | (_________/||\_      _/||\___________)
  |    (o o)(o o)(o o)(o o)(o o)(o o)
 _|_    '-'  '-'  '-'  '-'  '-'  '-'
`,
    mask: String.raw`
       ddd        bbbbbbbb        ddd
      da ad      bbbbaabbbb      da ad
       ddd       .  .  .  .       ddd
       ddd      .  ahaaha  .      ddd
  a    ddd      .    ..    .      ddd
 a a   ddd       . ...... .       ddd
a h a  ddd   ..................   ddd
 a a   ddd ..      ......      .. ddd
  d    ddd.  ...    ....    ...  .ddd
  d  ddddd  .   .   ....   .   .  ddddd
............  ....  .  .  ....  .........
.....  ddd . . .  .  ..  .  . . . ddd  ...
  d    ddd . . .   .    .   . . . ddd  ...
  d    ddd . . ......  ...... . . ddd
  d    ddd . .      ....      . . ddd
  d    ddd . .      .  .      . . ddd
  d  dddddd..........  ...........ddddd
  d ddddddddd......      ......ddddddddddd
  d    dd dddd dddd dddd dddd dddd dd
 ddd    ddd  ddd  ddd  ddd  ddd  ddd
`,
  },
});
