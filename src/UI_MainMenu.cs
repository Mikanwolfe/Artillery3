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
            _playButton = new UI_Button("New Game", 40, _windowRect.Height * 0.2f, UIEvent.StartGame);
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            _playButton = new UI_Button("Load Game", 40, _windowRect.Height * 0.3f, UIEvent.StartGame);
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            _playButton = new UI_Button("Test Text", 40, _windowRect.Height * 0.4f, UIEvent.StartGame, SwinGame.BitmapNamed("testButton"));
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);

            _playButton = new UI_Button("Exit", 40, _windowRect.Height * 0.5f, UIEvent.Exit);
            _playButton.OnUIEvent += UserInterface.Instance.NotifyUIEvent;
            AddElement(_playButton);
        }
    }
}
