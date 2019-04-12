using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    enum PlayerState
    {
        Idle,
        Finished
    }
    class Player : UpdatableObject, IStateComponent<PlayerState>
    {
        string _name;
        Character _character; //This may expand to include mutliple characters
        StateComponent<PlayerState> _state;

        public Player(string name)
        {
            _name = name;
            _state = new StateComponent<PlayerState>(PlayerState.Idle);
        }

        public Player(string name, Character character)
            :this(name)
        {
            _character = character;
        }

        //Make this into SelectedCharacter with AddCharacter later? should i have AddCharacter now?
        public Character Character { get => _character; set => _character = value; }

        public void SwitchState(PlayerState state)
        {
            // State machine transition code goes here


        }

        public override void Update()
        {
            //change this to reflect mutliple chars later
            if (Character.PeekState() == CharacterState.Finished)
            {
                SwitchState(PlayerState.Finished);
            } else
            {
                SwitchState(PlayerState.Idle);
            }
        }

        public PlayerState PeekState()
        {
            return _state.Peek();
        }

        public PlayerState PopState()
        {
            return _state.Pop();
        }

        public void PushState(PlayerState state)
        {
            _state.Push(state);
        }
    }
}
