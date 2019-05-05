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
        ReadingPlayers,
        ReadingPlayerCharacters,
        Finishing
    }
    public class UI_PlayerSelect : UIElementAssembly, IStateComponent<PlayerSelectState>
    {
        
        UI_Text textElement;
        StateComponent<PlayerSelectState> _stateComponent;

        UI_StaticImage _menuLogo;
        List<Player> _players;

        int numberPlayers;
        int currentIndexPlayer;


        public UI_PlayerSelect()
        {
            _stateComponent = new StateComponent<PlayerSelectState>(PlayerSelectState.ReadingNumberPlayers);

            _menuLogo = new UI_StaticImage(Width(0.45f), Height(0.14f), SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);

            textElement = new UI_Text(Width(0.5f), Height(0.35f),
                Color.Black, "Number of players:",true);
            AddElement(textElement);



            //start reading number players.
            SwinGame.StartReadingText(Color.Black, 20, SwinGame.FontNamed("guiFont"),
                            (int)Width(0.5f), (int)Height(0.4f));

            _players = new List<Player>();

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


                    ClearUI();
                    
                    AddElement(_menuLogo);

                    textElement = new UI_Text(Width(0.5f), Height(0.35f),
                            Color.Black, "Player " + currentIndexPlayer + "'s Name:", true);
                    AddElement(textElement);

                    break;

                case PlayerSelectState.ReadingPlayerCharacters:
                    SwinGame.EndReadingText();

                    ClearUI();
                    AddElement(_menuLogo);

                    /* create the ui */

                    UI_Button _uiButton;

                    textElement = new UI_Text(Width(0.5f), Height(0.35f),
                            Color.Black,"Select a Character", true);
                    AddElement(textElement);

                    textElement = new UI_Text(Width(0.5f), Height(0.38f),
                            Color.Black, _players[currentIndexPlayer].Name, true);
                    AddElement(textElement);

                    _uiButton = new UI_Button("Character 1", Width(0.4f), Height(0.4f),new UIEventArgs("Character 1"));
                    _uiButton.OnUIEvent += NotifyUIEvent;
                    _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
                    AddElement(_uiButton);

                    /* End ui creation */


                    currentIndexPlayer++;

                    break;


            }

            
            _stateComponent.Switch(nextState);
        }

        public void NotifyUIEvent(object sender, UIEventArgs uiEventArgs)
        {
            //This is for the buttons
            Console.WriteLine(uiEventArgs.Text + " selected!");
        }

        public override void Draw()
        {
            DrawTextCentre("UI State:" + PeekState(), Color.Black, Width(0.5f), Height(0.1f));

            base.Draw();
        }

        public override void Update()
        {


            switch (PeekState())
            {


                case PlayerSelectState.ReadingNumberPlayers:
                    if (!SwinGame.ReadingText())
                    {
                        numberPlayers = Convert.ToInt32( SwinGame.EndReadingText());
                        currentIndexPlayer = 0;
                        SwitchState(PlayerSelectState.ReadingPlayers);
                        
                    }

                    

                    break;

                case PlayerSelectState.ReadingPlayers:
                    if (currentIndexPlayer > numberPlayers)
                    {
                        currentIndexPlayer = 0;
                        SwitchState(PlayerSelectState.ReadingPlayerCharacters);
                    } else
                    {
                       
                        if (!SwinGame.ReadingText())
                        {
                            Player player = new Player(SwinGame.EndReadingText());
                            _players.Add(player);
                            SwitchState(PlayerSelectState.ReadingPlayers);
                        }
                    }
                    break;

                case PlayerSelectState.ReadingPlayerCharacters:
                    if (currentIndexPlayer >= numberPlayers)
                    {
                        //endgame
                    }
                    else
                    {


                    }


                    break;


            }
        }
    }
}
