using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_Combat : UIElementAssembly
    {

        A3RData _a3RData;

        UI_LoadingBar _playerChargeBar;
        UI_LoadingBar _playerFuel;
        public UI_Combat(A3RData a3RData)
            : base(a3RData)
        {
            _a3RData = a3RData;

            _playerChargeBar = new UI_LoadingBar(_a3RData.Camera, 400, 30, Color.Orange, 
                (int)(_a3RData.WindowRect.Width * 0.7),
                (int)(_a3RData.WindowRect.Height * 0.88));

            _playerFuel = new UI_LoadingBar(_a3RData.Camera, 400, 20, Color.SteelBlue,
                (int)(_a3RData.WindowRect.Width * 0.7),
                (int)(_a3RData.WindowRect.Height * 0.92));


            AddElement(_playerChargeBar);
            AddElement(_playerFuel);

            AddElement(new UI_Minimap(a3RData, Camera));

            AddElement(new UI_WindMarker(_a3RData.Camera, _a3RData.Wind));

        }

        public void UpdatePlayerChargeBar(float percentage)
        {
            _playerChargeBar.UpdateLoadingBar(percentage);
        }

        public void ClearChargeBar()
        {
            _playerChargeBar.UpdateLoadingBar(0);
        }

        public void SetPlayerPreviousPercentage(float percentage)
        {
            _playerChargeBar.SetPlayerPreviousPercentage(percentage);
        }


        public override void Draw()
        {
            base.Draw();
        }

        public override void Update()
        {
            _playerChargeBar.UpdateLoadingBar(A3RData.SelectedPlayer.WeaponChargePercentage);
            _playerFuel.UpdateLoadingBar(A3RData.SelectedPlayer.Character.Fuel);
            _playerChargeBar.SetPlayerPreviousPercentage(A3RData.SelectedPlayer.PreviousWeaponCharge);
            base.Update();
        }
    }
}
