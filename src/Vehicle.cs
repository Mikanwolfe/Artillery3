using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    // Vehicles are the main body of the character.
    //  They compose of Hulls and Weapons.
    //  Hulls contain all of the HP and Armour stats,
    //  Weapons are well... weapons. They originally meant "Gun" but now
    //   they can also refer to things like missiles and tachyon lances.
    class Vehicle : EntityAssembly
    {
        private float _fuel;
        

        public Vehicle(string name) : base(name)
        {

        }

        public int Health
        {
            get
            {
                int health = 0;
                foreach(Entity e in Entities)
                {
                    health += (int)(e as Hull).Health;
                }

                return health;
            }
        }

        public void AddHull(Hull hull)
        {
            Entities.Add(hull);
        }

        public override void Draw()
        {
            Console.WriteLine("Drawing Vehicle!");
        }

        public override void Update()
        {
            Console.WriteLine("Updating Vehicle!");
        }


    }
}
