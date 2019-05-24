## The Dependency inversion principle

Based on that book chapter that Jai got me, I read up on it.

In a lot of ways, the dependency inversion principle aims to tackle one of the bigger issues when it comes to OO design--too many class--

WAIT A MINUTE

THE DEPENDENCY INVERSION PRINCIPLE IS THE EXACT OPPOSITE! IT ADDS A TONNE OF CLASSES!

---

The dependency inversion principle aims to decouple the higher-level implementations from lower-level modules through an  abstract class. This allows the higher level implementations to utilise different modules instead of hard-coding case statements or modifying and therefore making rigid the minor modules.

This, in a sense, is abstracting and properly contracting the interfaces between objects. In my case, it would be in the physics engine. The physics engine itself contains a list of physics objects--it doesn't need to. All we need is a class that separates the engine from the list of objects so that the engine knows nothing about the objects and the objects can rely on different engines if need be. This is similar to the strategy pattern but focuses on dependencies and class flexibility as opposed to turning methods into objects and allowing an object to pick methods. In a sense, the strategy pattern is an implementation of the DIP.

