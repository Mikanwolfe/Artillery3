## General Implementation of Artillery 3 and Artillery 3X

This file might be the longest, so here's a toc:

[TOC]

---

## Artillery 3

Artillery started off as a procedural program with all the information it required wrapped up in a record that was passed around quite a lot. This made it easy since all the information was readily acessible at any time and all of the modules were very very heavily coupled. 

This did cause issues in the long run since it became very rigid and fragile--one change to the system would cause a domino affect all suddenly, before you knew it, System32 got deleted.

The call towards OOP was the next logical step, however, taking all that procedural programming and putting it into OOP wasn't easy. Or rather, the entire system had to be designed with a proper framework

[some neat graphic of a2 being just a pile of functions vs objects].

### The move to OOP

With great power came waaay too much work. The implementation of OOP was incredibly difficult and at over 6000 lines of code at the time of writing, waaay too much framework.

Of course, this minor snippet could go into the benefits and whatnot about OOP, but we won't do that today. Let's focus on the more technical aspects and in going forward, the design of A3 in general.

### Starting in OOP: Prototyping and just jumping in

One of the biggest issues I had at the very start was the sheer scope of the project. It was immense and the initial class diagrams I drew became useless very quickly. It was too much to try and put the very complex system of A3 into simple terms without knowing every little detail and to an extent, it wasn't really going to be possible. The complex interactions meant that there was a guarantee that there will be a problem that I wouldn't know of or maybe, a change down the line could throw everything out of balance pretty quickly.

Hence, I just gave it a shot.

After reading up on a number of game design structures and design patterns, especially Game Programming Patterns (dot com), I started A3 with rather generic and not very well tempered knowledge of OOP programming. I started by designing an general updatable object but I despised the idea of a general "GameObject" class because in a sense, it wasn't descriptive enough for me. It could mean anything and the meaning of the word changed too much depending on the context--my philosophy followed that all names should be meaningful and GameObject was not. Sure, it was a Game Object but of what kind? What could it do? Was it just a shell for everything to fall under? How is it different from those in the Godot Engine? Unity? Hence, I started with the concept of an Updateable Object in reference to the rather basic game loop that A3 followed.

Furthermore, I then made a child class that was a Drawable Object, however, in hindsight I did not fully define the concept of a drawable object and therefore it did not have a position (though it required one) which caused significant issues later when defining the idea of an entity and later, a particle. In 3X I intend to fix this and have Entities and Particles again as seperate systems (as they don't generally interact) though Particles do have the ability to damage entities. I may use the DIP to separate the concept of entities from the entity engine and combine the two, though they are quite different in a number of ways.

## From the bottom up

Entities are drawable objects, entities have a lot more components composed of lots of other things. This is important as I did not want artillery to have a rigid hierarchy structure, hence, only characters and potentially other concepts inherit from entity.

### The concept of an entity and definitions of certain objects

**Updatable Object**

* Enum Disabled, Enabled

**Drawable Component** 

* Inherits from above enum, most game elements are of this class

* Game element
* Has position
* has "Drawable wrapper" -- An A3X construct that acts as a sprite wrapper
* Does not have rotation

**IDrawable Wrapper**

* Internal information such as rotation, visbility, etc. all passed to drawable for access
* A3x Construct

**Entity**

* Most active gameobjects
* Characters are entities
* Particles are entities
* Components
  * I am Damageable
  * I can Damage
  * I have PhysicsComponent
  * I have DrawableComponent

Things that are entities:

* Characters
* Destructible objects
  * Cities
  * Crates
  * Item Drops
* Satellite

**Entity Components**

* Allow entity to inherit (other things too but it's specifically for entity)

## The concept of Characters

* They have a name
* They have a description
* They have 





### SwinGame Wrappers

POINT2D AND OTHER CLASSES ARE SEALED!!! WHAT A PAIN!!!

Hence, `Vector` deals by creating a wrapper for Point2D... or rather, it's used instead of Point2D and contains a cast for it, `Vector.ToPoint2D`.

You can ACTUALLY ADD VECTORS!!! `a += b` WORKS! YOU CAN'T DO THAT TO POINT2Ds!!

### Content loading and character factories

* Characters have complex instantiation made worse by the fact that they require JSON object information from the data file, hence, I'll probably have to make a character factory to deal with this


### Drawable Component or Composition?

One of the issues is that since the position is stored by the drawable object, the information has ot be passed to the base class. This required a weird workaround using the UpdatePosition method to class information back and forth whilst keeping with encapsulation.

Hence, a composite design would allow for the main object to send information to a child instead of a parent, since the drawable object needs a position but does not manipulate it, it doesn't make sense for it to store it.



### Sprites vs Bitmaps

Sprites can rotate. Bitmaps can't. I won't be using most of the functionality so I'll use a wrapper and interface with the IDrawableComponent DIP.

### MVC Ideas incorporated

The A3Data data structure is similar to that of MVC. It's not plain-old as it does contain logic, however, it doesn't have an update method and is prompted to do stuff or be manipulated by the rest of the code.

this helps centralise all the data and information, as well as non-persistent memory such as presets and whatnot.

also helps with terrain presets and whatnot.

##### The reversed and implemented design of singleton engine and services

* singleton physics and co have been turned into a Services singleton
* Physics, Entity, Particles, don't store the data anymore, it's in A3Data
* PhysicsEngine just uses the list supplied by passive conversion from A3Data. The list of entities is passed and particles are passed to the engine.
* A good measure of coupling is the number of `new` keywords there are in the code. The physicsengine has **none**.

#### Current inverted cone analogy

The game used to have a game-centric structure with distributed data. Now it's a3-data centred with the game revolving around manipulating the basic A3Data structure.

### StateManager and StateMachines

Only the state manager knows the transitions between states, the states themselves are wholly unaware of which to and from transitions they undergo.

### Doubles vs Floats

Floats are 16b and since we have a lot of numbers, let's go with floats for performance reasons.

Originally vectors used doubles but this was rescinded.

### Command

DIP between Swingame.Handleinput and the game

## The Idea of Players from A2 and A3

A2 had the player be a physical entity in the world. A3 saw the player as a container to the physical entity in the world, containing a character, which was the entity the player could control. I did not notice this at first, however, this was the implementation of the Dependency inversion principle at work as it would soon allow me to disconnect the concept of characters from the players altogether although this will take quite some predetermined work. Hence, the characters will soon be able to be controlled by the AI instead of simply players.

This was originally intended to allow the player to control multiple entities, but for now, will be unable to do so.



#### About players and cycling them



#### Input Handler

Input handler doesn't execute inputs, it simply captures inputs for the game stores them as commands in a3Data's command stack/stream. Furthermore all the AI does is just emit a stream of commands.

We will also have a command processor, which is an interface that simply allows the execution of all the commands from the a3Data's command stream object. This should be registered as a service.

At this point i *am* tempted to create a services base class, which I might do, but what I **won't do** is create a list of services. In this case, you **do** want a level of rigidity when it comes to what services are allowed since we don't want to allow superfluous services. In the end, what we can do is have the services extendable and to have the engines and core services overwritable via properties from A3. Otherwise, they can default (or to null).

This doesn't really matter for our implementation, however, it is OOP practice.

(Update after: there is now a base services interface and it's extendable, services are just singletons that can be called to update every frame, and can be disabled.)



### Command Design pattern

I have to thoroughly look into this again and to some extent, I'd like to re-jig this to work with a console system.

However, all the character interactions are done through the command design pattern. I might also be able to turn other method calls into the command design pattern and have one central command manager that the console can access.

Command also allows me to control the characters through the AI, though the implementation-level stuff here I'm not too familiar with at current. 



### How commands work now

* Input-handler is a service and is called every frame.
  * Input handler's job is to translate keystrokes into command objects. It has an internal dictionary.
  * it checks for all registered keys that are bound (it has a hard-coded-copy of the keys)
  * if the key is down it will add the correct command object to the command-stream object inside a3Data. 
* The Command Processor is a service and is called every frame
  * It takes the command stream object and executes each of them
  * It will send the relevant data based on either the object or just simply executes all of them until there are none left.

Everything is built upon abstractions and interfaces, and there is an insane amount of flexibility here.

The important thing to note is that the input handler isn't the only object that should be writing to the command stream. Realistically, the game should check if the current player is AI and suggest whether or not to use the input handler or the AI module. the AI module will then be capable of writing through an adaptor directly to the command stream object, in which case, all the commands will be processed during that frame.

This is a lot of low coupling. No one object really knows details about other objects.



### Abstract Factory design pattern

The terrain is generated through the abstract factory which decouples the terrain generation from the terrain itself and the world that it is placed in.

#### Composition

Composition over inheritance--change thins from concrete classes to abstract, and allow them to be set and unset. This would be the inversion principle using interfaces.



### Design Patterns

The entities originally utilised the composite design pattern as I thought that would simplify the process, however, as all entities have slightly different logic this was eventually thrown out of the door.

The UI actually uses the composite pattern and I do intend for it to stay this way since it does make it interesting, although there will have to be chains of command that run up and down these composite christmas tress that might be easily circumvented through a smarter event system. By having buttons chained to events registered through a singleton, the UI can have a list of events it is able to process with buttons being created in sub-assemblies registering themselves with an EventHandler method within the UI. The UI will then sort the event call through a separate process since during the event call, the UI is cycling through the entities and at times, this may involve changing the entity start. Hence, a stacking system like that used in the loading state may prove useful for providing persistent memory here.

The UI will be hard-coded to make my life easy.



# the concept of characters and players 2

Players and characters will be redefined in a3x.

Characters have players, not players have characters. Characters have a Player object shows whether or not the AI is human. Or rather, that player object is what processes commands...?

players contain a reference to characters, and players also have a preferred input handler which is called based on the character and therefore, there needs to be an inputhandler/ service. 

Input handler will be redefined as inputmethod. 



or

rather, characters shouldn't be tied to input method.

players inherit from characters (just in case they want to be an observer for example) and therefore contain the input method component.



## Weapons and coupling

Won't be rewriting the system due to time constraints, however this is highly coupled and therefore soldered together, the IWeapon interface was removed since it was becoming needlessly complicated anyway.

