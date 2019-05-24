# Artillery 3x

by mikanwolfe, 05-2019, mikanwolfe@nekox.net.

---

This is just rambly. See /docs/ for more info, though it's all ramble as well. Don't worry, this will be done by the end of June.

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

