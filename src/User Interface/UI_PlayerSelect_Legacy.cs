using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{


    public enum PlayerSelectState{
        ReadingNumberPlayers,
        ReadingPlayers,
        ReadingPlayerCharacters,
        Finishing
    }
    public class UI_PlayerSelect_Legacy : UIElementAssembly, IStateComponent<PlayerSelectState>
    {
        
        UI_Text textElement;
        StateComponent<PlayerSelectState> _stateComponent;

        UI_StaticImage _menuLogo;
        List<Player> _players;

        int numberPlayers;
        bool _characterSelected = false;
        int currentIndexPlayer;


        public UI_PlayerSelect_Legacy(A3RData a3RData)
            :base (a3RData)
        {
            _stateComponent = new StateComponent<PlayerSelectState>(PlayerSelectState.ReadingNumberPlayers);

            _menuLogo = new UI_StaticImage(a3RData.Camera, Width(0.45f), Height(0.14f), SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);

            textElement = new UI_Text(a3RData.Camera, Width(0.5f), Height(0.35f),
                Color.Black, "Number of players:",true);
            AddElement(textElement);



            //start reading number players.
            SwinGame.StartReadingText(Color.Black, 20, SwinGame.FontNamed("guiFont"),
                            (int)Width(0.5f), (int)Height(0.4f));

            _players = Artillery3R.Services.A3RData.Players;

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

                    textElement = new UI_Text(A3RData.Camera, Width(0.5f), Height(0.35f),
                            Color.Black, "Player " + currentIndexPlayer + "'s Name:", true);
                    AddElement(textElement);

                    break;

                case PlayerSelectState.ReadingPlayerCharacters:
                    SwinGame.EndReadingText();

                    if (currentIndexPlayer < numberPlayers)
                    {
                        ClearUI();
                        AddElement(_menuLogo);

                        /* create the ui */

                        UI_Button _uiButton;

                        textElement = new UI_Text(A3RData.Camera, Width(0.5f), Height(0.35f),
                                Color.Black, "Select a Character", true);
                        AddElement(textElement);

                        textElement = new UI_Text(A3RData.Camera, Width(0.5f), Height(0.38f),
                                Color.Black, _players[currentIndexPlayer].Name, true);
                        AddElement(textElement);

                        _uiButton = new UI_Button(A3RData.Camera, "G.W. Tiger", Width(0.25f), Height(0.5f), new UIEventArgs("gwt"));
                        _uiButton.OnUIEvent += NotifyUIEvent;
                        _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
                        _uiButton.MiddleAligned = true;
                        AddElement(_uiButton);

                        _uiButton = new UI_Button(A3RData.Camera, "Object 15X", Width(0.5f), Height(0.5f), new UIEventArgs("obj"));
                        _uiButton.OnUIEvent += NotifyUIEvent;
                        _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
                        _uiButton.MiddleAligned = true;
                        AddElement(_uiButton);

                        _uiButton = new UI_Button(A3RData.Camera, "Innocentia", Width(0.75f), Height(0.5f), new UIEventArgs("int"));
                        _uiButton.OnUIEvent += NotifyUIEvent;
                        _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
                        _uiButton.MiddleAligned = true;
                        AddElement(_uiButton);

                        /* End ui creation */


                        
                    }
                    currentIndexPlayer++;
                    break;


            }

            
            _stateComponent.Switch(nextState);
        }

        public void NotifyUIEvent(object sender, UIEventArgs uiEventArgs)
        {
            //This is for the buttons
            Console.WriteLine(uiEventArgs.Text + " selected!");
            Character newCharacter;

            switch (uiEventArgs.Text)
            {
                case "gwt":
                    newCharacter = new Character("G.W. Tiger", 100, 250, _players[currentIndexPlayer - 1]);
                    Weapon autoLoader = new Weapon("BatChat Autoloader", 10, 85, ProjectileType.Shell);
                    autoLoader.AutoloaderClip = 5;
                    autoLoader.ProjectilesFiredPerTurn = 3;
                    autoLoader.BaseDamage = 80;
                    autoLoader.UsesSatellite = true;
                    //newCharacter.AddWeapon(autoLoader);

                    _players[currentIndexPlayer-1].Character = newCharacter;
                    Console.WriteLine("GTW Selected!");
                    break;

                case "obj":
                    _players[currentIndexPlayer-1].Character = new Character("Object 15X", 100, 100, _players[currentIndexPlayer - 1]);
                    Console.WriteLine("Obj Selected!");
                    break;

                case "int":
                    _players[currentIndexPlayer - 1].Character = new Character("Innocentia", 100, 100, _players[currentIndexPlayer - 1]);
                    Console.WriteLine("int Selected!");
                    break;



            }
            


            _characterSelected = true;
            
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
                            Player player = new Player(SwinGame.EndReadingText(), new PlayerInputMethod());
                            _players.Add(player);
                            SwitchState(PlayerSelectState.ReadingPlayers);
                        }
                    }
                    break;

                case PlayerSelectState.ReadingPlayerCharacters:

                    if (currentIndexPlayer > numberPlayers)
                    {
                        Console.WriteLine("Called to finish!");
                        //UserInterface.Instance.FinishedPlayerSelection();
                    }
                    else
                    {
                        if (_characterSelected)
                        {
                            _characterSelected = false;
                            SwitchState(PlayerSelectState.ReadingPlayerCharacters);
                        }
                            

                        base.Update();
                    }

                    break;


            }
        }
    }
}
