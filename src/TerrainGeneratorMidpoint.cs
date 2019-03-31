using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    //TODO: Currently limited by window size, will have to expand to accomodate for 
    //       Camera and camera movement.
    public class TerrainGeneratorMidpoint : TerrainGenerator
    {
        

        public TerrainGeneratorMidpoint(Rectangle windowSize) : base(windowSize)
        {
        }

        public override Terrain Generate()
        {
            Console.WriteLine("Generating Midpoint terrain!");


            int width = PowerCeiling(WindowRect.Width, 2);
            Console.WriteLine("Exp ceiling {0} found value: {1}",width,Math.Pow(2,width));

            Terrain _terrain = new Terrain(WindowRect)
            {
                Map = new int[(int)WindowRect.Width]


            };


            return _terrain;
        }
    }
}
