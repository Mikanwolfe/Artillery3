using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IPlayer : ICharacter
    {
        IInputMethod InputMethod { get; set; }
    }
    public class Player : ICharacter, IPlayer
    {


        #region Fields
        ICharacter _character;
        IInputMethod _inputMethod;
        string _playerName;
        #endregion

        #region Constructor
        public Player(string playerName, IInputMethod inputMethod)
        {
            _playerName = playerName;  
            _inputMethod = inputMethod;
        }


        #endregion

        #region Methods
        #endregion

        #region Properties
        public ICharacter Character { get => _character; set => _character = value; }
        public IInputMethod InputMethod { get => _inputMethod; set => _inputMethod = value; }

        public void AimWeaponDown()
        {
            _character.AimWeaponDown();
        }

        public void AimWeaponUp()
        {
            _character.AimWeaponUp();
        }

        public void ChargeWeapon()
        {
            _character.ChargeWeapon();
        }

        public void Fire()
        {
            _character.Fire();
        }

        public void MoveLeft()
        {
            _character.MoveLeft();
        }

        public void MoveRight()
        {
            _character.MoveRight();
        }

        public void MoveToPosition(Vector pos)
        {
            _character.MoveToPosition(pos);
        }

        public void NewTurn()
        {
            _character.NewTurn();
        }

        public void SwitchWeapon()
        {
            _character.SwitchWeapon();
        }
        #endregion


    }
}
