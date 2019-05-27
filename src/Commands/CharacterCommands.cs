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
        public ChargeWeaponCommand(Player p)
            : base(p, "charge_weapon")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            Player.Character.ChargeWeapon();
        }
    }
    public class DepressWeaponCommand
        : Command
    {
        public DepressWeaponCommand(Player p)
            : base(p, "depress_weapon")
        {
        }
        public override void Execute(A3RData a3RData)
        {
            Player.Character.DepressWeapon();
        }
    }

    public class ElevateWeaponCommand
        : Command
    {
        public ElevateWeaponCommand(Player p) 
            : base(p, "elevate_weapon")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            Player.Character.ElevateWeapon();
        }
    }

    public class FireWeaponCommand : Command
    {
        public FireWeaponCommand(Player p)
            : base(p, "fire_weapon")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            Player.Character.FireWeapon();
        }
    }
    public class MoveLeftCommand
        : Command
    {
        public MoveLeftCommand(Player p)
            : base(p, "move_left")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            Player.Character.MoveLeft();
        }

    }
    public class MoveRightCommand : Command
    {
        public MoveRightCommand(Player p)
            : base(p, "move_right")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            Player.Character.MoveRight();
        }
    }
    public class SwitchWeaponCommand
        : Command
    {
        public SwitchWeaponCommand(Player p)
            : base(p, "switch_weapon")
        {
        }
        public override void Execute(A3RData a3RData)
        {
            Player.Character.SwitchWeapon();
        }
    }
}
