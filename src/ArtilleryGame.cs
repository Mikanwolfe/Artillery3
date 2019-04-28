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
    
    enum MenuState
    {
        MainMenu,
        CombatStage,
        ShopState,
        //Unused:
        OptionsMenu, //Will require pushdown
        Credits
    }

    class ArtilleryGame : IStateComponent<MenuState>
    {
        Rectangle _windowRect;
        World _world;
        InputHandler _inputHandler;
        StateComponent<MenuState> _stateComponent;

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
            _stateComponent = new StateComponent<MenuState>(MenuState.MainMenu);

            PhysicsEngine.Instance.SetWindowRect(_windowRect);
        }


        private void LoadResources()
        {
            SwinGame.LoadBitmapNamed("windMarker", "windmarker.png");
            SwinGame.LoadSoundEffectNamed("laser_satellite", "magicSorcery_Short1.wav");
            SwinGame.LoadSoundEffectNamed("satellite_prep", "satellite_prep.wav");



        }


        public void Run()
        {
            SwinGame.OpenAudio();
            SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);
            SwinGame.SetIcon("H:\\repos\\Artillery3\\Resources\\images\\logoArtillery3LogoIcon.ico");

            LoadResources();

            UserInterface.Instance.Initialise();

            SwitchState(MenuState.MainMenu);

            while (!SwinGame.WindowCloseRequested())
            {

                SwinGame.ProcessEvents();

                switch (PeekState())
                {
                    case MenuState.MainMenu:


                        SwinGame.ClearScreen(Color.White);
                        SwinGame.DrawFramerate(0, 0);

                        SwinGame.DrawText("A3 Menu",Color.Black,0,0);

                        if (SwinGame.KeyTyped(KeyCode.KKey))
                            SwitchState(MenuState.CombatStage);


                        break;

                    case MenuState.CombatStage:

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

                        break;
                }
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

        public void InitialiseCombatStage()
        {
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
        }

        public void EndCombatStage()
        {

        }

        public void SwitchState(MenuState nextState)
        {
            switch(PeekState())
            {

                case MenuState.MainMenu:
                    if (nextState == MenuState.CombatStage)
                    {
                        InitialiseCombatStage();
                    }
                    break;

                case MenuState.CombatStage:
                    if (nextState == MenuState.ShopState)
                    {
                        EndCombatStage();
                    }
                    break;


            }

            _stateComponent.Switch(nextState);
        }

        public MenuState PeekState()
        {
            return _stateComponent.Peek();
        }

        public void PushState(MenuState state)
        {
            _stateComponent.Push(state);
        }

        public MenuState PopState()
        {
            return _stateComponent.Pop();
        }
    }
}
