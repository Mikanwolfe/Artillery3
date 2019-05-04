using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    public class UI_MainMenu : UIElementAssembly
    {
        Rectangle _windowRect = UserInterface.Instance.WindowRect;
        UI_Button _playButton;

        

        public UI_MainMenu()
        {

            UI_DynamicImage _menuGradient = new UI_DynamicImage(_windowRect.Width * 0.234f, 0, SwinGame.BitmapNamed("menuGradient"));
            AddElement(_menuGradient);

            UI_StaticImage _menuLogo = new UI_StaticImage(_windowRect.Width * 0.026f, _windowRect.Height * 0.24f, SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);

            _playButton = new UI_Button("New Game", _windowRect.Width * 0.026f, _windowRect.Height * 0.417f, UIEvent.StartGame, SwinGame.BitmapNamed("startButton"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            _playButton = new UI_Button("Load Game", _windowRect.Width * 0.026f, _windowRect.Height * 0.466f, UIEvent.StartGame, SwinGame.BitmapNamed("loadButton"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            _playButton = new UI_Button("Test Text", _windowRect.Width * 0.026f, _windowRect.Height * 0.520f, UIEvent.StartGame, SwinGame.BitmapNamed("optionsButton"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            _playButton = new UI_Button("Exit", _windowRect.Width * 0.026f, _windowRect.Height * 0.572f, UIEvent.Exit, SwinGame.BitmapNamed("exitButton"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            
        }
    }
}
