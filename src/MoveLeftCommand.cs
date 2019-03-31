using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    class MoveLeftCommand
        : Command
    {
        public MoveLeftCommand()
        {
        }

        public override void Execute(Character c)
        {
            c.MoveLeft();
        }

    }
}
