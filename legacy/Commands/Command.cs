using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public abstract class Command
    {
        public Command() { }

        public abstract void Execute(Character c); // TODO change to entity and make specialised classes

    }
}
