using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IPlayer
    {
        IInputMethod InputMethod { get; set; }
        ICharacter Character { get; set; }
    }
    public class Player : IPlayer
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

        #endregion


    }
}
