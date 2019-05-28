using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public static class Constants
    {
        public const float Gravity = 0.6f;
        public const float VelocityLoss = 1f;
        public const string Data = "data.json";

        public const int WindowHeight = 900;
        public const int WindowWidth = WindowHeight * 16 / 9;
        public const int BoundaryBoxPadding = 20;
        public const int CameraEaseSpeed = 10;
        public const double CameraAfterExplosionDelay = 7;
        public const int CameraMaxHeight = 2000;
        public const int CameraPadding = 100;

        public const float WeaponChargeSpeed = 0.5f;

        public const float SatelliteDamageIncPerTurn = 0.15f;

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
   

    public class Artillery3R  // 3 Revised, Reimplemented, Retrofit...
    {
        A3RData _a3RData;
        Rectangle _windowRect;
        UIEventArgs _uiEventArgs;
        
        Stack<GameState> _gameState;
        GameState _currentState;

        Dictionary<UIEvent, GameState> _gameStateTranstitions;

        public static Services Services
        {
            get
            {
                return Services.Instance;
            }
        }

        public Artillery3R()
        {
            LoadResources();
            _a3RData = new A3RData();
            Services.Initialise(_a3RData);
            _windowRect = _a3RData.WindowRect;
            UserInterface.Instance.OnNotifyUIEvent = NotifyUIEvent;

            _gameState = new Stack<GameState>();

            _gameStateTranstitions = new Dictionary<UIEvent, GameState>();
            _gameStateTranstitions.Add(UIEvent.StartGame, new PlayerSelectGameState(_a3RData));
            _gameStateTranstitions.Add(UIEvent.MainMenu, new MainMenuGameState(_a3RData));

            //TODO: Add in the rest of the UI transitions here

        }

        public void NotifyUIEvent(UIEventArgs uiEventArgs)
        {
            Console.WriteLine("Arty has been called for a UI Event {0}", uiEventArgs.Event);

            


           try
            {
                //Push the next state, and then the loading state.
                // if the game is in the loading state it's then going to load the state properly.
                _gameState.Push(_gameStateTranstitions[uiEventArgs.Event]);
                _gameState.Push(new LoadingGameState(_gameState));
            }
            catch (Exception e)
            {
                Console.WriteLine("Could not find game state for UIEventArg: " + e.Message);
            }
        }


        private void LoadResources()
        {
            SwinGame.LoadBitmapNamed("windMarker", "windmarker.png");
            SwinGame.LoadBitmapNamed("testButton", "testbutton.png");
            SwinGame.LoadBitmapNamed("menuLogo", "menu_logo.png");
            SwinGame.LoadBitmapNamed("menuGradientFull", "menu_gradient_fulltrans.png");
            SwinGame.LoadBitmapNamed("menuGradientHalf", "menu_gradient_halftrans.png");
            SwinGame.LoadBitmapNamed("startButton", "menu_start.png");
            SwinGame.LoadBitmapNamed("loadButton", "menu_load.png");
            SwinGame.LoadBitmapNamed("optionsButton", "menu_options.png");
            SwinGame.LoadBitmapNamed("exitButton", "menu_exit.png");

            SwinGame.LoadBitmapNamed("startButtonSelected", "menu_start_selected.png");
            SwinGame.LoadBitmapNamed("loadButtonSelected", "menu_load_selected.png");
            SwinGame.LoadBitmapNamed("optionsButtonSelected", "menu_options_selected.png");
            SwinGame.LoadBitmapNamed("exitButtonSelected", "menu_exit_selected.png");


            SwinGame.LoadSoundEffectNamed("laser_satellite", "magicSorcery_Short1_edit.wav");
            SwinGame.LoadSoundEffectNamed("satellite_prep", "satellite_prep.wav");
            SwinGame.LoadSoundEffectNamed("menuSound", "koikenmenu.ogg");

            SwinGame.LoadFontNamed("guiFont", "maven_pro_regular.ttf", 12);
        }


        public void Run()
        {
            SwinGame.OpenAudio();
            SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);
            SwinGame.SetIcon("H:\\repos\\Artillery3\\Resources\\images\\logoArtillery3LogoIcon.ico");

            LoadResources();
            SwinGame.ClearScreen(Color.White);


            _gameState.Push(_gameStateTranstitions[UIEvent.MainMenu]);
            _currentState = _gameState.Peek();
            _currentState.EnterState();

            while (!SwinGame.WindowCloseRequested() && !_a3RData.UserExitRequested)
            {
                _currentState = _gameState.Peek();

                SwinGame.ProcessEvents();
                //Services.Update();

                _currentState.Update();
                UserInterface.Instance.Update();

                SwinGame.ClearScreen(Color.White);
                UserInterface.Instance.Draw();
                _currentState.Draw();
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

        public string Version => "Artillery 3Rx, When A3L, A3R, and A3X fall through. Rx Rises."; 
        
    }
}
