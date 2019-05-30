using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public enum UIEvent
    {
        MainMenu,
        StartGame,
        StartCombat,
        EndCombat,
        LoadGame,
        Options,
        Exit
    }
    public class UIEventArgs : EventArgs
    {
        UIEvent _uiEvent;
        string _text;
        public UIEventArgs(UIEvent uiEvent)
        {
            _uiEvent = uiEvent;
        }

        public UIEventArgs(string text)
        {
            _text = text;
        }

        public UIEvent Event { get => _uiEvent; set => _uiEvent = value; }
        public string Text { get => _text; set => _text = value; }
    }
}
