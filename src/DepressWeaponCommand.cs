using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    class DepressWeaponCommand
        : Command
    {
        public override void Execute(Character c)
        {
            c.DepressWeapon();
        }
    }
}
