using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    public enum PlayerState
    {
        NotSelected,
        Idle,
        ObserveProjectile,
        EndTurn
    }
    public class Player : Entity, IStateComponent<PlayerState>
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
            SwitchState(PlayerState.ObserveProjectile);
            _observerComponent.Notify(projectile, ObserverEvent.PlayerFiredProjectile);
        }

        public void NewTurn()
        {
            _character.NewTurn();
        }

        public void Initiallise()
        {
            _character.SetFiringNotif(CharacterFired);
            _character.Initialise();
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
                    if (state == PlayerState.EndTurn)
                        _observerComponent.Notify(this, ObserverEvent.PlayerEndedTurn);
                    break;
            }


            _state.Switch(state);

        }

        public override void Draw()
        {
            _character.DrawSight();
        }

        public override void Update()
        {
            if ((PeekState() == PlayerState.ObserveProjectile) && !_character.MainProjectile.Enabled)
                _observeDelay -= 0.1;

            switch (PeekState())
            {
                //Idle --> ObvsProj is an event


                case PlayerState.ObserveProjectile:
                    if (_observeDelay < 0)                                                                                                                 
                    {
                        if (_character.PeekState() == CharacterState.EndTurn)
                        {
                            SwitchState(PlayerState.EndTurn);
                        } else
                        {
                            _observerComponent.Notify(this, ObserverEvent.FocusOnPlayer);
                            SwitchState(PlayerState.Idle);
                        }
                    }
                    break;

                
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
