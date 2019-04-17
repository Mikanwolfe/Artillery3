using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class Terrain : IDrawable
    {
        float[] _terrainMap; 
        Rectangle _windowRect;
        private Color _color;

        public Terrain(Rectangle windowRect)
        {
           _windowRect = windowRect;
        }

        public float[] Map { get => _terrainMap; set => _terrainMap = value; }
        public Color Color { get => _color; set => _color = value; }

        public void Draw()
        {
            for(int i = 0; i < _terrainMap.Length; i++)
            {
                SwinGame.DrawLine(_color, i, Constants.TerrainDepth, i, (int)Math.Round(_terrainMap[i]));
            }
        }
    }
}
