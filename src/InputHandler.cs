using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    class InputHandler
    {

        MoveLeftCommand MoveLeft = new MoveLeftCommand();
        MoveRightCommand MoveRight = new MoveRightCommand();
        public InputHandler()
        {
            //Change for specific controllers maybe.
        }
        public Command HandleInput()
        {

            if (SwinGame.KeyDown(KeyCode.AKey)) return MoveLeft;
            if (SwinGame.KeyDown(KeyCode.DKey)) return MoveRight;
            if (SwinGame.KeyDown(KeyCode.LeftKey)) return MoveLeft;
            if (SwinGame.KeyDown(KeyCode.RightKey)) return MoveRight;

            return null;
        }



    }


}
