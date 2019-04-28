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
        public const int BoundaryBoxPadding = 20;
        public const int CameraEaseSpeed = 10;
        public const double CameraAfterExplosionDelay = 7;
        public const int CameraMaxHeight = 2000;
        public const int CameraPadding = 100;

        public const float WeaponChargeSpeed = 0.5f;

        public const float SatelliteDamageIncPerTurn = 0.05f;

        public const int RayCastStep = 10;

        public const int WorldMaxHeight = 2200;

        public const string EnvironmentPreset = "Twilight Sun";

        public const int TerrainDepth = 1800;
        public const int TerrainWidth = 2400;
        public const int DistFromInfinity = 900;
        public const float TerrainReductionCoefficient = 0.45f;

        public const int AverageTerrainHeight = (int)(TerrainDepth * 0.6);
        public const int BaseTerrainInitialDisplacement = (int)(0.1 * TerrainDepth);
               
        public const double ParticleLifeDispersion = 0.05;

        public const int NumberParallaxBackgrounds = 3;


        //For now we'll have consts inside here, i'll incorporate xml support later.

        
        public const int InvalidPlayerCircleRadius = 3;
        public const float PlayerSpeed = 1.5f;
        public const float BaseExplosionRadius = 10;
        public const int BaseExplosionDiaScaling = 8;
        public const int BaseCollisionRadius = 5;
        public const float BaseFrictionCoef = 0.8f;
        public const float BaseFrictionStaticError = 0.2f;
        public const float BaseVehicleWeight = 1000f; //Arbitrary units
        public const int VectorSightSize = 20;
    }
    class ArtilleryGame
    {
        Rectangle _windowRect;
        World _world;
        InputHandler _inputHandler;





        public ArtilleryGame()
        {
            LoadResources();

            _windowRect = new Rectangle
            {
                Width = Constants.WindowWidth,
                Height = Constants.WindowHeight
            };

            _inputHandler = new InputHandler();
            _world = new World(_windowRect, _inputHandler);
            PhysicsEngine.Instance.SetWindowRect(_windowRect);


        }


        private void LoadResources()
        {
            SwinGame.LoadBitmapNamed("windMarker", "windmarker.png");
            



        }
      



        public void Run()
        {

            SwinGame.OpenAudio();
            //Open the game window
            SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);
            SwinGame.SetIcon("H:\\repos\\Artillery3\\Resources\\images\\logoArtillery3LogoIcon.ico");

            LoadResources();

            UserInterface.Instance.Initialise();
            
            Player player1 = new Player("Restia", _world);
            Character Innocentia = new Character("Innocentia", 100, 200);
            player1.Character = Innocentia;


            Player player2 = new Player("Est", _world);
            Character char2 = new Character("Materia", 100, 200);
            player2.Character = char2;

            player1.Initiallise();
            player2.Initiallise();

            _world.AddPlayer(player1);
            _world.AddPlayer(player2);

            _world.CyclePlayers();
            _world.NewSession();


            while (!SwinGame.WindowCloseRequested())
            {
                //Fetch the next batch of UI interaction
                SwinGame.ProcessEvents();

                _world.HandleInput();


                ParticleEngine.Instance.Update();
                PhysicsEngine.Instance.Simulate();
                EntityManager.Instance.Update();
                UserInterface.Instance.Update();
                _world.Update();
                


                SwinGame.ClearScreen(_world.SkyColor);
                SwinGame.DrawFramerate(0, 0);


                _world.Draw();
                ParticleEngine.Instance.Draw();
                EntityManager.Instance.Draw();
                _world.DrawSatellite();
                UserInterface.Instance.Draw();
                

                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

    }
}
