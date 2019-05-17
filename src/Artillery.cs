﻿using System;
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
                SwinGame.TryOpenAudio();
            }
            catch (Exception e)
            {
                //Not like it's an issue.
            }

            SwinGame.OpenGraphicsWindow("Artillery3", Artillery.Constants.WindowWidth, Artillery.Constants.WindowHeight);
            SwinGame.ClearScreen(Color.White);


            while (!SwinGame.WindowCloseRequested() && !_userExitRequested)
            {

                SwinGame.ProcessEvents();




            }
            SwinGame.RefreshScreen(60);
            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();

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

        static string SettingsFile = "settings.json";
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
        public string InitString;
        public int WindowWidth;
        public int WindowHeight;
    }

}
