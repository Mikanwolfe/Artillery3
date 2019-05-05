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
        ObserveSatellite,
        ObserveSatelliteStrike,
        EndTurn
    }
    public class Player : Entity, IStateComponent<PlayerState>
    {
        Character _character; //This may expand to include mutliple characters
        StateComponent<PlayerState> _state;
        ObserverComponent _observerComponent;
        double _observeDelay;

        public Player(string name, World world)
            : base(name)
        {
            //The world is always an observer for the player.
            _state = new StateComponent<PlayerState>(PlayerState.Idle);
            _observeDelay = 0;
            
        }

        public Player(string name)
            : base(name)
        {
            _state = new StateComponent<PlayerState>(PlayerState.Idle);
            _observeDelay = 0;
        }

        public void SetWorld(World world)
        {
            _observerComponent = new ObserverComponent();
            _observerComponent.AddObserver(world.ObserverInstance);
            _observerComponent.AddObserver(UserInterface.Instance.ObserverInstance);
        }

        public float WeaponChargePercentage
        {
            get
            {
                return _character.WeaponChargePercentage;
            }
        }

        public void CharacterFired(Projectile projectile, Character parent)
        {
            SwitchState(PlayerState.ObserveProjectile);
            _observerComponent.Notify(projectile, ObserverEvent.PlayerFiredProjectile);
        }

        public bool isCharAlive
        {
            get
            {
                return _character.isAlive;
            }
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

            if (state == PlayerState.EndTurn)
            {
                _observerComponent.Notify(this, ObserverEvent.PlayerEndedTurn);
            }

            switch (_state.Peek())
            {

                case PlayerState.Idle:
                    if(state == PlayerState.ObserveProjectile)
                    {
                        _observeDelay = Constants.CameraAfterExplosionDelay;
                    }

                    break;
                case PlayerState.ObserveProjectile:
                    if (state == PlayerState.ObserveSatellite)
                        _observerComponent.Notify(this, ObserverEvent.FocusOnSatellite);
                        _observeDelay = Constants.CameraAfterExplosionDelay * 1.2;
                    break;

                case PlayerState.ObserveSatellite:
                    if (state == PlayerState.ObserveSatelliteStrike)
                        _observerComponent.Notify(this, ObserverEvent.FocusOnSatelliteStrike);
                        _observerComponent.Notify(this, ObserverEvent.FireSatellite);
                        _observeDelay = Constants.CameraAfterExplosionDelay * 1.2;
                    break;

                case PlayerState.ObserveSatelliteStrike:
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

            if ((PeekState() == PlayerState.ObserveSatellite) || (PeekState() == PlayerState.ObserveSatelliteStrike))
                _observeDelay -= 0.1;

            switch (PeekState())
            {
                //Idle --> ObvsProj is an event

                case PlayerState.Idle:

                    if (_character.PeekState() == CharacterState.Firing)
                    {
                        _observerComponent.Notify(this, ObserverEvent.PlayerIsChargingWeapon);

                    }

                    if (_character.PeekState() == CharacterState.Dead)
                    {
                        SwitchState(PlayerState.EndTurn);

                    }


                    break;


                case PlayerState.ObserveProjectile:
                    if (_observeDelay < 0)                                                                                                                 
                    {
                        if (_character.PeekState() == CharacterState.EndTurn)
                        {
                            if (_character.UsesSatellite)
                            {
                                SwitchState(PlayerState.ObserveSatellite);
                            } else
                            {
                                SwitchState(PlayerState.EndTurn);
                            }
                            
                        } else
                        {
                            _observerComponent.Notify(this, ObserverEvent.FocusOnPlayer);
                            SwitchState(PlayerState.Idle);
                        }
                    }
                    break;

                case PlayerState.ObserveSatellite:
                    if (_observeDelay < 0)
                    {
                        SwitchState(PlayerState.ObserveSatelliteStrike);
                    }
                    break;

                case PlayerState.ObserveSatelliteStrike:
                    if (_observeDelay < 0)
                    {
                        SwitchState(PlayerState.EndTurn);
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
