using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class InputHandler
    {


        public InputHandler()
        {
            //Change for specific controllers maybe.
        }
        public Command HandleInput()
        {

            if (SwinGame.KeyDown(KeyCode.AKey)) return new MoveLeftCommand();
            if (SwinGame.KeyDown(KeyCode.DKey)) return new MoveRightCommand();
            if (SwinGame.KeyDown(KeyCode.LeftKey)) return new MoveLeftCommand();
            if (SwinGame.KeyDown(KeyCode.RightKey)) return new MoveRightCommand();
            if (SwinGame.KeyDown(KeyCode.SpaceKey)) return new ChargeWeaponCommand();
            if (SwinGame.KeyReleased(KeyCode.SpaceKey)) return new FireWeaponCommand();
            if (SwinGame.KeyTyped(KeyCode.SKey)) return new SwitchWeaponCommand();
            if (SwinGame.KeyDown(KeyCode.UpKey)) return new ElevateWeaponCommand();
            if (SwinGame.KeyDown(KeyCode.DownKey)) return new DepressWeaponCommand();
            

            return null;
        }



    }


}
