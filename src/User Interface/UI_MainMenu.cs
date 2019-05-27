using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_MainMenu : UIElementAssembly
    {
        UI_Button _playButton;

        public UI_MainMenu(A3RData a3RData) : base (a3RData)
        {

            Rectangle _windowRect = A3RData.WindowRect;

            UI_DynamicImage _menuGradient = new UI_DynamicImage(0, 0, -5000, 0, 10, SwinGame.BitmapNamed("menuGradientFull"));
            AddElement(_menuGradient);

            _menuGradient = new UI_DynamicImage(0, 0, -8000, 0, 15, SwinGame.BitmapNamed("menuGradientHalf"));
            AddElement(_menuGradient);

            UI_StaticImage _menuLogo = new UI_StaticImage(_windowRect.Width * 0.022f, _windowRect.Height * 0.24f, SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);

            _playButton = new UI_Button("New Game", _windowRect.Width * 0.026f, _windowRect.Height * 0.417f, UIEvent.StartGame, 
                SwinGame.BitmapNamed("startButton"), SwinGame.BitmapNamed("startButtonSelected"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            _playButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            AddElement(_playButton);

            _playButton = new UI_Button("Load Game", _windowRect.Width * 0.026f, _windowRect.Height * 0.466f, UIEvent.StartGame, 
                SwinGame.BitmapNamed("loadButton"), SwinGame.BitmapNamed("loadButtonSelected"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            _playButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            AddElement(_playButton);

            _playButton = new UI_Button("Test Text", _windowRect.Width * 0.026f, _windowRect.Height * 0.520f, UIEvent.StartGame, 
                SwinGame.BitmapNamed("optionsButton"), SwinGame.BitmapNamed("optionsButtonSelected"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            _playButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            AddElement(_playButton);

            _playButton = new UI_Button("Exit", _windowRect.Width * 0.026f, _windowRect.Height * 0.572f, UIEvent.Exit, 
                SwinGame.BitmapNamed("exitButton"), SwinGame.BitmapNamed("exitButtonSelected"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            _playButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            AddElement(_playButton);

        }
    }
}
