using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    enum PlayerState
    {
        Idle,
        Finished
    }
    class Player : Entity, IStateComponent<PlayerState>
    {
        Character _character; //This may expand to include mutliple characters
        StateComponent<PlayerState> _state;
        ObserverComponent _observerComponent;

        public Player(string name)
            :base(name)
        {
            _state = new StateComponent<PlayerState>(PlayerState.Idle);

        }

        public Player(string name, World world)
            : this(name)
        {
            //The world is always an observer for the player.
            _observerComponent = new ObserverComponent();
            _observerComponent.AddObserver(world.ObserverInstance);
        }

        //Make this into SelectedCharacter with AddCharacter later? should i have AddCharacter now?
        public Character Character { get => _character; set => _character = value; }

        public void SwitchState(PlayerState state)
        {
            // State machine transition code goes here

            
            switch (_state.Peek())
            {
                case PlayerState.Idle:
                    if(state == PlayerState.Finished)
                    {
                        if(_observerComponent != null)
                            _observerComponent.Notify(this, ObserverEvent.PlayerEndedTurn);

                    }

                    break;
            }


            _state.Switch(state);

        }

        public override void Draw()
        {
            _character.DrawSight();
            SwinGame.DrawText("PlayerState: " + _state.Peek(), Color.Black, 50, 50);
            SwinGame.DrawText("CharacterState: " + _character.PeekState(), Color.Black, 50, 60);
        }

        public override void Update()
        {

            //change this to reflect mutliple chars later
            if (_character.PeekState() == CharacterState.Finished)
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
