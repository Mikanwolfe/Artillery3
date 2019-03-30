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

        public TerrainGenerator(Rectangle windowRect)
        {
            _windowRect = windowRect;
        }

        public Rectangle WindowRect { get => _windowRect; }

        public abstract Terrain Generate();

    }
}
