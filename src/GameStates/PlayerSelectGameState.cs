using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public enum PlayerSelect
    {
        NumberPlayers,
        PlayerNames,
        PlayerCharacters
    }

    public delegate void endSelectStage(PlayerSelect endedEvent);
    public class PlayerSelectGameState : GameState
    {
        
        public PlayerSelectGameState(A3RData a3RData) 
            : base(a3RData)
        {
            UIModule = new UI_PlayerSelectNumberPlayers(A3RData, PlayerSelectHandler);
        }

        public void PlayerSelectHandler(PlayerSelect endedEvent)
        {
            switch (endedEvent)
            {
                case PlayerSelect.NumberPlayers: // Implies that we've just selected the no. of Players
                    UIModule = new UI_PlayerSelectNames(A3RData, PlayerSelectHandler);
                    break;

                case PlayerSelect.PlayerNames: // Implies that we've just selected the no. of Players
                    UIModule = new UI_PlayerSelectCharacters(A3RData, PlayerSelectHandler);
                    break;

                case PlayerSelect.PlayerCharacters:
                    //UserInterface.Instance.
                    break;

            }

            UserInterface.Instance.RefreshUI();
        }
    }
}
