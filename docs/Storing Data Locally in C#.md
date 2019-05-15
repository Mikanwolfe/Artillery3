JSON vs. XML vs. MySQL

Verdict:

**https://www.newtonsoft.com/json**

---

### 

* Artillery needs to store data
* Type of data it needs to store
* comparing types
* other considerations
* final decision



## Storing Data Locally in C#

As with many games, A3 requires content to run. A3 defines classes and it's from those classes we create some objects to mess around with, and it's these objects that A3 just can't seem to get enough of.

It doesn't take much to understand the downsides of hard-coded objects and variables within games. Hard-coding objects such as certain weapon types into A3 would take an unnecessary amount of space and also requires the game to be re-compiled every time we adjust some data within A3. 

The practice of storing data outside of the source code is prevalent throughout the programming world and A3 soon needs to be a part of it. Along with pre-set weapons, A3 also has pre-prepared characters and environments to choose from. This doesn't include the more important configuration elements such as defining constants from outside the source code. Within this course we're taught a simple method of object serial and de-serialisation (read: writing and reading) objects within the Shapes iteration series. This does come with limitations but I find the most important one is that it is *not human-readable.*

### Artillery 3 and it's data

Human readable configuration is important due to the scope of Artillery 3. Since it's a (relatively-speaking) small program, the data it needs to store is more important in it's ability to be easily manipulated and edited rather than the convention or standards it follows. In our case, we want to look at a data file for artillery and easily surmise what it is, what values mean what, and what we might want to tweak.

Take, for example, the serialised contents of a shape class:

``` 
Example
```

