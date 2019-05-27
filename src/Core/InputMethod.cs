using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using Hatsuyuki.Core;

namespace ArtillerySeries.src
{

    public abstract class InputMethod
    {
        A3RData _a3RData;
        Player _player;
        public InputMethod(Player _player, A3RData a3RData)
        {
            _a3RData = a3RData;
        }

        public A3RData A3RData { get => _a3RData; set => _a3RData = value; }

        public abstract void HandleInput();
    }




    public class AIInputMethod : InputMethod
    {
        Command _defaultCommand;
        public AIInputMethod(Player _player, A3RData a3RData)
            : base(_player, a3RData)
        {
            _defaultCommand = new MoveRightCommand(_player);
        }

        public override void HandleInput()
        {
            A3RData.CommandStream.AddCommand(_defaultCommand);
        }
    }

    public class PlayerInputMethod : InputMethod
    {

        private Dictionary<KeyCode, ICommand> _keyToCommands;
        private List<KeyCode> _registeredKeys;


        public PlayerInputMethod(Player _player, A3RData a3RData)
            : base(_player, a3RData)
        {
            _keyToCommands = new Dictionary<KeyCode, ICommand>();// Newtonsoft should be able to (de)serialise this
            _registeredKeys = new List<KeyCode>();

            _keyToCommands.Add(KeyCode.RightKey, new MoveRightCommand(_player));
            _keyToCommands.Add(KeyCode.LeftKey, new MoveLeftCommand(_player));
            _keyToCommands.Add(KeyCode.UpKey, new ElevateWeaponCommand(_player));
            _keyToCommands.Add(KeyCode.DownKey, new DepressWeaponCommand(_player));
            _keyToCommands.Add(KeyCode.SpaceKey, new ChargeWeaponCommand(_player));
            _keyToCommands.Add(KeyCode.SKey, new SwitchWeaponCommand(_player));

            foreach (KeyValuePair<KeyCode, ICommand> entry in _keyToCommands)
            {
                _registeredKeys.Add(entry.Key);
            }
        }

        public override void HandleInput()
        {
            foreach (KeyCode k in _registeredKeys)
            {
                if (SwinGame.KeyDown(k))
                {
                    if (A3RData.SelectedPlayer != null)
                        //_keyToCommands[k].Execute(a3RData);
                        A3RData.CommandStream.AddCommand(_keyToCommands[k]);
                    else
                        throw new MissingMemberException("selectedPlayer not found", "a3Data.SelectedPlayer");
                }
            }
        }
    }
}
