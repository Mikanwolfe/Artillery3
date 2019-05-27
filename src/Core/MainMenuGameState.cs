using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class MainMenuGameState : GameState
    {
        A3RData _a3RData;
        public MainMenuGameState(A3RData a3RData) : base(a3RData)
        {
            _a3RData = a3RData;
            _uiModule = new UI_MainMenu(_a3RData);
        }
    }
}
