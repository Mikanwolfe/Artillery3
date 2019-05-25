# Artillery 3R

Artillery 3R, to distinguish itself from Artillery 3X and 3Legacy/3L is the final iteration of A3 for the interview process based on the time constraints allotted.

This is important as 3R is designed to implement the AI research component with a slightly improved version of 3 based on 3X's design.

**Artillery3R will be derived directly from A3L with changes to accommodate the research component.**

---

The listings are as follows:

* Artillery 3L (A3L) 
  * Legacy artillery, initial design based off an iterative process
* Artillery 3X (A3X)
  * The highly-OO rewrite of A3L incorporating many lessons learned during the development process.
* Artillery 3R (A3R)
  * The Revised edition of A3L as the time constraints would not allow for the complete development of A3X along with the AI research module, hence, A3R will incorporate some of the state and higher-level changes present in A3X with the original system.

---

# Artillery Design Documents

Contents:

* Research intentions and the approach to the HD task
* Intentions for artillery
* Artillery
  * iterative design process
  * Real world learnings (comparing the real-world intuitions from A3 that didn't work to the more abstract but much more functional A3X components)
* A3xAI Revised
  * Turning point of May 26th (Concept of A3R came about)
  * How to get it done in time
* AI
  - Literature review
  - Conceptualising
  - Designing
  - Testing
  - Conclusions

---

[TOC]

---

## Preface

#### For the reader (Hi Chris)

Why hello there! This will be the only informal section of the report so I hasten to add that this report is rather long and I fully understand that no-one will likely go through it. To make life easier, make note that anything in 'quote' form will be quite substantial! Anything that is important will be in the following form:

> This is a quote, it's a blockquote to be precise. This contains important information!

I will limit the use of blockquotes to more important sections. This report, the *design documents* for Artillery 3, including the derivations A3L, A3R, and A3X, were written for COS20007, Object-Oriented Programming.

I have found this unit to be heaps of fun and quite informative in my path down the dark alleyways of Computer Science (CS). There is no doubt that this unit is difficult and I suspect most 'normal' students coming into CS without prior knowledge of programming will find this unit to be a killer, along with the other notorious units such as Creating Web Apps, and Networks and Switching. Nonetheless, this report will be written following strong engineering standards as per my default background, however, I want you to know that I came into this unit with a strong intuition for programming and therefore, cannot be considered an average case for most computer science students at Swinburne University of Technology. 

In some ways, this unit is too hard. My experience at the helpdesk has brought to my attention the inability of certain students. If there is a great decider in CS, it's most certainly this unit. This could speak to the volumes of woefully underprepared students or the general difficulty of this unit. 

#### Acknowledgements

I would like to extend my heartfelt thanks to Medhi Naseriparsa, for putting up with my rambling nonsense in the laboratory classes and taking the time to correct my mostly unpolished work. I had finished most of the tasks 3-4 weeks earlier than I submitted them, and hence, every submission that I had with Medhi was a journey of discovery for the both of us.

---

## I. Aims and Research Intentions

This section details the aims of the High Distinction project to provide insight into the reason why certain decisions were made throughout the unit.

### I. a. Aims

I aim to attain a high-band high distinction in this unit. The goal of Artillery 3 (A3) and accompanying revisions (A3 Legacy - A3L, A3 Revised - A3R, and A3 X - A3X) is multi-faceted:

* To provide evidence of a strong understanding of all five OO learning outcomes through a large and extensive project;
* To provide a platform for the research component, if conducted at all;
* To provide a learning opportunity throughout the semester through an even bigger iteration task;
* To realise and finalise the Artillery Concept, first conceptualised in COS10001 Introduction to Programming in which Artillery II attained a Mark of 100; the only logical next step is to step that project up.

The personal aspect of this project is the ambition and dream I had for Artillery, and the ability to form that into reality drove my programming throughout the night. Of course, this led to conflicts with other units.

The final research project was conceptualised in Weeks 10 to 11, which will be discussed in the following section.

### I. b, Research Intentions

I have personally had an interest in Machine Learning and the general field of AI but was never able to realise that pathway in one way or another. I intend to bank on that interest to create an interesting and meaningful HD project for Artillery, however, that required extensive programming knowledge and a platform for development that I needed to understand from the inside-out.

I understood well enough the dangers of poorly-designed programs, and Artillery was my first step into the same vein. I started development of Artillery early on in Weeks 3-4 as a stepping stone for formalising many of the ideas I had read about, mostly related to design patterns. I had asked early on what I should be doing to prepare for the HD task and many responded with 'Design Patterns'. As of writing, I can confidently say I have a solid grasp of the following design patterns:

> * Composition;
> * Command and Command Streams;
> * Abstract Factory (and to an extent, Factory);
> * States and State Machines (FSM, Pushdown Automata);
> * Singleton;
> * Observer;
> * Strategy.

I can also confidently say that I have a strong understanding of:

> The Dependency Inversion Principle, C# Events.

I was capable of realising the above by simply jumping in and implementing the code; to gain an intuitive grasp I had to reach out and try to grab it first.

The research intentions into the High Distinction AI project are:

* To understand and iterate upon commonly-understood methods of creating "Game Intelligence Agents";
* To develop and design at a high level, and consequently implement various methods into the A3 Platform;
* and to develop a useful baseline understanding of the many interactions of OO code, in particular, the use of the Artillery AI system as a separate library/project, aiming for loose coupling between the two.

I will, of course, need a nice name for the AI system. For now, we'll coin the AI system as the `Nekox.HatsuyukiSystem` with `nekox` being the main domain I like to work under. 

## Artillery 3

> I started out not knowing how to program in OO, seriously, -- I did engineering first and that turned out to be my greatest strength and flaw.

The design of Artillery 3 was an iterative one; the designed evolved as I learnt more and more about OO-programming. Many of the systems seen in A3 are the result of many hours of reading on my tablet and a few test programs, though most of the testing was one within A3 itself. A lot of A3 is actually based off the real world, with objects purportedly making sense as if they were designed as real-world objects!

This can be seen in a number of places, but the most obvious one would simply be the implementation of `Artillery.World`. This class represents the World of artillery--or rather, the combat. Strict adherence to encapsulation implied that only the `World` had access to the players and that, later on, when I started to implement the UI system, I came into massive issues trying to get the UI to accept what was essentially `World` information or to send it from `Artillery.UserInterface` to `Artillery` to `Artillery.World` through convoluted pathways. This drove home the importance of design which A3X later implemented, however, this example shows that OO was more than just objects.

> A3L showed me that the most real-world way of designing objects isn't always the best. Object-Oriented Design in itself, is an art.



