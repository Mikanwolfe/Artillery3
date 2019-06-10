using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public interface IWeapon
    {
        void Fire();
        void Charge();
        void DrawSight();
        void ElevateWeapon();
        void DepressWeapon();
    }

    enum WeaponState
    {
        IdleState,
        ChargingState,
        FireState,
    }

    /*
     * Normally Weapon should be an EntityAssembly since it contains
     * entities but here, it contains only one entity. It *must* contain one SightComponent entity.
     * Hence, a special kind of entity called Weapon contains only one SightComponent entity with
     *  manaual implementation to update the position and direction of sight.
     * 
     */

    public class Weapon : Entity, IWeapon
    {
        //Entity has position and direction, however
        // it needs to know the relative angle for drawing itself and the sight.
        // No wait, entities need to know about relative direction anyway. e.g. shields.


        Bitmap _bitmap;
        Sprite _sprite;

        Projectile _mainProjectile;

        WeaponState _state;
        WeaponState _previousState;

        /*
         * Concept of Offset Position:
         * 
         * <-  O    X <-- Weapon drawn behind character.
         *    /I/           Relative is calculated using offset, changes depending on Physics.Facing
         *    / \           Need to define base position for offset.
         */
        Point2D _offsetPosition;    //Used to calculate relative position to character.
        Point2D _projectileSpawnOffset; //directional, can be set.


        float _weaponAngle = 0;
        float _minWepAngleRad = 0;
        float _maxWepAngleRad = 0;
        float _relativeAngle = 0 ;
        float _weaponCharge = 0;
        float _weaponMaxCharge = 50;
        float _previousCharge = 0;
        float _baseDamage = 100;
        bool _isAutoloader = true; //Autoloader, not AutoLoader. Look it up.
        bool _usesSatellite;
        int _autoloaderClip = 2;
        int _autoloaderAmmoLeft;
        Point2D _projectilePos;
        Point2D _projectileVel;
        Point2D _lastProjectilePosition;

        int _projectilesFiredPerTurn = 1;

        ProjectileType _projectileType;

        ProjectileFactory _projectileFactory;


        public Weapon (string name, float minWepAngleDeg, float maxWepAngleDeg, ProjectileType projectileType)
            : base(name)
        {
            _weaponCharge = 0;
            _state = WeaponState.IdleState;
            _projectileSpawnOffset = new Point2D()
            {
                X = 0,
                Y = -5
            };
            _projectileType = projectileType;
            _projectileFactory = new ProjectileFactory(_projectileType);
            _minWepAngleRad = Rad(minWepAngleDeg);
            _maxWepAngleRad = Rad(maxWepAngleDeg);
            _weaponAngle = _minWepAngleRad;
            _usesSatellite = false;
            
        }
        
        public Projectile MainProjectile
        {
            get => _mainProjectile;
        }

        public void LastProjectilePosition(Projectile p, Point2D pos)
        {
            if (p == MainProjectile)
                _lastProjectilePosition = pos;
        }

        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }
        public bool IsAutoloader { get => _isAutoloader; set => _isAutoloader = value; }
        public int AutoloaderClip { get => _autoloaderClip; set => _autoloaderClip = value; }
        public int AutoloaderAmmoLeft { get => _autoloaderAmmoLeft; }

        public float WeaponChargePercentage
        {
            get
            {
                return _weaponCharge / _weaponMaxCharge;
            }
        }

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
                    if(_autoloaderAmmoLeft <= 0)
                        return true;

                return false;
            }
        }

        public Point2D LastProjPos { get => _lastProjectilePosition; set => _lastProjectilePosition = value; }
        public Point2D ProjectilePos { get => _projectilePos; set => _projectilePos = value; }
        public Point2D ProjectileVel { get => _projectileVel; set => _projectileVel = value; }
        public bool UsesSatellite { get => _usesSatellite; set => _usesSatellite = value; }
        public float BaseDamage { get => _baseDamage; set => _baseDamage = value; }
        public int ProjectilesFiredPerTurn { get => _projectilesFiredPerTurn; set
            {
                _projectilesFiredPerTurn = value;
                _projectileFactory.ProjectilesFiredPerTurn = value;
            }

        }

        public void DepressWeapon()
        {
            _weaponAngle = Clamp(_weaponAngle - Rad(1f), _minWepAngleRad, _maxWepAngleRad);
        }
        public void ElevateWeapon()
        {
            _weaponAngle = Clamp(_weaponAngle + Rad(1f), _minWepAngleRad, _maxWepAngleRad);
        }

        public void Charge()
        {
            _state = WeaponState.ChargingState;
        }

        public void Reload()
        {
            _autoloaderAmmoLeft = _autoloaderClip;
        }

        public void Fire()
        {
            AimWeapon();
            FireProjectile();
        }

        public virtual void AimWeapon()
        {
            _state = WeaponState.FireState;
            _projectileVel = new Point2D()
            {
                X = (float)(_weaponCharge * Math.Cos(_weaponAngle + _relativeAngle)),
                Y = -1 * (float)(_weaponCharge * Math.Sin(_weaponAngle + _relativeAngle)),
            };
            if (Direction == FacingDirection.Left)
                _projectileVel.X *= -1;

            _projectilePos = new Point2D()
            {
                X = _projectileSpawnOffset.X + Pos.X,
                Y = _projectileSpawnOffset.Y + Pos.Y
            };

            _previousCharge = _weaponCharge;
            _weaponCharge = 0;

            if (_isAutoloader)
            {
                _autoloaderAmmoLeft--;
            }

            _state = WeaponState.IdleState;
        }

        public virtual void FireProjectile()
        {
            //Projectile projectile = new Projectile(Name + " Projectile", this, _projectilePos, _projectileVel, _baseDamage, 15, 35);
            _mainProjectile = _projectileFactory.FireProjectile(this, _projectilePos, _projectileVel, _baseDamage, 15, 35);
        }

        public void SetProjectile(Projectile projectile)
        {
            //_mainProjectile = projectile;
        }
        

        public override void Draw()
        {
            
        }

        public void DrawAutoloaderClip()
        {
            if(_isAutoloader)
            {
                if (_sprite == null)
                {
                    int xOffset = -30;
                    if (Direction == FacingDirection.Left)
                        xOffset *= -1;

                    int yOffset = -10;

                    for (int i = 0; i < _autoloaderClip; i++)
                    {
                        SwinGame.FillCircle(Color.Black, Pos.X + xOffset, Pos.Y + yOffset + 12 * i, 4);
                    }

                    for (int i = 0; i < _autoloaderAmmoLeft; i++)
                    {
                        SwinGame.FillCircle(Color.LightSkyBlue, Pos.X + xOffset, Pos.Y + yOffset + 12 * i, 3);
                    }
                }
            }
        }

        public void DrawSight()
        {
            if (Direction == FacingDirection.Right)
            {
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_minWepAngleRad + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_minWepAngleRad + _relativeAngle));
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle));

                SwinGame.DrawLine(Color.Red, Pos.X + 10 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_weaponAngle + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_weaponAngle + _relativeAngle));
            }
            else
            {
                SwinGame.DrawLine(Color.Black, Pos.X - 10 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_minWepAngleRad + _relativeAngle), Pos.X - 30 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_minWepAngleRad + _relativeAngle));
                SwinGame.DrawLine(Color.Black, Pos.X - 10 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle), Pos.X - 30 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle));

                SwinGame.DrawLine(Color.Red, Pos.X - 10 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_weaponAngle + _relativeAngle), Pos.X - 30 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_weaponAngle + _relativeAngle));
            }

            DrawAutoloaderClip();
        }

        public override void Update()
        {
            _projectileFactory.Update();
            

            _previousState = _state;


            switch (_state)
            {
                case WeaponState.IdleState:
                    break;

                case WeaponState.ChargingState:
                    _weaponCharge += Constants.WeaponChargeSpeed;
                    if (_weaponCharge > _weaponMaxCharge)
                        _weaponCharge = _weaponMaxCharge;
                    break;

                case WeaponState.FireState:
                    break;
            }


            if (Direction == FacingDirection.Right)
                _relativeAngle = AbsoluteAngle;
            else
                _relativeAngle = AbsoluteAngle * -1;

        }


    }
}
