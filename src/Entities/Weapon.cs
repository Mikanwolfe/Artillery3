using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Artillery.Utilities;
using SwinGameSDK;

namespace Artillery
{
    public interface IWeapon
    {
        string Name { get; set; }
        Vector Pos { get; }
        Direction Direction { get; }
        float MinWepAngleRad { get; set; }
        float MaxWepAngleRad { get; set; }
        float WeaponAngle { get; set; }
        float RelativeAngle { get; set; }
        void Fire();
        void Charge();
        void DrawSight();
        void ElevateWeapon();
        void DepressWeapon();
        void Reload();
    }

    enum WeaponState
    {
        IdleState,
        ChargingState,
        FireState,
    }

    public class Weapon : IDrawableComponent, IUpdatable
    {

        #region Fields
        StateComponent<WeaponState> _stateComponent;
        IDrawableComponent _drawableComponent;
        DrawableSightComponent _SightComponent;
        string _name;

        float _weaponAngle = 0;
        float _minWepAngleRad = 0;
        float _maxWepAngleRad = 0;
        float _relativeAngle = 0;
        float _weaponCharge = 0;
        float _weaponMaxCharge = 50;
        float _previousCharge = 0;
        bool _isAutoloader = false;
        bool _usesSatellite;
        bool _enabled = false;
        int _autoloaderClip = 2;
        int _autoloaderAmmoLeft;

        Character _parent;

        Projectile _mainProjectile;

        Vector _lastProjectilePosition;

        ProjectileFactory _projectileFactory;

        ProjectileType _projectileType;

        /*
         * Concept of Offset Position:
         * 
         * <-  O    X <-- Weapon drawn behind character.
         *    /I/           Relative is calculated using offset, changes depending on Physics.Facing
         *    / \           Need to define base position for offset.
         */
        Vector _offsetPosition;    //Used to calculate relative position to character.
        Vector _projectileSpawnOffset; //directional, can be set.

        WeaponState _previousState;
        #endregion

        #region Constructor
        public Weapon(string name, Character parent, ProjectileType type)
        {
            _name = name;
            _weaponCharge = 0;
            _stateComponent = new StateComponent<WeaponState>(WeaponState.IdleState);
            _projectileSpawnOffset = new Vector(0, 5);
            _projectileType = type;
            _projectileFactory = new ProjectileFactory(type);
            _weaponAngle = _minWepAngleRad;
            _usesSatellite = false;
            _parent = parent;

            _drawableComponent = new DrawableComponent(this);
            _SightComponent = new DrawableSightComponent(this);
        }
        #endregion

        #region Methods
        public void Update()
        {
            _previousState = _stateComponent.PeekState();


            switch (_stateComponent.PeekState())
            {
                case WeaponState.IdleState:
                    break;

                case WeaponState.ChargingState:
                    _weaponCharge += Artillery.Constants.WeaponChargeSpeed;
                    if (_weaponCharge > _weaponMaxCharge)
                        _weaponCharge = _weaponMaxCharge;
                    break;

                case WeaponState.FireState:
                    break;
            }


            if (_parent.Direction == Direction.Right)
                _relativeAngle = (float)_parent.AbsAngle;
            else
                _relativeAngle = (float)_parent.AbsAngle * -1;
        }
        public void Charge()
        {
            _stateComponent.SwitchState(WeaponState.ChargingState);
        }

        public void DepressWeapon()
        {
            _weaponAngle = Clamp(_weaponAngle - Rad(1f), _minWepAngleRad, _maxWepAngleRad);
        }

        public void Draw()
        {
            _drawableComponent.Draw();
        }

        public void DrawSight()
        {
            _drawableComponent.Draw();
        }

        public void ElevateWeapon()
        {
            _weaponAngle = Clamp(_weaponAngle + Rad(1f), _minWepAngleRad, _maxWepAngleRad);
        }

        public void Fire()
        {
            throw new NotImplementedException();
        }

        public void SetLastProjectilePosition(Projectile p, Point2D pos)
        {
            if (p == MainProjectile)
                _lastProjectilePosition = Pos;
        }

        public void Reload()
        {
            _autoloaderAmmoLeft = _autoloaderClip;
        }
        #endregion

        #region Properties

        public float PreviousWeaponChargePercentage
        {
            get
            {
                return _previousCharge / _weaponMaxCharge;
            }
        }


        public bool AutoloaderFired
        {
            get
            {
                if (_isAutoloader)
                    if (_autoloaderAmmoLeft < _autoloaderClip)
                        return true;

                return false;
            }
        }
        public bool AutoloaderFinishedFiring
        {
            get
            {
                if (_isAutoloader)
                    if (_autoloaderAmmoLeft <= 0)
                        return true;

                return false;
            }
        }
        public Vector Pos => _parent.Pos;
        public string Name { get => _name; set => _name = value; }
        public float MinWepAngleRad { get => _minWepAngleRad; set => _minWepAngleRad = value; }
        public float MaxWepAngleRad { get => _maxWepAngleRad; set => _maxWepAngleRad = value; }
        public bool UsesSatellite { get => _usesSatellite; set => _usesSatellite = value; }
        public Projectile MainProjectile { get => _mainProjectile; set => _mainProjectile = value; }
        public bool Enabled { get => _enabled; set => _enabled = value; }
        public Direction Direction { get => _parent.Direction; }
        public float WeaponAngle { get => _weaponAngle; set => _weaponAngle = value; }
        public float RelativeAngle { get => _relativeAngle; set => _relativeAngle = value; }
        public bool IsAutoloader { get => _isAutoloader; set => _isAutoloader = value; }
        #endregion
    }
}
