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
        int[] _terrainMap;
        Rectangle _windowRect;

        public Terrain(Rectangle windowRect)
        {
           _windowRect = windowRect;
        }

        public int[] Map { get => _terrainMap; set => _terrainMap = value; }

        public void Draw()
        {
            for(int i = 0; i < _terrainMap.Length; i++)
            {
                SwinGame.DrawLine(Color.Green, i, _windowRect.Height, i, _terrainMap[i]);
            }
        }
    }
}
