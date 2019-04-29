using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public enum UIEvent
    {
        StartGame,
        LoadGame,
        Options,
        Exit
    }
    public class UIEventArgs : EventArgs
    {
        UIEvent _uiEvent;
        public UIEventArgs(UIEvent uiEvent)
        {
            _uiEvent = uiEvent;
        }

        public UIEvent Event { get => _uiEvent; set => _uiEvent = value; }

    }
}
