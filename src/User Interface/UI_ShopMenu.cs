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
        UI_EquipBox _equipBox;

        Bitmap _shopBackground;

        Player _selPlayer;

        string _playerName, _characterName;

        UI_StaticImage _fadeFx;
        UI_ShopItems _shopItems;

        public UI_ShopMenu(A3RData a3RData, NotifyPlayerFinishedShop notifyPlayerFinishedShop)
            : base(a3RData)
        {
            _notifyPlayerFinishedShop = notifyPlayerFinishedShop;

            _shopBackground = SwinGame.BitmapNamed("shopBg");

            AddElement(new UI_StaticImage(a3RData.Camera, Width(0.5f), Height(0.24f), SwinGame.BitmapNamed("menuLogo")));

            _characterBox = new UI_Box(A3RData, 300, 200, new Vector(20, 20));
            _statBox = new UI_TextBox(A3RData, 300, 370, new Vector(20, 240));
            _equipBox = new UI_EquipBox(A3RData, 300, 750, new Vector(Width(1) - 320, 20), RefreshShopItems);

            UI_Button _nextButton = new UI_Button(Camera, "Next", Width(1) -170, Height(1)-60, FinishShopButton);
            _nextButton.Width = 300;
            _nextButton.MouseOverSoundEffect = SwinGame.SoundEffectNamed("menuSound");
            _nextButton.MiddleAligned = true;
            _nextButton.LockToScreen();

            _fadeFx = new UI_StaticImage(Camera, 0, 0, SwinGame.BitmapNamed("fadeFx"));

            if (A3RData.EasterEggTriggered)
                AddElement(new UI_StaticImage(a3RData.Camera, Width(0.5f), Height(-1f), SwinGame.BitmapNamed("ddlc")));

            _playerName = A3RData.SelectedPlayer.Name;
            _characterName = A3RData.SelectedPlayer.Character.Name;
            _shopItems = new UI_ShopItems(A3RData, RefreshEquipBox);
            AddElement(_shopItems);

            AddElement(_nextButton);
            AddElement(_equipBox);
            AddElement(_characterBox);
            AddElement(_statBox);

            AddElement(new UI_HealthUpgradeButton(a3RData, 300, 60, new Vector(20, _statBox.Pos.Y + 390)));
            AddElement(new UI_ArmourUpgradeButton(a3RData, 300, 60, new Vector(20, _statBox.Pos.Y + 390 + 80)));

            AddElement(_fadeFx);

            _selPlayer = A3RData.SelectedPlayer;


        }
        public void RefreshShopItems()
        {
            _shopItems.RefreshItems();
        }
        public void RefreshEquipBox()
        {
            _equipBox.RefreshEquipBox();
        }

        public override void Draw()
        {
            _shopBackground?.Draw(Camera.Pos.X, Camera.Pos.Y * 0.7f);
            


            base.Draw();
        }

        public void FinishShopButton()
        {
            Console.WriteLine("Player Finished Shop! Swapping over...");
            _notifyPlayerFinishedShop();
        }

        public override void Update()
        {
            _fadeFx.X = Camera.Pos.X;
            _fadeFx.Y = Camera.Pos.Y;

            _statBox.Clear();

            _statBox.AddText(" ");
            _statBox.AddText(_playerName);
            _statBox.AddText(_characterName);
            _statBox.AddText(" ");
            _statBox.AddText("---");
            _statBox.AddText("Health:  " + _selPlayer.Character.MaxHealth);
            _statBox.AddText("Armour:  " + _selPlayer.Character.MaxArmour);
            _statBox.AddText("Money : $" + _selPlayer.Money);
            _statBox.AddText(" ");
            _statBox.AddText(_selPlayer.Character.LongDesc);
            _statBox.AddText("---");
            _statBox.AddText("Additional stats will go here");

            base.Update();
        }


    }
}
