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

        string _playerName, _characterName;
        
        public UI_ShopMenu(A3RData a3RData, NotifyPlayerFinishedShop notifyPlayerFinishedShop)
            : base(a3RData)
        {
            _notifyPlayerFinishedShop = notifyPlayerFinishedShop;

            AddElement(new UI_StaticImage(a3RData.Camera, Width(0.5f), Height(0.24f), SwinGame.BitmapNamed("menuLogo")));

            _characterBox = new UI_Box(A3RData, 300, 200, new Vector(20, 20));
            _statBox = new UI_TextBox(A3RData, 300, 600, new Vector(20, 240));

            _playerName = A3RData.SelectedPlayer.Name;
            _characterName = A3RData.SelectedPlayer.Character.Name;

            _statBox.AddText("");
            _statBox.AddText(_playerName);
            _statBox.AddText(_characterName);
            _statBox.AddText("---");


            AddElement(_characterBox);
            AddElement(_statBox);


        }

        public override void Update()
        {

            base.Update();
        }


    }
}
