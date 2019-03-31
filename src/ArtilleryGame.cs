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
        InputHandler _inputHandler;
        Command PlayerCommand;


        public ArtilleryGame(Rectangle windowRect)
        {
            LoadResources();

            _windowRect = windowRect;
            _world = new World(_windowRect);
            _inputHandler = new InputHandler();
        }


        private void LoadResources()
        {

        }
      



        public void Run(Rectangle _windowRect)
        {
            Terrain _terrain;

            


            SwinGame.OpenAudio();
            //Open the game window
            SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);

            TerrainGenerator _terrainFactory = new TerrainGeneratorRandom(_windowRect);
            _terrain = _terrainFactory.Generate();

            Character Innocentia = new Character("Innocentia")
            {
                X = 800,
                Y = _terrain.Map[800]
            };
            EntityManager.Instance.Add(Innocentia);
            

            


            while (!SwinGame.WindowCloseRequested())
            {
                //Fetch the next batch of UI interaction
                SwinGame.ProcessEvents();

                //Clear the screen and draw the framerate
                SwinGame.ClearScreen(Color.White);

                SwinGame.DrawFramerate(0, 0);



                PlayerCommand = _inputHandler.HandleInput();
                if (PlayerCommand != null)
                    PlayerCommand.Execute(Innocentia);



                _terrain.Draw();
                EntityManager.Instance.Update();
                EntityManager.Instance.Draw();

                //Draw onto the screen
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

    }
}
