## Finite State Machines, Components, AI, and a lot of hard.

Currently Artillery uses a StateComponent to manage an enumeration of states, in a sense, this is just a simple level up from using straight up enums for states.

However, this has it's limitations and it's VERY prevalent in the design of certain classes since they're so massive. This leads to the implementation of a hybrid-strategy pattern that treats each state as a separate class.

Current implementations I've seen revolve around converting a base class into a state machine. We'll keep it simple and concise for this explanation. From here, we simply create a "State Machine Wrapper" for that class which essentially mimics the interface of the class and we have each state inherit from said state machine. Each state shall only override the methods that it requires and takes in all the methods plus an additional parameter--the state wrapper.

Once the base class initiates, it simply sets itself to 'become' that state (using polymorphism) and simply sends a message to the wrapper (passed by the `this` keyword to change the reference state to itself).

This is okay for certain applications but... well.. it seems to expose too much information about each state as it's public interface.

---

The solution, maybe.

Artillery's attempt at a Finite State Machine:

Does the Character have a State or do State Machines have Characters? This is a tough choice since the state machine often contains *most* of the logic but the characters have logic themselves.

In this way, I intend to keep this as simple as possible and will be following the currently established structure of the characters and their state components. Preferably I'd like some way to properly hide the information they share however they are intrinsically linked and therefore, lose to encapsulation just a little bit. (Some people make arguments that encapsulation is a bad idea anyway).

Finite State Machines as classes--with each class representing a new state and to have the ability to preserve sub-states in a composite manner allow the use of hierarchal state machine trees that are intrinsically simple by design, however, it also means that we'll have a lot of extra classes on a per-character-per-state basis. This does cause that really annoying issue with OOP where there are just *too many damn classes* but we'll work with what we have for now.

Each class will either override the Update() function of the Character and the Character itself must never reference the internal variables for consistency's sake (always Camera and not _camera). 

However, another (and arguably better) way to do it would be to implement the state as a process that controls the character but does not fully override the update() function such that:

```csharp
public void Update() {
    
    /* Update the character */
    
    /* Update the state machine */
    StateComponent.Update();
    
}
```

This provides us with something along the lines of:

```mermaid
sequenceDiagram

Character ->> Character.Update(): Update yourself
Character.Update()->>Character: Updated!
Character->>State Machine: Update the character based on state
State Machine ->> Character: Updated!

```



The final evolution would be a Finite State Machine with a hierarchal structure and possibly the 'utility' design (which uses weighting to decide the next step) and then a neural network to assign the weights. But that's for the AI section. 