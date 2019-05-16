using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class ChargeWeaponCommand
    : Command
    {
        public ChargeWeaponCommand()
        {
        }

        public override void Execute(Character c)
        {
            c.ChargeWeapon();
        }
    }
}
