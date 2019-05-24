using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
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

    public class Weapon : IWeapon, IDrawableComponent
    {

        #region Fields
        StateComponent<WeaponState> _stateComponent;
        IDrawableComponent _drawableComponent;

        float _weaponAngle = 0;
        float _minWepAngleRad = 0;
        float _maxWepAngleRad = 0;
        float _relativeAngle = 0;
        float _weaponCharge = 0;
        float _weaponMaxCharge = 50;
        bool _isAutoloader = false;
        bool _usesSatellite;
        int _autoloaderClip = 2;
        int _autoloaderAmmoLeft;

        Vector _lastProjectilePosition;

        ProjectileFactory _projectileFactory;

        #endregion

        #region Constructor
        public Weapon(string naame, IWeapon parent)
        {
            
        }
        #endregion

        #region Methods
        public void Charge()
        {
            throw new NotImplementedException();
        }

        public void DepressWeapon()
        {
            throw new NotImplementedException();
        }

        public void Draw()
        {
            _drawableComponent.Draw();
        }

        public void DrawSight()
        {
            throw new NotImplementedException();
        }

        public void ElevateWeapon()
        {
            throw new NotImplementedException();
        }

        public void Fire()
        {
            throw new NotImplementedException();
        }
        #endregion

        #region Properties
        public Vector Pos => _drawableComponent.Pos;
        #endregion
    }
}
