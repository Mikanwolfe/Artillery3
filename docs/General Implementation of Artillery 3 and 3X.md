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

## The Idea of Players from A2 and A3

A2 had the player be a physical entity in the world. A3 saw the player as a container to the physical entity in the world, containing a character, which was the entity the player could control. I did not notice this at first, however, this was the implementation of the Dependency inversion principle at work as it would soon allow me to disconnect the concept of characters from the players altogether although this will take quite some predetermined work. Hence, the characters will soon be able to be controlled by the AI instead of simply players.

This was originally intended to allow the player to control multiple entities, but for now, will be unable to do so.



### Design Patterns

The entities originally utilised the composite design pattern as I thought that would simplify the process, however, as all entities have slightly different logic this was eventually thrown out of the door.

The UI actually uses the composite pattern and I do intend for it to stay this way since it does make it interesting, although there will have to be chains of command that run up and down these composite christmas tress that might be easily circumvented through a smarter event system. By having buttons chained to events registered through a singleton, the UI can have a list of events it is able to process with buttons being created in sub-assemblies registering themselves with an EventHandler method within the UI. The UI will then sort the event call through a separate process since during the event call, the UI is cycling through the entities and at times, this may involve changing the entity start. Hence, a stacking system like that used in the loading state may prove useful for providing persistent memory here.

The UI will be hard-coded to make my life easy.

