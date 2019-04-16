using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public abstract class TerrainFactory
    {
        Rectangle _windowRect;
        Rectangle _terrainBox;
        Random _random = new Random();

        public TerrainFactory(Rectangle windowRect, Rectangle terrainBox)
        {
            _windowRect = windowRect;
            _terrainBox = terrainBox;
        }

        public Rectangle WindowRect { get => _windowRect; }
        public Random Random { get => _random; set => _random = value; }

        public Rectangle TerrainBox { get => _terrainBox; }

        protected int PowerCeiling( float baseValue, float exp)
        {
            return (int)Math.Ceiling(Math.Log(exp, baseValue));
        }


        public abstract Terrain Generate();

    }
}
