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

        #region Fields
        Character _character;
        StateComponent<PlayerState> _state;
        SubjectComponent _subjectComponent;
        IInputMethod _inputMethod;
        double _observeDelay = 0;
        private int money;
        #endregion

        #region Constructor
        public Player(string name, IInputMethod inputMethod)
            : base(name)
        {
            _inputMethod = inputMethod;
            _state = new StateComponent<PlayerState>(PlayerState.Idle);
        }
        #endregion

        #region Methods
        public void LinkCombatState(CombatGameState combatGameState)
        {
            _subjectComponent = new SubjectComponent();
            _subjectComponent.AddObserver(combatGameState.ObserverInstance);
        }



        public void CharacterFired(Projectile projectile, Character parent)
        {
            SwitchState(PlayerState.ObserveProjectile);
            _subjectComponent.Notify(projectile, ObserverEvent.PlayerFiredProjectile);
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

        public void SwitchState(PlayerState state)
        {
            // State machine transition code goes here

            if (state == PlayerState.EndTurn)
            {
                _subjectComponent.Notify(this, ObserverEvent.PlayerEndedTurn);
            }

            switch (_state.Peek())
            {

                case PlayerState.Idle:
                    if (state == PlayerState.ObserveProjectile)
                    {
                        _observeDelay = Constants.CameraAfterExplosionDelay;
                    }

                    break;
                case PlayerState.ObserveProjectile:
                    if (state == PlayerState.ObserveSatellite)
                        _subjectComponent.Notify(this, ObserverEvent.FocusOnSatellite);
                    _observeDelay = Constants.CameraAfterExplosionDelay * 1.2;
                    break;

                case PlayerState.ObserveSatellite:
                    if (state == PlayerState.ObserveSatelliteStrike)
                        _subjectComponent.Notify(this, ObserverEvent.FocusOnSatelliteStrike);
                    _subjectComponent.Notify(this, ObserverEvent.FireSatellite);
                    _observeDelay = Constants.CameraAfterExplosionDelay * 1.2;
                    break;

                case PlayerState.ObserveSatelliteStrike:
                    //if (state == PlayerState.EndTurn)
                        //_subjectComponent.Notify(this, ObserverEvent.PlayerEndedTurn);
                    break;
            }


            _state.Switch(state);

        }

        public void SetXPosition(int x)
        {
            _character.SetXPosition(x);
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
                        _subjectComponent.Notify(this, ObserverEvent.PlayerIsChargingWeapon);

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
                            }
                            else
                            {
                                SwitchState(PlayerState.EndTurn);
                            }

                        }
                        else
                        {
                            _subjectComponent.Notify(this, ObserverEvent.FocusOnPlayer);
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

        #endregion

        #region Properties
        public Character Character { get => _character; set => _character = value; }
        public IInputMethod InputMethod { get => _inputMethod; set => _inputMethod = value; }
        public bool IsAlive => _character.isAlive;
        public new Point2D Pos => Character.Pos;
        public float PreviousWeaponCharge => _character.PreviousWeaponChargePercentage;
        public float WeaponChargePercentage => _character.WeaponChargePercentage;

        public int Money { get => money; set => money = value; }

        #endregion

    }

}
