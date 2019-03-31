using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public abstract class TerrainGenerator
    {
        Rectangle _windowRect;
        Random _random = new Random();

        public TerrainGenerator(Rectangle windowRect)
        {
            _windowRect = windowRect;
        }

        public Rectangle WindowRect { get => _windowRect; }
        public Random Random { get => _random; set => _random = value; }

        protected int PowerCeiling( float baseValue, float exp)
        {
            return (int)Math.Ceiling(Math.Log(exp, baseValue));
        }


        public abstract Terrain Generate();

    }
}
