

# Artillery 3

by mikanwolfe, 03-2019, mikanwolfe@nekox.net.

------

**Artillery 3** is a 2D physics-based shooter where players take turns controlling vehicles on a map of varying elevation. Players will be able to move their *artillery pieces* across the map and fire in large arcs towards enemy players, with the explicit goal of destroying all other players.

Artillery 3 is a complete re-write of the original Artillery 2 project found [here](https://github.com/Mikanwolfe/artillery). 

**Features:**

- Complete rewrite of the original game; significantly extends on the original combat aesthetics Artillery II provided
- Multiple Weapons per-character
- Weapons have more effects, notably Acid, Lasers, and even multi-shot weapons.
- Games don't end after one round--players can purchase additional weapons in the shop and are no longer locked to their selected characters
- Functioning Menus and UIs using OO principles.
- Sound Effects! 
- Proper introduction of backgrounds and a theme to the game -- the background is now a snowy mountainplace themed after the simple UIs within A3.
- The backgrounds are parallax -- they move at different rates based on the camera position.



**Controls:**

| Command         | Key                         |
| --------------- | --------------------------- |
| Move            | `Left, Right`               |
| Aim Weapon      | `Up, Down`                  |
| Change Weapon   | `s`                         |
| Move Camera/Pan | `Right Mouse Button` (Hold) |
| Charge Weapon   | `Spacebar` (Hold)           |
| Fire Weapon     | `Spacebar` (Release)        |

**Note:**

- Saving and Loading don't work yet, nor the options buttons. They should throw errors since they're not tied to any events at current. They're present on the menu because... design... 

------

### The goal of this project

Artillery 3 (A3) is a complete rewrite yet a successor of the Artillery Series, improving on the more interesting aspects of the game and generally expanding upon what Artillery II did well. The highlight of A3 is the polish of the game, with more weapons came some balance and a more aesthetic appearance, ditching the blue-green kiddy palette for a more refined, cooler experience. 

Artillery3 is designed to satisfy the Unit Learning Outcomes of COS20007: Object Oriented Programming, with a large number of design patterns, decisions, and mistakes-that-were-learnt from. With most of the development starting early in the unit, A3L shows that the logical method of designing OO programs isn't always the best--sure, A3L portrays the World of Artillery as a literal `world.cs`, but that doesn't make it helpful. The many branches of Artillery are the many experiments that Artillery has undergone in an effort to improve and extend on the understanding that currently exists. 

As of writing (10/06/2019), Artillery 3, in it's current form, Artillery 3s, is finished and will receive no further development but will act as a learning experience to develop from and branch off from further.



### The many branches of Artillery

* `artillery3-legacy`

Also known as A3L, the version of Artillery before the A3X revision that aimed to rewrite Artillery. Contains most of the core systems but is not very OO.

* `artillery3x`

Coined A3x, an attempt to rewrite artillery (read: rewrite, not refactor) from the ground up with a more OO-approach, notably including GameStates and what was intended to be a proper implementation of the MVC paradigm. Did not work out due to time constraints.

* `artillery3r`

Taking ideas from A3X, A3R aimed to quickly fix the Command and Command Processor systems that handled input, whilst cleaning up major aspects of code which created a more dynamic and more OO-program. The goal was to set the playing field for the Hatsuyuki Concept.

* `artillery3r-hatsuyuki`

An attempt to model and research into AI systems in an OO-fashion, dropped for two reasons: the complexity of Artillery meant that it would have been very difficult to create a functional AI; the writing of Hatsuyuki, whilst interesting, would have been nothing more than a simple state machine with high coupling due to limited technical know-how. The systems still exist in A3s, however, a lot more about Artillery3 needs to change re: the design before a proper implementation of AI can be achieved.

* `artillery3rx`

Artillery3R + ideas from Artillery 3X. This is the final branch of Artillery if it weren't for Point2Ds making a ruckus near the end which ended up being almost impossible to fix. Hence, a new branch was created as a compromise -- "Point2D is awful, but we'll have to use it anyway"

* `artillery-3s`

The final branch and current iteration of Artillery, recently merged to master via natural and alternative means. Branched from 3RX after the debacle with Vectors, contains the final implementation of all the menus and includes the new theme for Artillery alongside all the other, more polished, more modern goodies seen in A3 such as music, sound effects, and even an easter egg.

### Screenshots

**The menu:**

![menu.jpg](C:\repos\Artillery3\README-assets\menu.jpg)

**In-game:**

![ingame playing.gif](C:\repos\Artillery3\README-assets\gameplay.gif)

Health Animation

![healthanimation](https://raw.githubusercontent.com/Mikanwolfe/Artillery3/master/docs/README-assets/animatedhealth.gif)

**In the Shop:**

Scrolling

![wepdesc.gif](C:\repos\Artillery3\README-assets\wepdesc.gif)

Weapon Descriptions

![wepdesc.gif](C:\repos\Artillery3\README-assets\wepdesc-1560313810435.gif)

Buying Weapons

![buyingweps.gif](C:\repos\Artillery3\README-assets\buyingweps.gif)

---

### Further Development of the Artillery Concept

At current, Artillery is complete aside from minor tweaks. The game structure has become a bit rigid due to poor decisions at the start and it will take a lot more effort than I have available to achieve more meaningful goals. For now, it's completely playable.

---

## Acknowledgements

Most sounds from the Sonniss Audio Library -- Awesome shoutout to those guys for releasing a huge sound library for free! No attribution required!

"Koiken Menu" -- notably `koikenmenu.ogg` is mercilessly utilised from *Eufonie*'s *__Koiken Otome__* [translated, original title 恋剣乙女]. If there are any concerns about this, contact me in any way, shape or form to have this removed immediately!

The easter egg embedded within this game is tip-of-the-hat to _Team Salvato_, again, if there are any concerns here,  contact me in any way, shape or form to have this removed immediately!

Artillery3 runs on the SwinGame API (for better or for worse), you'll fine more information [here.](http://swingame.com/)











