﻿using System;
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
        public const int MaxNumberPlayers = 10;

        public const int ScrollSpeed = 30;

        public const float Gravity = 0.6f;
        public const float VelocityLoss = 1f;
        public const string Data = "data.json";

        public const int WindowHeight = 900;
        public const int WindowWidth = WindowHeight * 16 / 9;
        public const int BoundaryBoxPadding = 20;
        public const int CameraEaseSpeed = 10;
        public const double CameraAfterExplosionDelay = 7;
        public const int CameraMaxHeight = 5000;
        public const int CameraPadding = 100;

        public const float WeaponChargeSpeed = 0.5f;

        public const float SatelliteDamageIncPerTurn = 0.5f;

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

        CameraFocusPoint _devFocusPoint;
        CameraFocusPoint _mouseFocusPoint;

        Dictionary<UIEvent, GameState> _gameStateTransitions;

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
            UserInterface.Instance.UIEventOccurred = UIEventOccured;

            _gameState = new Stack<GameState>();

            _gameStateTransitions = new Dictionary<UIEvent, GameState>();
            _gameStateTransitions.Add(UIEvent.StartGame, new PlayerSelectGameState(_a3RData));
            _gameStateTransitions.Add(UIEvent.MainMenu, new MainMenuGameState(_a3RData));
            _gameStateTransitions.Add(UIEvent.StartCombat, new CombatGameState(_a3RData));
            _gameStateTransitions.Add(UIEvent.EndCombat, new ShopGameState(_a3RData));
            _gameStateTransitions.Add(UIEvent.Exit, new ExitState(_a3RData));

            //TODO: Add in the rest of the UI transitions here

        }

        public void UIEventOccured(UIEventArgs uiEventArgs)
        {
            Console.WriteLine("Arty has been called for a UI Event {0}", uiEventArgs.Event);

            try
            {
                //Push the next state, and then the loading state.
                // if the game is in the loading state it's then going to load the state properly.
                _gameState.Push( _gameStateTransitions[uiEventArgs.Event]);
                _gameState.Push(new LoadingGameState(_gameState, _a3RData));
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
            SwinGame.LoadBitmapNamed("menuLeftWhite", "leftwhite.png");
            SwinGame.LoadBitmapNamed("fullBg", "fullbg.jpg");
            SwinGame.LoadBitmapNamed("startButton", "menu_start.png");
            SwinGame.LoadBitmapNamed("loadButton", "menu_load.png");
            SwinGame.LoadBitmapNamed("optionsButton", "menu_options.png");
            SwinGame.LoadBitmapNamed("exitButton", "menu_exit.png");
            SwinGame.LoadBitmapNamed("shopBg", "shopbg.jpg");
            SwinGame.LoadBitmapNamed("fadeFx", "fadefxshop.png");
            SwinGame.LoadBitmapNamed("combatBg", "imagebg.jpg");

            SwinGame.LoadBitmapNamed("startButtonSelected", "menu_start_selected.png");
            SwinGame.LoadBitmapNamed("loadButtonSelected", "menu_load_selected.png");
            SwinGame.LoadBitmapNamed("optionsButtonSelected", "menu_options_selected.png");
            SwinGame.LoadBitmapNamed("exitButtonSelected", "menu_exit_selected.png");
            SwinGame.LoadBitmapNamed("ddlc", "ddlc.jpg");


            SwinGame.LoadSoundEffectNamed("laser_satellite", "magicSorcery_Short1_edit.wav");
            SwinGame.LoadSoundEffectNamed("satellite_prep", "satellite_prep.wav");
            SwinGame.LoadSoundEffectNamed("menuSound", "koikenmenu.ogg");
            SwinGame.LoadSoundEffectNamed("newMenuSound", "hover.ogg");
            SwinGame.LoadSoundEffectNamed("confirmSound", "confirm.ogg");

            SwinGame.LoadSoundEffectNamed("mechConfirm", "UI_Mechanical_Confirm_04_FX.ogg");
            SwinGame.LoadSoundEffectNamed("mechMove", "UI_Mechanical_Move_40.wav");
            SwinGame.LoadSoundEffectNamed("mechTurnOn", "UI_Mechanical_Turning-On_03_Raw.ogg");
            SwinGame.LoadSoundEffectNamed("mechFail", "UI_Mechanical_Error_11_FX_01.ogg");

            SwinGame.LoadSoundEffectNamed("entryboomCombat", "entryboom-combat.ogg");
            SwinGame.LoadSoundEffectNamed("entryboomShop", "entryboom-shop.ogg");
            SwinGame.LoadSoundEffectNamed("winSound", "winsfx.ogg");
            SwinGame.LoadSoundEffectNamed("menuConfirm", "menuConfirm.ogg");
            SwinGame.LoadSoundEffectNamed("newTurn", "newTurn.ogg");
            SwinGame.LoadSoundEffectNamed("charDie", "charDie.ogg");

            SwinGame.LoadSoundEffectNamed("expl1", "expl1.ogg");
            SwinGame.LoadSoundEffectNamed("expl2", "expl2.ogg");
            SwinGame.LoadSoundEffectNamed("expl3", "expl3.ogg");
            SwinGame.LoadSoundEffectNamed("acid", "shatter_ice_001.ogg");

            SwinGame.LoadMusicNamed("generalBg", "carpark_underground_003.ogg");
            SwinGame.LoadMusicNamed("shopDrone", "menuDrones.ogg");
            SwinGame.LoadMusicNamed("menuAmbience", "menuAmbience.ogg");

            SwinGame.LoadFontNamed("guiFont", "cour.ttf", 12);
            SwinGame.LoadFontNamed("winnerFont", "maven_pro_regular.ttf", 25);
            SwinGame.LoadFontNamed("shopFont", "maven_pro_regular.ttf", 15);
            SwinGame.LoadFontNamed("smallFont", "maven_pro_regular.ttf", 14);
            SwinGame.LoadFontNamed("smallerFont", "maven_pro_regular.ttf", 12);
            SwinGame.LoadFontNamed("bigFont", "maven_pro_regular.ttf", 68);
        }



        public void Run()
        {
            SwinGame.OpenAudio();
            SwinGame.OpenGraphicsWindow("Artillery3", (int)_windowRect.Width, (int)_windowRect.Height);
            SwinGame.SetIcon("H:\\repos\\Artillery3\\Resources\\images\\logoArtillery3LogoIcon.ico");

            LoadResources();
            SwinGame.ClearScreen(Color.White);


            _gameState.Push(_gameStateTransitions[UIEvent.MainMenu]);
            _currentState = _gameState.Peek();
            _currentState.EnterState();

            while (!SwinGame.WindowCloseRequested() && !_a3RData.UserExitRequested)
            {
                _currentState = _gameState.Peek();

                SwinGame.ProcessEvents();

                _currentState.Update();
                UserInterface.Instance.Update();

                #region Developer Region

                /*
                if (SwinGame.KeyDown(KeyCode.MKey))
                {
                    _devFocusPoint = new CameraFocusPoint();
                    Clamp(_devFocusPoint.Pos.X, _a3RData.WindowRect.Width / 2, _a3RData.Terrain.Map.Length - _a3RData.WindowRect.Width / 2);
                    _devFocusPoint.Pos = _a3RData.Camera.Focus.Pos;
                    _a3RData.Camera.FocusCamera(_devFocusPoint);
                }
                */


                //if (SwinGame.KeyDown(KeyCode.LKey)) _devFocusPoint.Vector.X += 10;
                //if (SwinGame.KeyDown(KeyCode.JKey)) _devFocusPoint.Vector.X -= 10;
                //if (SwinGame.KeyDown(KeyCode.IKey)) _devFocusPoint.Vector.Y -= 10;
                //if (SwinGame.KeyDown(KeyCode.KKey)) _devFocusPoint.Vector.Y += 10;

                if (SwinGame.MouseDown(MouseButton.RightButton))
                {
                    if (_mouseFocusPoint == null)
                        _mouseFocusPoint = new CameraFocusPoint();
                    _mouseFocusPoint.Vector.X = SwinGame.MouseX() + _a3RData.Camera.Pos.X;
                    _mouseFocusPoint.Vector.Y = SwinGame.MouseY() + _a3RData.Camera.Pos.Y;
                    _a3RData.Camera.FocusCamera(_mouseFocusPoint);
                }


                #endregion

                SwinGame.ClearScreen(Color.White);
                _currentState.Draw();
                UserInterface.Instance.Draw();
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();
        }

        public string Version => "A3s Final Iteration";

    }
}
