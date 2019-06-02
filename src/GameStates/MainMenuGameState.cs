using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class MainMenuGameState : GameState
    {
        public override void EnterState()
        {
            SwinGame.StopMusic();
            SwinGame.PlayMusic("shopDrone");
            base.EnterState();
        }
        public MainMenuGameState(A3RData a3RData) : base(a3RData)
        {
            UIModule = new UI_MainMenu(A3RData);
        }
    }
}
