using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    public class UI_Combat : UIElementAssembly
    {

        //Include a minimap here too!!


        UI_LoadingBar _playerChargeBar;
        public UI_Combat()
        {
            _playerChargeBar = new UI_LoadingBar(400, 30, Color.Orange, 
                (int)(UserInterface.Instance.WindowRect.Width * 0.7),
                (int)(UserInterface.Instance.WindowRect.Height * 0.88));


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
            base.Update();
        }
    }
}
