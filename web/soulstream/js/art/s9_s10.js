'use strict';
// Stratum 9 (The Abyss) and Stratum 10 (The Primordial Throne) enemies.
Object.assign(ART, {
  maw: {
    kind: 'regular',
    name: 'Abyssal Maw',
    color: '#a98ad8',
    accent: '#efe4c8',
    accent2: '#ff3fbf',
    art: String.raw`
       _.--~~~~~~--._
    .-'   _.----._   '-.
  .'  .-'VVVVVVVVVV'-.  '.
 /  .'V/ .-''''''-. \V'.  \
|  /V> .'VVVVVVVVVV'. <V\  |
| |V> / >          < \ <V| |
| |>  |>    (@@)    <|  <| |
| |A> \ >          < / <A| |
|  \A> '.AAAAAAAAAA.' <A/  |
 \  '.A\ '-......-' /A.'  /
  '.  '-.AAAAAAAAAA.-'  .'
    '-._  '------'  _.-'
     ) ('--~~~~~~--') (
    (  )  ) (  ) (  (  )
    (   )  )(  (  (  (
     '   '  '   '  '   '
`,
    mask: String.raw`
       ....dddddd

  ..  ...aaaaaaaaaa
 .  ..a. .......... .a
.  .aa ..aaaaaaaaaa.. aa
. .aa . a          a . aa
. .a  .a    bbbb    a.  a
. .aa . a          a . aa
.  .aa ..aaaaaaaaaa.. aa
 .  ..a. .......... .a
  ..  ...aaaaaaaaaa

     d dddddddddddddd d
    d  d  d d  d d  d  d
    d   d  dd  d  d  d
     d   d  d   d  d   d
`,
  },
  larva: {
    kind: 'regular',
    name: 'Star-Eater Larva',
    color: '#c79ad8',
    accent: '#ff5fd0',
    accent2: '#8ff3ff',
    art: String.raw`
               .-~~-.
          .-~~/ * . \-~~-.
       .-/  + | . + | .  *\-~-.
     ./ .  *  |*  . | + . | * .\
    /  .    . | . * |.   *| . +|
  _/ (@)   .  |+  . | *   |+ */
 /  _.--.  .  | .   |  .  | ./
<,-'     \ .  '.__.-'.__.-'_/
 V        ) _.'/\/\  /\/\ ''
 A    _.-'
<'--''
`,
    mask: String.raw`
               d....d
          d.... b d .....d
       d..  b . d b . d  b....d
     .. d  b  .b  d . b d . b d
    .  d    d . d b .d   b. d b
  .. .a.   d  .b  d . b   .b b
 .  ....d  d  . d   .  d  . d
h
 h        . ...dddd  dddd
 h
h
`,
  },
  choir: {
    kind: 'regular',
    name: 'Faceless Choir',
    color: '#b49ae0',
    accent: '#ff4fc8',
    accent2: '#e9dfc4',
    art: String.raw`
               /\
              /  \
       /\    / __ \    /\
      /  \  / /  \ \  /  \
     / __ \| |    | |/ __ \
    / /  \ \ | () | / /  \ \
 ~ | |    | | \__/ | |    | |
  ~| | () | |      | | () | |
 ~ |  \__/  |      |  \__/  |
   |        '.    .'        |
   |    :     '..'     :    |
   |    :      ::      :    |
  /     :      ::      :     \
 /     :'      ::      ':     \
/_____:'_______::_______':_____\
`,
    mask: String.raw`


       ..    . dd
      .  .  . d  d
     . dd .. d    d .. dd
    . d  d . d aa d . d  d
 a . d    d . dddd . d    d
  a. d aa d .      . d aa d
 a .  dddd  .      .  dddd
   .        dd    dd
   .    d     dddd     d
   .    d      dd      d
  .     d      dd      d
 .     dd      dd      dd
......dd.......dd.......dd
`,
  },
  nullknight: {
    kind: 'regular',
    name: 'Null Knight',
    color: '#9fe8e0',
    accent: '#ff4fc8',
    accent2: '#c9a8ff',
    art: String.raw`
            /\  .--.  /\
            \ \/    \/ /
             |  ==    |
             |  ---.  |
              \_____)/
         .---'-.___.-'---.
        (  .     *    .   )
         \   /'-.   .    /
          | /    '.    . |
<\/\/\/\/\/\==o=  )  *   |
          | \    .'  .   |
          |  '-.'   .    |
          | .    .--.  . |
          |     /    \   |
          |    /      \  |
         _|___/        \_|_
`,
    mask: String.raw`


             .  bb



        .  d     d    d
         .   ....   d
          . .    ..    d
aaaaaaaaaaaabbhb  .  d
          . .    ..  d
          .  ....   d
          . d    ....  d



`,
  },
  hollow: {
    kind: 'regular',
    name: 'Hollow Angel',
    color: '#e6dcc0',
    accent: '#ffe58a',
    accent2: '#ff4fc8',
    art: String.raw`
_            _.-~-.,           _
\'-._      ,'       '      _.-'/
 \   '-._   '-._  ,'   _.-'   /
  \ \    '-._ .-.  _.-'    / /
   \ \ \     (O O)      / / /
    \ \ \ \   \"/    / / / /
    /\ \ \ \.--'|'--./ / / /\
   / /\/\ \/ /(|)\  \/ /\/\ \
   \/ \/ \/ |(( | ))| \/ \/ \/
            |(( | ))|
             \'-|-'/
              | | |
              '/ \'
              /   \
             '     '
`,
    mask: String.raw`
.            aaaaaaa
.....      aa       a
 .   ....   aaaa  aa

   . . .     .b b

    dd d d d.........d d d dd
   d dddd dd .ddd.  dd dddd d
   dd dd dd .dd d dd. dd dd dd
            .dd d dd
             ...d




`,
  },
  leviathan: {
    kind: 'boss',
    name: 'The Leviathan Beneath',
    color: '#8f7fe0',
    accent: '#ff4fc8',
    accent2: '#5ff0d8',
    art: String.raw`
            /\  /\  /\  /\
       _.--'  ''  ''  ''  '-._
    .-'  o  O  o  O  o  O  @  '-.
  .'  O   o  O  o  O  o  O  o    \
 /______.                         \
<V V V V '-.__________             |>
  V  V  V  V  V  V  V '-.          |
                         \   )))   |>
     ~   ~    ~    ~      |  )))   |
                          |  )))   |>  _.._
  A  A  A  A  A  A  A _.-'         |  /.--.\
<A A A A .__________.-'            |> ||  ||
 \_______..-------''--.._          |  ||  ||
                         '.  =     |> ||  ||
                           \  =    |  ||  ||
                            |  =   |  ||  ||
  ~  ~~  ~   ~~  ~  ~~   ~  |  =   |~~||  ||
~~  ~  ~~  ~  ~~  ~~  ~~  ~ |~~  ~ |~~| ~~ |
  ~   ~~   ~  ~~   ~   ~~    ~   ~~    ~~
 ~~   ~  ~~   ~~  ~   ~~  ~~   ~   ~   ~ ~~
`,
    mask: String.raw`


    ...  a  a  a  a  a  a  h
  ..  a   a  a  a  a  a  a  a

.h h h h
  h  h  h  h  h  h  h
                         .   ddd
     a   a    a    a      .  ddd
                          .  ddd
  h  h  h  h  h  h  h
.h h h h

                         ..  d
                           .  d
                            .  d
  b  bb  b   bb  b  bb   b  .  d   .bb
bb  b  bb  b  bb  bb  bb  b .bb  b .bb. bb
  b   bb   b  bb   b   bb    b   bb    bb
 bb   b  bb   bb  b   bb  bb   b   b   b bb
`,
  },
  ashtitan: {
    kind: 'regular',
    name: 'Titan of Ash',
    color: '#b8a698',
    accent: '#ff6a1f',
    accent2: '#ffc44d',
    art: String.raw`
 ( )  (      _______   (  ) (
(  ) (  )   /       \   ) (  ) (
 ) (  )    | @   @   |   (  ) (
  ( )      |'vvvvv'  |    ) (
  _.--''''--\__\/\__/-''''--._
 /  /  \                /  \  \
|  /   \   .-.    .-.   /   \  |
| /  |  \ /   '--'   \ /  |  \ |
|/ .'   |/  /      \  \|   '. \|
| /  .  |  \   ||   /  |  .  \ |
|\ .-.  |'.  /    \  .'|  .-. /|
| (   ) |  '-.\  /.-'  | (   ) |
'-.'-'.-' \   '..'   / '-.'-'.-'
        |  /  /  \  \  |
       /  /  |    |  \  \
      /___\__|    |__/___\
`,
    mask: String.raw`
 d d  d      .......   d  d d
d  d d  d   .       .   d d  d d
 d d  d    . b   b   .   d  d d
  d d      ..aaaaa.  .    d d
  .............aaa
 .  a  a                a  a
.  .   a   ...    ...   a
. .  a  a .   ....   . a  a
.. ..   ..  a      a
. a  .  .  a   aa   a  .  .  a
.a ...  ...  a    a  ...  ... a
. .   . .  ...a  a
......... a   ....   a
        .  a  .  .  a
       .  a  .    .  a
      ....a...    ...a
`,
  },
  chaosserpent: {
    kind: 'regular',
    name: 'Chaos Serpent',
    color: '#ffb35a',
    accent: '#ff4f3a',
    accent2: '#ffe9a0',
    art: String.raw`
         _.-~~==~~-._
     _.-'  _.-~~-._  '-._
   .'  _.-'   +    '-._  '.
  /  .'   *       .    '.  \
 /  /  .      +      *   \  \
|= |      +      *        |= |
|= |   *     .      +     |= |
|= |     .      +     .   |= |
 \  \       *      .     /  /
  \  \      ___        .'  /
   \  \ _.-' @ '-.__.-'  .'
    \ /'VVVV       __.-'
     '>~~    __.--''
      \'AAAA'
`,
    mask: String.raw`
         .....dd

   ..  ....   b
  .  ..   b       b
 .  .  b      b      b
.d .      b      b        .d
.d .   b     b      b     .d
.d .     b      b     b   .d
 .  .       b      b

   .  . .... a
    . ..bbbb
     ..aa
      ..bbbb
`,
  },
  wyrm: {
    kind: 'regular',
    name: 'Ancient Wyrm',
    color: '#d8a873',
    accent: '#ff5a1f',
    accent2: '#fff0b0',
    art: String.raw`
                 __.----._
             _.-'  _.-._  '-.
           .'   .-'     '-.  \
 ( )      /   .'           \  |
(  ) (   /   /              \ |
 ) (  __/   /  _             \|
  _.-'   ___\   \             V
 / o   ./ @ \'.  \>
<      '-..-'     \
 '-.___vVv____.    \>
     \ \ | / / \ '  \
      \ \|/ /   \ '  \>
       \ | /     \ '  \
        \|/       \ '  \>
         V         \ '  \
`,
    mask: String.raw`
                 bbbbbbbbb
             bbbb  bbbbb  bbb
           bb   bbb     bbb  b
 d d      b   bb           b  b
d  d d   b   b              b b
 d d  ...   b  b             bb
  ....   ....   .             b
 . d   .. a ...  .a

 ......hhh.....    .a
     . . . . . . d
      . ... .   . d  .a
       . . .     . d
        ...       . d  .a
         .         . d
`,
  },
  warden: {
    kind: 'regular',
    name: 'World-Tree Warden',
    color: '#c9a46a',
    accent: '#7dff9a',
    accent2: '#ffd34d',
    art: String.raw`
 \  |  /            \  |  /
  \ | /  _        _  \ | /
 __\|/__/ \      / \__\|/__
 :  \    '.\    /.'    /  :
 :   '-.   \\  //   .-'   :
 o      '-. \\// .-'      o
(*)        '-||-'        (*)
      :   .-'  '-.   :
      o  /@  @    \  o
        |          |
        |    ()    |
        |  \ || /  |
       /|   \||/   |\
    __/  \   ||   /  \__
   /    / \  /\  / \    \
  '-.__/_/ \/  \/ \_\__.-'
`,
    mask: String.raw`



 d  .    ...    ...    .  d
 d   ...   ..  ..   ...   d
 b      ... .... ...      b
.b.        ......        .b
      d   ...  ...   d
      b  .a  a    .  b

        .    dd
        .  d dd d
       ..   dddd
    ...  .   dd


`,
  },
  timewraith: {
    kind: 'regular',
    name: 'Time Wraith',
    color: '#d9d2ff',
    accent: '#ff7a3a',
    accent2: '#ffd34d',
    art: String.raw`
             _.---._
           .'  12 / '.
          / 9  o-/  3 \
          \    |//    /
           '.  6 /  .'
         ____'-._.-'____
<>=====|==============|==<>
  \ \ \  \ ::::::::: /  / /
   \ \ \  \ ::::::: /  / /
    ' ' '  \  :::  /  ' '
            \  :  /
             ) : (
            /  :  \
           /   .   \
     ~   _/ .:::::. \_  ~
   ~  ~ |=============| ~ ~
`,
    mask: String.raw`

           ..  .. a
          . .  h.a
          .    .aa
           ..  . a

aa............aaa........aa
  d d d  . bbbbbbbbb .  d d
   d d d  . bbbbbbb .  d d
    d d d  .  bbb  .  d d
            .  b
             . b
            .  b
           .   b
     d   .. bbbbbbb ..  d
   d  d ............... d d
`,
  },
  luminous: {
    kind: 'boss',
    name: 'Luminous, the Final Light',
    color: '#fff3d6',
    accent: '#ffd34d',
    accent2: '#8ff0ff',
    art: String.raw`
         .     \     ||     /     .
__         .      _.-~~-._      .         __
\ '-.__         .' \ /\ / '.         __.-' /
 \  \  '-.__   /  .-'  '-.  \   __.-'  /  /
  \  \  \   '-|  /  o  o  \  |-'   /  /  /
   \  \  \  \ |  \        /  | /  /  /  /
    '. \  \  \ \  '-.__.-'  / /  /  / .'
      '.\  \  \ '.  \  /  .' /  /  /.'
    \|/ '-\__\__\_'-.__.-'_/__/__/-' \|/
    -*-------=====-.____.-=====-------*-
<===/|\-..__        \  /        __..-/|\===>
 <====---..__ '-.   /::\   .-' __..---====>
  <===--..__  '-. '.|::|.' .-'  __..--===>
    '--..__ '-.  '. /::\ .'  .-' __..--'
       .-'/  /  /.-/ :: \-.\  \  \'-.
     .' /  /  /  .'| :: |'.  \  \  \ '.
   .' /  /  / _.-'/  ::  \'-._ \  \  \ '.
  /  /  /_.-''    |  ::  |    ''-._\  \  \
/__/__.-'         /__::__\         '-.__\__\
   '     .     /   |    |   \     .     '
`,
    mask: String.raw`
         d     a     aa     a     d
..         d      adaaaada      d
. .....         aa a aa a aa
 .  .  .....   a  ...  ...  a
  .  .  .   ..a  .  h  h  .  a
   .  .  .  . a  .        .  a
    .. .  .  . a  ........  a
      ...  .  a a.  .  .  .a a
    aaa ..........aaaaaaaa.......... aaa
    .h.......aaaaa........aaaaa.......h
bbbbaaabbbbb        .  .        bbbbbaaabbbb
 bbbbbbbbbbbb bbb   .aa.   bbb bbbbbbbbbbbb
  bbbbbbbbbb  bbb ...aa... bbb  bbbbbbbbbb
    bbbbbbb bbb  .. .aa. ..  bbb bbbbbbb
       ....  .  .... aa
     .. .  .  .  ... aa
   .. .  .  . .....  aa
  .  .  ......    .  aa
.........         ...aa
   d     d     a   a    a   a     d     d
`,
  },
});
