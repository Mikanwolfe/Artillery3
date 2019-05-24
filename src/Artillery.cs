using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using SwinGameSDK;
using Newtonsoft.Json;
using static Artillery.Utilities;
using Newtonsoft.Json.Linq;

namespace Artillery
{
    public class Artillery
    {
        Rectangle _windowRect;
        bool _userExitRequested = false;

        public Artillery()
        {
            LoadResources();
            
            _windowRect = new Rectangle
            {
                Width = Artillery.Constants.WindowWidth,
                Height = Artillery.Constants.WindowHeight
            };

        }


        public void Run()
        {
            try
            {
                SwinGame.OpenAudio();
            }
            catch (Exception e)
            {
                Console.WriteLine("Audio failed to open: " + e.Message); //Not like it's an issue.
            }

            
            A3Data _a3Data = new A3Data();
            Services.Instance.Initialise(_a3Data);

            GameStateManager _gameStateManager = new GameStateManager(_a3Data);

            SwinGame.OpenGraphicsWindow("Artillery3x", Artillery.Constants.WindowWidth, Artillery.Constants.WindowHeight);

            LoadResources();


            while (!SwinGame.WindowCloseRequested() && !_userExitRequested)
            {
                SwinGame.ClearScreen(Color.White);
                SwinGame.ProcessEvents();

                Services.Update();
                Services.Draw();

                _gameStateManager.Update();
                _gameStateManager.Draw();
                SwinGame.RefreshScreen(60);

            }
            
            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();

        }

        /* ----------------------------------- Unimportant stuff ----------------------------------- */

        public static Services Services
        {
            get => Services.Instance;
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

        /* ----------------------------------- Constants ----------------------------------- */

        static string SettingsFile = "settings.json"; // Yes this is hard-coded. App.Config change maybe.
        private static Constants _constants;
        public static Constants Constants
        {
            get
            {
                if (_constants == null)
                {
                    string jsonString = new StreamReader(SettingsFile).ReadToEnd();
                    _constants = JsonConvert.DeserializeObject<Constants>(jsonString);
                }
                return _constants;
            }
        }

    }
    public class Constants
    {
        private Constants() { }
        public string InitString;
        public int WindowWidth;
        public int WindowHeight;
        public float Gravity;
        public float CameraEaseSpeed;
        public int CameraPadding;
        public int CameraMaxHeight;
        public int TerrainWidth;
        public int TerrainHeight;
        public float TerrainReductionCoef;
        public int AverageTerrainHeight;
        public int TerrainBoxPadding;
        public int BaseTerrainInitialDisplacement;
        public int NumBgTerrain;
        public int WeaponChargeSpeed;
    }

}
