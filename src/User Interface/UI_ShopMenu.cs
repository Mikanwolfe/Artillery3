using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_ShopMenu : UIElementAssembly
    {
        NotifyPlayerFinishedShop _notifyPlayerFinishedShop;
        UI_Box _characterBox;
        UI_TextBox _statBox;
        UI_Box _equipBox;

        Player _selPlayer;

        string _playerName, _characterName;
        
        public UI_ShopMenu(A3RData a3RData, NotifyPlayerFinishedShop notifyPlayerFinishedShop)
            : base(a3RData)
        {
            _notifyPlayerFinishedShop = notifyPlayerFinishedShop;

            AddElement(new UI_StaticImage(a3RData.Camera, Width(0.5f), Height(0.24f), SwinGame.BitmapNamed("menuLogo")));

            _characterBox = new UI_Box(A3RData, 300, 200, new Vector(20, 20));
            _statBox = new UI_TextBox(A3RData, 300, 600, new Vector(20, 240));
            _equipBox = new UI_TextBox(A3RData, 300, 600, new Vector(Width(1) - 320, 20));

            UI_Button _nextButton = new UI_Button(Camera, "Next", Width(1) -170, Height(1)-60, FinishShopButton);
            _nextButton.Width = 300;
            _nextButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            _nextButton.MiddleAligned = true;
            _nextButton.LockToScreen();

            _playerName = A3RData.SelectedPlayer.Name;
            _characterName = A3RData.SelectedPlayer.Character.Name;


            AddElement(_nextButton);
            AddElement(_equipBox);
            AddElement(_characterBox);
            AddElement(_statBox);

            _selPlayer = A3RData.SelectedPlayer;


        }

        public void FinishShopButton()
        {
            Console.WriteLine("Player Finished Shop! Swapping over...");
            _notifyPlayerFinishedShop();
        }

        public override void Update()
        {
            _statBox.Clear();

            _statBox.AddText(" ");
            _statBox.AddText(_playerName);
            _statBox.AddText(_characterName);
            _statBox.AddText("---");
            _statBox.AddText("Health: " + _selPlayer.Character.MaxHealth);
            _statBox.AddText("Armour: " + _selPlayer.Character.MaxArmour);
            _statBox.AddText("");
            _statBox.AddText(_selPlayer.Character.LongDesc);
            _statBox.AddText("---");
            _statBox.AddText("Additional stats will go here");

            base.Update();
        }


    }
}
