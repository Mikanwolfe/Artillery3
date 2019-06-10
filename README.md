

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

**Note:**

- Saving and Loading don't work yet, nor the options buttons. They should throw errors since they're not tied to any events at current. They're present on the menu because... design... 
- 



------

Artillery 3 is the 

# Artillery 3

**Warning: This repository is private. If you're reading this, you're in the wrong place. Check back once it's actually been cleaned of typos.**

by mikanwolfe, 03-2019, mikanwolfe@nekox.net.

---

**Artillery 3** is a 2D physics-based shooter where players take turns controlling vehicles on a map of varying elevation. Players will be able to move their *artillery pieces* across the map and fire in large arcs towards enemy players, with the explicit goal of destroying all other players.

Artillery 3 is a complete re-write of the original Artillery 2 project found [here](https://github.com/Mikanwolfe/artillery). 

**Features:**

* Object Oriented Programming Design Pattern Festival!
  * Singleton for Physics Engine and Entity Manager
  * Strategy/Abstract Factory for Terrain Generation
  * Abstract Factory for various UIs!
  * Composites for Entities
  * Command for all player input
  * Favouring composition (extensively) over inheritance (according to the  GoF)
  * GameState and Finite State Machine Pushdown Automata!
  * Flyweight Terrain Tiles!
* Did I mention a **Physics Engine???**
  * Hopefully a particle engine too!
* Multitple vehicles (now *Characters*) with **art!!!**
* Improved projectile physics (projectiles have different dynamics such as lift)
  * Improved wind calculations that take into account the new physics
  * Projectiles will be able to home and later their flight paths
* Variable Terrain Generation!
  * Fractal Terrain generation using the Midpoint Displacement **Algorithm**
  * Other terrain generation methods such as a tonne of sine graphs superpositioned on each other
  * Fully adjustable variables and dynamics for terrain generation in the menu
* Destructible terrain!
  * Possibly tile-based map!
* Aiming assistance (finally)
* Improved graphics and possibly animations! (Terrain textures and character animations)
* Saving character stats
* Multiplayer networking support, eventually!.

The terrain in Artillery 3 will be generated based on various algorithms using the *strategy* design pattern. Vehicle dynamics will be incoporated using the *composite* design pattern and the UI will embody various themes using the *Factory* design patten.

**Roadmap:**

* [ ] Multiplayer Support (Local)
* [ ] Multiplayer Support (Network)
* [ ] Strategy Design Pattern
  * [ ] Random terrain generation
  * [ ] Algorithmic terrain generation
* [ ] Realistic Physics
* [ ] Wind
* [ ] Multiple Vehicles
  * [ ] Vehicle statistics
    * [ ] Restricted firing angles
    * [ ] Restricted firing power
* [ ] NPC/AI/""CPU"" enemies
* [ ] Effects (Mirror, Power, Duplicate/Cut)
* [ ] Support Modules (Satellite attacks)
* [ ] Environmental Effects

---



http://blog.nuclex-games.com/tutorials/cxx/game-state-management/

https://gamedev.stackexchange.com/questions/13244/game-state-management-techniques

http://gameprogrammingpatterns.com/flyweight.html





---

The name "Artillery" will be used for Atillery 3 in this document and explicit mention will be made for Artillery 2, such as 'the original artillery' or 'artillery 2'.

