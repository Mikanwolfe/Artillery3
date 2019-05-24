using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class MoveLeftCommand
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
