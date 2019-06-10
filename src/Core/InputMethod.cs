using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    public interface IInputMethod
    {
        void HandleInput(A3RData a3RData);
    }

    public class AIInputMethod : IInputMethod
    {
        public AIInputMethod()
        {
        }

        public void HandleInput(A3RData a3RData)
        {
            a3RData.CommandStream.AddCommand(new MoveRightCommand());
        }
    }

    public class PlayerInputMethod : IInputMethod
    {

        private Dictionary<KeyCode, ICommand> _keyToCommands;
        private List<KeyCode> _registeredKeys;

        public PlayerInputMethod()
        {
            _keyToCommands = new Dictionary<KeyCode, ICommand>();// Newtonsoft should be able to (de)serialise this
            _registeredKeys = new List<KeyCode>();
            //For now, we'll do this:

            _keyToCommands.Add(KeyCode.RightKey, new MoveRightCommand());
            _keyToCommands.Add(KeyCode.LeftKey, new MoveLeftCommand());
            _keyToCommands.Add(KeyCode.UpKey, new ElevateWeaponCommand());
            _keyToCommands.Add(KeyCode.DownKey, new DepressWeaponCommand());
            _keyToCommands.Add(KeyCode.SpaceKey, new ChargeWeaponCommand());
            _keyToCommands.Add(KeyCode.SKey, new SwitchWeaponCommand());

            foreach (KeyValuePair<KeyCode, ICommand> entry in _keyToCommands)
            {
                _registeredKeys.Add(entry.Key);
            }
        }

        public void HandleInput(A3RData a3RData) //yes that means we can only handle one command at a time.
        {
            foreach (KeyCode k in _registeredKeys)
            {
                if (SwinGame.KeyDown(k))
                {
                    if (a3RData.SelectedPlayer != null)
                        //_keyToCommands[k].Execute(a3RData);
                        a3RData.CommandStream.AddCommand(_keyToCommands[k]);
                    else
                        throw new MissingMemberException("selectedPlayer not found", "a3Data.SelectedPlayer");
                    //We can fix this later
                }


            }

        }
    }
}
