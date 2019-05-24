using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public class CommandMoveLeft : Command
    {
        public override void Execute(ICharacter c)
        {
            c.MoveLeft();
        }
    }

    public class CommandMoveRight : Command
    {
        public override void Execute(ICharacter c)
        {
            c.MoveRight();
        }
    }

    public class CommandAimUp : Command
    {
        public override void Execute(ICharacter c)
        {
            c.AimWeaponUp();
        }
    }

    public class CommandAimDown : Command
    {
        public override void Execute(ICharacter c)
        {
            c.AimWeaponDown();
        }
    }
}
