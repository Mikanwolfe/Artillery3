using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class TerrainGeneratorMidpoint : TerrainGenerator
    {
        public TerrainGeneratorMidpoint(Rectangle windowSize) : base(windowSize)
        {
        }

        public override Terrain Generate()
        {
            Console.WriteLine("Generating midpoint terrain!");
            return null;
        }
    }
}
