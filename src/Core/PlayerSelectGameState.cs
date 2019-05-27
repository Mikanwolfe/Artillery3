using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class PlayerSelectGameState : GameState
    {
        public PlayerSelectGameState(A3RData a3RData) 
            : base(a3RData)
        {
            _uiModule = new UIElementAssembly();
        }
    }
}
