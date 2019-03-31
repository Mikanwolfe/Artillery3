using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    class ArtilleryGame
    {
        Rectangle _windowRect;
        World _world;
        

        public ArtilleryGame(Rectangle windowRect)
        {
            LoadResources();

            _windowRect = windowRect;
            _world = new World(_windowRect);
        }


        private void LoadResources()
        {

        }
      



        public void Run(Rectangle _windowRect)
        {
            Terrain _terrain;


            SwinGame.OpenAudio();
            //Open the game window
            //SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);

            TerrainGenerator _terrainFactory = new TerrainGeneratorRandom(_windowRect);
            _terrain = _terrainFactory.Generate();

            Character Innocentia = new Character("Innocentia");
            EntityManager.Instance.Add(Innocentia);
            

            EntityManager.Instance.Update();
            EntityManager.Instance.Draw();


            while (!SwinGame.WindowCloseRequested())
            {
                //Fetch the next batch of UI interaction
                SwinGame.ProcessEvents();

                //Clear the screen and draw the framerate
                SwinGame.ClearScreen(Color.White);

                SwinGame.DrawFramerate(0, 0);

                //_terrain.Draw();

                //Draw onto the screen
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

    }
}
