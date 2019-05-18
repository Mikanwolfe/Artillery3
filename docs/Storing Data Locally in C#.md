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





## App.Config

Will only use for tech specs. 

https://stackoverflow.com/questions/1565898/app-config-vs-custom-xml-file

See second ans

![1557965923034](C:\repos\Artillery3\docs\Storing Data Locally in C#-assets\1557965923034.png)

Hence, using a JSON for this is easier using newtonsoft.json

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



In the case of Artillery 3, we would want to include a large amount of content that is readily accessible and modifiable if necessary. 





The decision is JSON. JSON is more readable than XML, the Newtonsoft JSON.NET is super easy to use and it helps with the rather large number of properties for... a lot of things.



XML Serialisation for saving the game though. Totally worth for the terrain and stuff.



App.Config for the config stuff and loading it into the constants static file. Constants is a bit of a pain  since it's constant, however, if we just keep it static and allow the variables to be edited we can work around the issue and change some things around as we move to MVC

---

The more important discussion was the difficulty in the implementation-level of config.

Artillery uses a static class to store the constants since they can be access from anywhere within artillery, however, you can't serialise a static class as they occur at compile time and not necessarily during run-time, and also it just didn't work.

The goal here was to make it that we could load constants from the .json file using Newton.JSON which would allow us flexibility when producing a larger game. To do this I drew from ideas in c# singleton implementation and created static members of a traditional class that would return the Constants object. This constants object is special since it outlines what the JSON file contains the NewtonSoft.JSON would use this as a template for all the values that are read to it (tokenisation). Hence, by creating a static constructor member that would return a singleton-esque runtime object, we can achieve almost global constants distributions throughout all of artillery by calling Artillery.Constants. 

This also means that we can enforce what the JSON file contains, though it also makes it slightly harder to add new variables since they both have to be identical to work. There might not be a way to do it without the contract interface since it's what the compiler relies on when the code asks for constants, so in a way, it is an interesting use of a not-interface interface.



---

Links and stuff

https://www.c-sharpcorner.com/article/is-json-overridden-xml/

https://stackoverflow.com/questions/1941928/best-way-to-store-data-locally-in-net-c

https://stackoverflow.com/questions/13043530/what-is-app-config-in-c-net-how-to-use-it

https://www.guru99.com/c-sharp-serialization.html

https://stackoverflow.com/questions/10864755/adding-and-reading-from-a-config-file

