using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{


    public enum PlayerSelectState{
        ReadingNumberPlayers,
        ReadingPlayers
    }
    public class UI_PlayerSelect : UIElementAssembly, IStateComponent<PlayerSelectState>
    {
        
        UI_Text textElement;
        StateComponent<PlayerSelectState> _stateComponent;

        List<Player> _players;

        int numberPlayers;
        int currentIndexPlayer;


        public UI_PlayerSelect()
        {
            _stateComponent = new StateComponent<PlayerSelectState>(PlayerSelectState.ReadingNumberPlayers);

            UI_StaticImage _menuLogo = new UI_StaticImage(Width(0.45f), Height(0.14f), SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);

            textElement = new UI_Text(Width(0.5f), Height(0.35f),
                Color.Black, "Number of players:",true);
            AddElement(textElement);



            //start reading number players.
            SwinGame.StartReadingText(Color.Black, 20, SwinGame.FontNamed("guiFont"),
                            (int)Width(0.5f), (int)Height(0.4f));

        }

        public PlayerSelectState PeekState()
        {
            return _stateComponent.Peek();
        }

        public PlayerSelectState PopState()
        {
            return _stateComponent.Pop();
        }

        public void PushState(PlayerSelectState state)
        {
            _stateComponent.Push(state);
        }

        public void SwitchState(PlayerSelectState nextState)
        {
            // State machine logic goes here

            switch (nextState)
            {
                case PlayerSelectState.ReadingPlayers:

                    SwinGame.StartReadingText(Color.Black, 20, SwinGame.FontNamed("guiFont"),
                            (int)Width(0.5f), (int)Height(0.4f));
                    currentIndexPlayer++;
                    




                    break;

                
            }

            
            _stateComponent.Switch(nextState);
        }

        public override void Update()
        {


            switch (PeekState())
            {


                case PlayerSelectState.ReadingNumberPlayers:
                    if (!SwinGame.ReadingText())
                    {
                        numberPlayers = Convert.ToInt32( SwinGame.EndReadingText());
                        SwitchState(PlayerSelectState.ReadingPlayers);
                        currentIndexPlayer = 0;
                    }

                    

                    break;

                case PlayerSelectState.ReadingPlayers:
                    if (currentIndexPlayer >= numberPlayers)
                    {
                        //endgame!
                    } else
                    {

                    }


                    break;


            }
        }
    }
}
