using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class TerrainGeneratorRandom : TerrainGenerator
    {
        Random _random = new Random();

        public TerrainGeneratorRandom(Rectangle windowSize) : base(windowSize)
        {
        }

        public override Terrain Generate()
        {
            Console.WriteLine("Generating random terrain!");
            Terrain _terrain = new Terrain(WindowRect)
            {
                Map = new int[(int)WindowRect.Width]
            };

            for (int i = 0; i < (int)WindowRect.Width; i++)
            {
                _terrain.Map[i] = 500 + _random.Next(-20, 20);
                Console.WriteLine(i + " : " + _terrain.Map[i]);
            }


            return _terrain;
        }
    }
}
