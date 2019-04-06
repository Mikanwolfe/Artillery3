using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    public static class Constants
    {
        public const float Gravity = 0.6f;
        public const float VelocityLoss = 1f;
        public const string Data = "data.xml";

        public const int WindowHeight = 900;
        public const int WindowWidth = WindowHeight * 16 / 9;


        //For now we'll have consts inside here, i'll incorporate xml support later.

        
        public const int InvalidPlayerCircleRadius = 3;
        public const float PlayerSpeed = 0.1f; //TODO: Change to Accel
        public const float BaseExplosionRadius = 20;
        public const int BaseExplosionDiaScaling = 15;
        public const int BaseCollisionRadius = 5;
        public const float BaseFrictionCoefKinetic = 0.5f;
        public const float BaseFrictionCoefStatic = 0.8f;
        public const float BaseFrictionStaticError = 0.2f;
        public const float BaseVehicleWeight = 1000f; //Arbitrary units
        public const int VectorSightSize = 20;
    }
    class ArtilleryGame
    {
        Rectangle _windowRect;
        World _world;
        InputHandler _inputHandler;
        Command _playerCommand;
        Terrain _terrain;



        public ArtilleryGame()
        {
            LoadResources();

            _windowRect = new Rectangle
            {
                Width = Constants.WindowWidth,
                Height = Constants.WindowHeight
            };

            _terrain = new Terrain(_windowRect);
            _world = new World(_windowRect);
            _inputHandler = new InputHandler();
        }


        private void LoadResources()
        {

        }
      



        public void Run()
        {

            SwinGame.OpenAudio();
            //Open the game window
            SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);

            TerrainGenerator _terrainFactory = new TerrainGeneratorMidpoint(_windowRect);
            _terrain = _terrainFactory.Generate();
            PhysicsEngine.Instance.Terrain = _terrain;

            Character Innocentia = new Character("Innocentia");

            //UI_Button _uiButton = new UI_Button(600, 200);
            
           // EntityManager.Instance.Add(Innocentia);
            

            


            while (!SwinGame.WindowCloseRequested())
            {
                //Fetch the next batch of UI interaction
                SwinGame.ProcessEvents();

                _playerCommand = _inputHandler.HandleInput();
                if (_playerCommand != null)
                    _playerCommand.Execute(Innocentia);



                PhysicsEngine.Instance.Simulate();
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
