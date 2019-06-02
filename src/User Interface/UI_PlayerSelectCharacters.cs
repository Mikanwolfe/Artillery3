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
            Weapon startingWeapon;

            //make this into a json thing later
            if (_playerIndex < A3RData.NumberOfPlayers)
            {

                switch (uiEventArgs.Text)
                {
                    case "gwt":
                        newCharacter = new Character("G.W. Tiger", 150, 100, A3RData.Players[_playerIndex]);

                        startingWeapon = new Weapon("G.W. 150mm/78 Morser", -20, 90, ProjectileType.Shell);
                        startingWeapon.BaseDamage = 100;
                        startingWeapon.AimDispersion = 3.1f;
                        startingWeapon.AutoloaderClip = 2;
                        startingWeapon.WeaponMaxCharge = 50;
                        startingWeapon.DamageRad = 50;
                        startingWeapon.Rarity = 1;
                        startingWeapon.ShortDesc = "Extensively field-tested, a reliable and sturdy weapon with no equal.";
                        startingWeapon.LongDesc = "Starting Weapon for G.W. Tiger";
                        startingWeapon.Cost = 500;

                        newCharacter.AddWeapon(startingWeapon);

                        A3RData.Players[_playerIndex].Character = newCharacter;
                        break;

                    case "obj":
                        newCharacter = new Character("Object 15X", 75, 175, A3RData.Players[_playerIndex]);

                        startingWeapon = new Weapon("190mm D-76ST 15X", 0, 45, ProjectileType.Shell);
                        startingWeapon.BaseDamage = 200;
                        startingWeapon.AimDispersion = 0.9f;
                        startingWeapon.WeaponMaxCharge = 40;
                        startingWeapon.DamageRad = 75;
                        startingWeapon.Rarity = 1;
                        startingWeapon.ShortDesc = "An experimental adaption from CLS-T developed during the last Neko Wars.";
                        startingWeapon.LongDesc = "Starting Weapon for Object 15X";
                        startingWeapon.Cost = 500;

                        newCharacter.AddWeapon(startingWeapon);

                        A3RData.Players[_playerIndex].Character = newCharacter;
                        break;

                    case "int":
                        newCharacter = new Character("Innocentia", 100, 150, A3RData.Players[_playerIndex]);

                        startingWeapon = new Weapon("120mm Kati-S / Sat. Enabled.", 0, 45, ProjectileType.Shell);
                        startingWeapon.BaseDamage = 80;
                        startingWeapon.ProjectilesFiredPerTurn = 2;
                        startingWeapon.AimDispersion = 2.1f;
                        startingWeapon.WeaponMaxCharge = 70;
                        startingWeapon.DamageRad = 80;
                        startingWeapon.UsesSatellite = true;
                        startingWeapon.Rarity = 1;
                        startingWeapon.ShortDesc = "An early prototype that utilised the MAIA Satellite System.";
                        startingWeapon.LongDesc = "Starting Weapon for Innocentia";
                        startingWeapon.Cost = 500;

                        newCharacter.AddWeapon(startingWeapon);

                        A3RData.Players[_playerIndex].Character = newCharacter;
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
