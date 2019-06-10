using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class MoveRightCommand : Command
    {
        public MoveRightCommand()
        {
        }

        public override void Execute(Character c)
        {
            c.MoveRight();
        }
    }
}
