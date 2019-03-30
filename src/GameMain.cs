using System;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class GameMain
    {
        public static void Main()
        {
            Rectangle _windowRect = new Rectangle
            {
                Height = 900,
                Width = 1600
            };
            ArtilleryGame Artillery3 = new ArtilleryGame(_windowRect);

            Artillery3.Run(_windowRect);
        }
    }
}