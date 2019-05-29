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
        public UI_Combat(A3RData a3RData)
            : base(a3RData)
        {
            _a3RData = a3RData;

            _playerChargeBar = new UI_LoadingBar(_a3RData.Camera, 400, 30, Color.Orange, 
                (int)(_a3RData.WindowRect.Width * 0.7),
                (int)(_a3RData.WindowRect.Height * 0.88));


            AddElement(_playerChargeBar);

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
            _playerChargeBar.SetPlayerPreviousPercentage(A3RData.SelectedPlayer.PreviousWeaponCharge);
            base.Update();
        }
    }
}
