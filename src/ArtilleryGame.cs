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
        Command _playerCommand;
        PhysicsEngine _physicsEngine;


        public ArtilleryGame(Rectangle windowRect)
        {
            LoadResources();

            _windowRect = windowRect;
            _world = new World(_windowRect);
            _inputHandler = new InputHandler();
            _physicsEngine = new PhysicsEngine();
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

            TerrainGenerator _terrainFactory = new TerrainGeneratorMidpoint(_windowRect);
            _terrain = _terrainFactory.Generate();
            _physicsEngine.Terrain = _terrain;

            Character Innocentia = new Character("Innocentia");
            _physicsEngine.AddComponent(Innocentia);
            EntityManager.Instance.Add(Innocentia);
            

            


            while (!SwinGame.WindowCloseRequested())
            {
                //Fetch the next batch of UI interaction
                SwinGame.ProcessEvents();

                _playerCommand = _inputHandler.HandleInput();
                if (_playerCommand != null)
                    _playerCommand.Execute(Innocentia);



                _physicsEngine.Simulate();
                EntityManager.Instance.Update();
                


                SwinGame.ClearScreen(Color.White);
                SwinGame.DrawFramerate(0, 0);
                _terrain.Draw();
                EntityManager.Instance.Draw();
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

    }
}
