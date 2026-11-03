'use strict';
// Stratum 5 (The Wild Mythos) and Stratum 6 (The Elemental Planes) enemies.
Object.assign(ART, {
  wyvern: {
    name: "Wyvern",
    kind: 'regular',
    color: '#e0503c',
    accent: '#ffc233',
    accent2: '#8cff4a',
    art: String.raw`
          A
          |'-._
          |\   '-._
          | \      '-._
          |  \  '.     '-._
          |   \   '.    |  '.
  ___     |    \    '.  |   |
 / o '\   |     \     '.|  /
<VVVV\ \  '.__/\_\_/\___\_/
 ^^^^/  \  /             '.
<___/ \  \/   .--.         \  _
       '.    /    \   __   | / \
         '-./  /\  \ /  \  |/ /
            | |  \  |    \___/<>
           /_/_\ /_/_\
`,
    mask: String.raw`
          h

           d
            d
             d  dd
              d   dd
               d    dd
   a            d     dd
 hhhh
 hhhh
                              b
                             b b
                d  d d        b
                 d  d         bb
                 ddddd
`,
  },
  manticore: {
    name: "Manticore",
    kind: 'regular',
    color: '#d9a35a',
    accent: '#7dff4f',
    accent2: '#e0482f',
    art: String.raw`
             _.-._.-._.-.
       __   (_)^(_)^(_)^(_)
      <__\.-'            (_)>
        V                (_)
    ,;;;;;;,             (_)>
  ,;' .--. ';,           (_)
 ;;  / o  o\ ;;_________/  |
 ;; |  .^.  | ;;          '\
 ;;  \ \==/ / ;            |
  ';, '--' ,;'             |
    ';,,,,;' \  ________   /
       |  |  | |  |    |  |
       |  |  | |  |    |  |
      /__/  /__\/__\  /__\
`,
    mask: String.raw`
             bbbbbbbbbbbb
            bbbhbbbhbbbhbbb
      aaaaabb            bbbh
        a                bbb
    d      d             bbbh
  ddd      ddd           bbb
 dd    a  a  dd
 dd           d
 dd     hh    d
  ddd      ddd
    d      d
       d  d
       d  d
      dddd
`,
  },
  basilisk: {
    name: "Basilisk",
    kind: 'regular',
    color: '#86b04a',
    accent: '#ffee55',
    accent2: '#e0a030',
    art: String.raw`
       _w_w_
      |^^^^^| /|/|/|/|
   ___|_____|/ | | | |\
  / (@)       ' ' ' '  \_
 <  ___.                 '-.
  \<vvvv\   ,-.   ,-.       \
   \^^^^/  / / \_/ / \_      |
    '--'  /_/  /_/    '-.    |
      .~~~~~~~~~~~~~~~.  '.  |
     (  .~~~~~~~~~~~.  '---' /
      '<____________'-.___.-'
`,
    mask: String.raw`
       bbbbb
      bbbbbbb dddddddd
      bbbbbbbb d d d dd
    aha       d d d d

    hhhh          ddd
    hhhh        dd d dd
                dd    d
      ddddddddddddddddd
     d  ddddddddddddd
       d              d
`,
  },
  griffin: {
    name: "Griffin",
    kind: 'regular',
    color: '#e0b870',
    accent: '#ff4a2e',
    accent2: '#cf8a3e',
    art: String.raw`
              __.---"""---.__
           .-'_.-'_.-'_.-'_.-'.
         .'_.-'_.-'_.-'_.-'_.-'
   __   /.-'_.-'_.-'_.-'_.-'
  /o '\/ _.-'_.-'_.-'_.-'
 <\_   V .'_.-'_.-'
  '/   \_.-'
   /    \             __
  (  ,   \        .-''  '-.
   \ \'.  \______/         \_
    \_\ \                .  \\
   //\\ /\_.-----._____.'|   \\
  //  \/   |  |   | |    |   |'
          /__/   /__\   /__\
`,
    mask: String.raw`
              bbbbbbbbbbbbbbb
           bbbdbbbdbbbdbbbdbbbb
         bbdbbbdbbbdbbbdbbbdbbb
        bbbbdbbbdbbbdbbbdbbb
   a   b bbbbdbbbdbbbdbbb
 hh    b bbdbbbdbbb
       bbbbb




   hhhh
  hh  h           d d
                 dddd
`,
  },
  chimera: {
    name: "Chimera",
    kind: 'regular',
    color: '#d29a52',
    accent: '#ff3a2e',
    accent2: '#6fd650',
    art: String.raw`
               .--.        ___
              ( ,-.\    ~<'o  )
               \/  |      '-.  \
             .-' o  \       |  |
            <__,     |     /  /
   _,;;;;,_    '\   /     /  /
 ,;'  _   ';,   |  |     |  |
;;  .' o)   ;;__|  |_____|  |
;  <   _    ;;           '--'\
;   \/\/\  ,;;                |
 ;   '^^'  ;;  _______        |
  ';,,,,,;'\  |  |    |  |   /
      |  |  | |  |    |  |__/
     /__/  /__\/__\  /__\
`,
    mask: String.raw`
               dddd        bbb
              d dddd    abba  b
               dd  d      bbb  b
                 a          b  b
                           b  b
                          b  b
 d                       b  b
dd     a                bb  b
d                        bbbbb
d   hhhhh
 d    hh
  ddd      d  d  d
            d d  d
           dddddddd
`,
  },
  hydra: {
    name: "The Hydra",
    kind: 'boss',
    color: '#4fb55a',
    accent: '#ffb02e',
    accent2: '#2a8fc0',
    art: String.raw`
                __/\              __/\
               /o  '-.           /o  '-.
              <VVV\   \         <VVV\   \
               ^^^ \   \         ^^^ \   \
   __/\            |   |             |   |
  /o  '-.          |   |  __/\       |   |
 <VVV\   \         |   | /o  '-.     |   |
  ^^^ \   \        |   |<VVV\   \    |   |
       \   \       |   | ^^^ \   \   |   |
        \   \      |   |     |   |  /   /
  __/\   \   \     |   |    /   /  /   /
 /o  '-.  \   \    |   |   /   /  /   /
<VVV\   \  \   \   |   |   |   | /   /
 ^^^ \   \  \   \  |   |   |   | |   |
      \   \  \   \ |   |   |   | |   |
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ~~  ~~~~~ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ~~~~
~~  ~~~ ~~~~~~~ ~~~~~~~ ~~~~~~~~~ ~~~ ~~~ ~
  ~~~   ~~~ ~~~~~  ~~~~~~  ~~~~~~   ~~~~  ~~
 ~    ~~    ~~~   ~~  ~~~~   ~~~   ~~  ~
`,
    mask: String.raw`
                  aa                aa
                a                 a
               hhh               hhh
               hhh               hhh
     aa            d   d             d   d
   a               d   d    aa       d   d
  hhh              d   d  a          d   d
  hhh              d   d hhh         d   d
                   d   d hhh     d   d   d
                   d   d         d  d   d
    aa             d   d           d   d
  a                d   d          d   d
 hhh               d   d         d   d
 hhh               d   d         d   d
                   d   d         d   d
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb  bbbbb bbbbbbbbbbbbbbbbbbbbbbbbbbbb bbbb
bb  bbb bbbbbbb bbbbbbb bbbbbbbbb bbb bbb b
  bbb   bbb bbbbb  bbbbbb  bbbbbb   bbbb  bb
 b    bb    bbb   bb  bbbb   bbb   bb  b
`,
  },
  ifrit: {
    name: "Ifrit",
    kind: 'regular',
    color: '#ff7a2a',
    accent: '#ffe14a',
    accent2: '#ff3b1f',
    art: String.raw`
 (\ )      )  ( (       ( /)
) )( (    ( ) ) ) )    ) )( (
(  )  )  /\ ( ( ) ( /\ (  )  )
 \(__)/  \ \.-'''-./ /  \(__)/
  |  |    \/ _   _ \/    |  |
  |  |     |(@) (@)|     |  |
  \  \     |  <    |     /  /
   \  '. __ \ VVV / __ .'  /
    '.  '/ '-'---'-' '\'  .'
      '-|  .-.  .-.  |-'
        | (   ''   ) |
         \ '-.__.-' /
          '.  ||  .'
            ) () (
             ) ( (
              \ /
`,
    mask: String.raw`
 aa a      a  a a       a aa
a bb b    a a b b a    a bb b
a  b  a  hh a b b a h  a  b  a
         h         h
          h        hh
           aaaa aa

              hhh




          bb  bb  bb
            a aa a
             d d d
              d d
`,
  },
  undine: {
    name: "Undine",
    kind: 'regular',
    color: '#3fa9e0',
    accent: '#8ff7ff',
    accent2: '#2f6fe0',
    art: String.raw`
           .-~~~~-.
        .-'  .--.  '~-._
       /    / ,  \      '~-.
      |    | o  o |  ~-._  '~.
      |    |  <   | ~-.  '~.  )
       \    \ -- /    '~.  ) /
        '~.  '--'  ~-.   )  (
          /'-.__.-'\  '~.  ) )
         / /  ~~  \ \     ( (
        / /  ~  ~  \ \     ) )
       (_(  ~~  ~~  )_)   .'.'
    __   \ ~  ~~  ~ /  .~' .'
  .'  '~. '~-.__.-~' .~  .'
 ( (@)  '~-._    _.-~ .-'
  '~._       ''''  .-'
      '~~--.....--~'
`,
    mask: String.raw`

                   bbbbb
                        bbbb
             a       abbb  bbb
                    abb  bbb  b
                      bbb  b b
                   bbb   b  b
                   b  bbb  b b
              aa    b     b b
             a  a  b b     b b
            aa  aa  bbb   bbbb
    aa     a  aa  a
  aa  abb bbbbbbbbbb bb  bb
 b ahb  bbbbb    bbbb bbb
  bbbb       bbbb  bbb
      bbbbbbbbbbbbbb
`,
  },
  thunderbird: {
    name: "Thunderbird",
    kind: 'regular',
    color: '#8f7ae8',
    accent: '#ffe633',
    accent2: '#c9b8ff',
    art: String.raw`
              ___
 __          /o  \          __
 \ '-.__    <\_   |    __.-' /
  \ \   '-.__ \   /__.-'   / /
   \ \_ _   '-|   |-'   _ _/ /
    \/\/\_/\.-|   |-./\_/\/\/
     \/\/\/   |   |   \/\/\/
       /     _/   \_     \
      /_    /  /\  \    _\
       /   /__/  \__\   \
      /     \/\/\/\/     \
     '      ////\\\\      '
`,
    mask: String.raw`

 bb           h             bb
 b bbbbb    aaa        bbbbb b
  b b   bbbbb      bbbbb   b b
   b bb b   b      bb   b bb b
    aaaaabaab      bbaabaaaaa
     aaaaaa           aaaaaa
       a                 a
      aa                aa
       a                a
      a     dddddddd     a
     a      hhhhhhhh      a
`,
  },
  frostgiant: {
    name: "Frost Giant",
    kind: 'regular',
    color: '#a8d8f0',
    accent: '#5ff0ff',
    accent2: '#d6c4a0',
    art: String.raw`
  ___          _.---._
 /  |\       .'/\/\/\/'.
/   | \     / /V V V V\ \
| ##|  |   | | ==   == | |
| ##|  |   | |  o   o  | |
\   | /    | |    <    | |
 \__|/    _| |\/\VVV/\/| |_
   ||   .'~| |V V V V V| |~'.
   ||  /~~~ \ \V V V V/ / ~~~\
   || (~~~~~~'-\V V V/-'~~~~~~)
   ||  \~~~~~~~ \V V/ ~~~~~~~/
   |(===)|       \V/      | |
   ||   ||   ____/=\____  | |
   ||   |   |    \_/    | (_)
   ||   |   |     |     |
  _||_  |___|     |_____|
`,
    mask: String.raw`
  aaa
 a  aa         aaaaaaa
a   a a        a a a a
a hha  a       dd   dd
a hha  a        a   a
a   a a
 aaaaa           aaa
   dd   bbb   a a a a a   bbb
   dd   bbb    a a a a    bbb
   dd bbbbbbbb  a a a  bbbbbbb
   dd   bbbbbbb  a a  bbbbbbb
   d hhh          a
   dd
   dd
   dd
   dd
`,
  },
  sanddjinn: {
    name: "Sandstorm Djinn",
    kind: 'regular',
    color: '#d8a85a',
    accent: '#ff5a1f',
    accent2: '#e6eef5',
    art: String.raw`
 .-.        .-""""-.        .-.
(   '.     / .-..-. \     .'   )
 '.  '.   | (@ )(@ ) |   .'  .'
   '. |   |   /_\    |   | .'
     \|    \ \vvvv/ /    |/
      |_.--''.____.''--._|
      (_)~-.,:::::::.,-~(_)
         (~~-.,_____,.-~~)
       ~  '-~~~:::::~~~-'  ~
        .  (~~~~~~~~~~~)  .
      ~     '-~~:::~~-'     ~
          .   (~~~~~)   .
               '-~-'
                 )
                (
                 '
`,
    mask: String.raw`
 bbb                        bbb
b   bb                    bb   b
 bb  bb     ah aah a      b  bb
   bb b                    bb
     bb       aaaa        b

             ddddddd

       d       ddddd       d
        d                 d
      d         ddd         d
          d             d
               ddddd
                 d
                d
                 d
`,
  },
  phoenix: {
    name: "The Phoenix",
    kind: 'boss',
    color: '#ff8a2a',
    accent: '#ffe14a',
    accent2: '#ff3a1f',
    art: String.raw`
 )                  (  )                  (
(\   )             ) () (             (   /)
 \\ (  (           ( )( )           )  ) //
 ( \\  )\         __\)(/_          /(  // )
  \ '\ \ (\     .-'     '-.      /) / /' /
   \  '.'.\'.  <_ (o)     )    .'/.'.'  /
    '.  '. '.'. '-._     (   .'.' .'  .'
     '-. '-.'-.'.  )    \  .'.-'.-' .-'
        '-.'-._'-./  /\  \.-'_.-'.-'
           '-._'-.(\(  ) )'.-'_.-'
              '-._\) \/  /__.-'
                   \    /
             .--.__/ /\ \__.--.
          .-'  .--' /  \ '--.  '-.
        .'  .-'   .'    '.   '-.  '.
       (   (    .'  ()  '.    )   )
        '.  '-.(   ( )(   ).-'  .'
      .   '-.__'-. ) ( .-'__.-'   .
        (@)      '-.\/.-'      (@)
     '              ''              '
`,
    mask: String.raw`
 a                  b  b                  a
aa   a             a bb a             a   aa
 aa a  a           a aa a           a  a aa
 a aa  aa         aaaaaaa          aa  aa a
    b                                  b
      b b  b      hhh           b  b b
    b   b  b b  b             b b  b   b
     b   b  b  b   a    a   b  b  b   b
        b  b   b  a  aa  a  b   b  b
           b   b  aaa  a ab  b   b
              b   aa aa  a    b
                   a    a
             b  b          b  b
          b b  b  b      b  b  b b
        bb  b b   bb    bb   b b  bb
                bb  aa  aa
        bb  b b    a aa   aaab  bb
      a   a a  a a     a a  a a   a
        aha      aaaaaaaa      aha
     a              aa              a
`,
  },
});
