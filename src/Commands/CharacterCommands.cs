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
            : base("charge_weapon")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.ChargeWeapon();
        }
    }
    public class DepressWeaponCommand
        : Command
    {
        public DepressWeaponCommand()
            : base("depress_weapon")
        {
        }
        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.DepressWeapon();
        }
    }

    public class ElevateWeaponCommand
        : Command
    {
        public ElevateWeaponCommand() 
            : base("elevate_weapon")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.ElevateWeapon();
        }
    }

    public class FireWeaponCommand : Command
    {
        public FireWeaponCommand()
            : base("fire_weapon")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.FireWeapon();
        }
    }

    public class AwardMoney
    : Command
    {
        int _amount;
        public AwardMoney(int amount)
            : base("award")
        {
            _amount = amount;
        }

        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Money += _amount;
        }

    }
    public class MoveLeftCommand
        : Command
    {
        public MoveLeftCommand()
            : base("move_left")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.MoveLeft();
        }

    }
    public class MoveRightCommand : Command
    {
        public MoveRightCommand()
            : base("move_right")
        {
        }

        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.MoveRight();
        }
    }
    public class SwitchWeaponCommand
        : Command
    {
        public SwitchWeaponCommand()
            : base("switch_weapon")
        {
        }
        public override void Execute(A3RData a3RData)
        {
            a3RData.SelectedPlayer.Character.SwitchWeapon();
        }
    }
}
