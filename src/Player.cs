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
        ObserveProjectile,
        Finished
    }
    class Player : Entity, IStateComponent<PlayerState>
    {
        Character _character; //This may expand to include mutliple characters
        StateComponent<PlayerState> _state;
        ObserverComponent _observerComponent;
        double _observeDelay;

        public Player(string name)
            :base(name)
        {
            _state = new StateComponent<PlayerState>(PlayerState.Idle);
            _observeDelay = 0;

        }

        public Player(string name, World world)
            : this(name)
        {
            //The world is always an observer for the player.
            _observerComponent = new ObserverComponent();
            _observerComponent.AddObserver(world.ObserverInstance);
        }

        public void CharacterFired(Projectile projectile, Character parent)
        {
            Console.WriteLine("Character has been fired -- Message from the Player class");
            _observerComponent.Notify(projectile, ObserverEvent.PlayerFiredProjectile);
        }

        public void Initiallise()
        {
            _character.SetFiringNotif(CharacterFired);
        }

        //Make this into SelectedCharacter with AddCharacter later? should i have AddCharacter now?
        public Character Character { get => _character; set => _character = value; }

        public void SwitchState(PlayerState state)
        {
            // State machine transition code goes here

            
            switch (_state.Peek())
            {
                case PlayerState.Idle:
                    
                    
                    if(state == PlayerState.ObserveProjectile)
                    {
                        _observeDelay = Constants.CameraAfterExplosionDelay;
                    }

                    break;
                case PlayerState.ObserveProjectile:

                    

                    

                    break;
            }


            _state.Switch(state);

        }

        public void CharacterFired()
        {
            Console.WriteLine("Player {0} has just been notified that {1} has fired!", Name, _character.Name);
        }

        public override void Draw()
        {
            _character.DrawSight();
            SwinGame.DrawText("PlayerState: " + _state.Peek(), Color.Black, 50, 50);
            SwinGame.DrawText("CharacterState: " + _character.PeekState(), Color.Black, 50, 60);
        }

        public override void Update()
        {
            if ((PeekState() == PlayerState.ObserveProjectile) && !_character.MainProjectile.Enabled)
                _observeDelay -= 0.1;


            switch (PeekState())
            {
                case PlayerState.ObserveProjectile:
                    if (_observeDelay < 0)
                    {
                        if (_observerComponent != null)
                            _observerComponent.Notify(this, ObserverEvent.PlayerEndedTurn);
                        _character.SwitchState(CharacterState.Idle);
                        SwitchState(PlayerState.Finished);
                    }
                    break;
            }

            //change this to reflect mutliple chars later
            if (_character.PeekState() == CharacterState.Finished)
            {
                SwitchState(PlayerState.ObserveProjectile);
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
