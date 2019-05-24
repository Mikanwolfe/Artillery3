using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{

    public interface IInputHandler
    {
        void HandleInput(A3Data a3Data);
    }
    public class InputHandler : IInputHandler
    {

        private Dictionary<KeyCode, ICommand> _keyToCommands;
        private List<KeyCode> _registeredKeys;

        public InputHandler()
        {
            _keyToCommands = new Dictionary<KeyCode, ICommand>();// Newtonsoft should be able to (de)serialise this
            _registeredKeys = new List<KeyCode>();
            //For now, we'll do this:

            _keyToCommands.Add(KeyCode.RightKey, new CommandMoveRight());
            _keyToCommands.Add(KeyCode.LeftKey, new CommandMoveLeft());
            _keyToCommands.Add(KeyCode.UpKey, new CommandAimUp());
            _keyToCommands.Add(KeyCode.DownKey, new CommandAimDown());

            foreach (KeyValuePair<KeyCode, ICommand> entry in _keyToCommands)
            {
                _registeredKeys.Add(entry.Key);
            }
        }

        public void HandleInput(A3Data a3Data) //yes that means we can only handle one command at a time.
        {
            foreach (KeyCode k in _registeredKeys)
            {
                if (SwinGame.KeyDown(k))
                {
                    if (a3Data.SelectedPlayer != null)
                        _keyToCommands[k].Execute(a3Data.SelectedPlayer);
                    else
                        throw new MissingMemberException("selectedPlayer not found", "a3Data.SelectedPlayer");
                    //We can fix this later
                }


            }
            
        }
    }
}
