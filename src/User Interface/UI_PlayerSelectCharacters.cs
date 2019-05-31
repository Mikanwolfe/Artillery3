using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_PlayerSelectCharacters : UI_PlayerSelectTemplate
    {
        int _playerIndex = 0;
        UI_Text _playerText;

        UI_StaticImage _background;

        public UI_PlayerSelectCharacters(A3RData a3RData, endSelectStage endSelectStage)
            : base(a3RData, endSelectStage)
        {

            _background = new UI_StaticImage(Camera, 0, 0, SwinGame.BitmapNamed("shopBg"));
            AddElement(_background);

            _playerText = new UI_Text(Camera, Width(0.5f), Height(0.38f),
                Color.Black, "Player X:", true);
            AddElement(_playerText);

            AddElement(new UI_Text(A3RData.Camera, Width(0.5f), Height(0.35f),
                                Color.Black, "Select a Character", true));
            UI_Button _uiButton;

            _uiButton = new UI_Button(A3RData.Camera, "G.W. Tiger", Width(0.25f), Height(0.5f), new UIEventArgs("gwt"));
            _uiButton.OnUIEvent += CharacterButtonPressed;
            _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            _uiButton.MiddleAligned = true;
            AddElement(_uiButton);

            _uiButton = new UI_Button(A3RData.Camera, "Object 15X", Width(0.5f), Height(0.5f), new UIEventArgs("obj"));
            _uiButton.OnUIEvent += CharacterButtonPressed;
            _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            _uiButton.MiddleAligned = true;
            AddElement(_uiButton);

            _uiButton = new UI_Button(A3RData.Camera, "Innocentia", Width(0.75f), Height(0.5f), new UIEventArgs("int"));
            _uiButton.OnUIEvent += CharacterButtonPressed;
            _uiButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            _uiButton.MiddleAligned = true;
            AddElement(_uiButton);
        }

        public override void Update()
        {
            if (_playerIndex <= A3RData.NumberOfPlayers - 1)
            {
                _playerText.Text = "Player " + A3RData.Players[_playerIndex].Name + ":";
            }
            
            base.Update();
        }

        public void CharacterButtonPressed(object sender, UIEventArgs uiEventArgs)
        {
            Console.WriteLine(uiEventArgs.Text + " selected!");
            Character newCharacter;

            //make this into a json thing later
            if (_playerIndex < A3RData.NumberOfPlayers)
            {

                switch (uiEventArgs.Text)
                {
                    case "gwt":
                        newCharacter = new Character("G.W. Tiger", 100, 50);

                        A3RData.Players[_playerIndex].Character = newCharacter;
                        Console.WriteLine("GTW Selected!");
                        break;

                    case "obj":
                        A3RData.Players[_playerIndex].Character = new Character("Object 15X", 100, 50);
                        Console.WriteLine("Obj Selected!");
                        break;

                    case "int":
                        A3RData.Players[_playerIndex].Character = new Character("Innocentia", 100, 50);
                        Console.WriteLine("int Selected!");
                        break;
                }
            }

            _playerIndex++;

            if (_playerIndex > A3RData.NumberOfPlayers - 1)
            {
                EndSelectStage(PlayerSelect.PlayerCharacters);
            }
        }

    }
}
