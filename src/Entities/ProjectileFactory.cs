using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static Artillery.Utilities;

namespace Artillery
{

    public enum ProjectileType
    {
        Shell,
        MachineGun,
        Missile
    }

    public interface IProjectileFactory
    {
        
    }
    public class ProjectileFactory
    {

        #region Fields
        ProjectileType _projectileType;

        int _projectilesLeftToFire;
        int _projectilesFiredPerTurn = 1;
        int _firingDelay = 15;
        int _firingCounter;

        Weapon _parentWeapon;
        Vector _projectilePos;
        Vector _projectileVel;
        float _damage;
        float _explRad;
        float _damageRad;
        #endregion

        #region Constructor
        public ProjectileFactory(ProjectileType projectileType)
        {
            _projectileType = projectileType;
            _projectilesLeftToFire = 0;
            _firingCounter = 0;
        }
        #endregion

        #region Methods

        public Projectile FireProjectile(Weapon parentWeapon, Vector projectilePos, Vector projectileVel, float damage, float explRad, float damageRad)
        {
            _parentWeapon = parentWeapon;
            _projectilePos = projectilePos;
            _projectileVel = projectileVel;
            _damage = damage;
            _explRad = explRad;
            _damageRad = damageRad;

            _projectilesLeftToFire = _projectilesFiredPerTurn;
            return FireProjectileSequence(_parentWeapon, _projectilePos, _projectileVel, _damage, _explRad, _damageRad);

        }

        public Projectile FireProjectileSequence(Weapon parentWeapon, Vector projectilePos, Vector projectileVel, float damage, float explRad, float damageRad)
        {
            _projectilesLeftToFire--;
            if (_projectilesLeftToFire > 0)
            {
                _firingCounter = _firingDelay;
            }
            Projectile mainProjectile;


            switch (_projectileType)
            {
                case ProjectileType.Shell:

                    mainProjectile = new Projectile( parentWeapon.Name + " Shell", parentWeapon,
                        projectilePos, projectileVel, damage, explRad, damageRad);


                    break;

                case ProjectileType.MachineGun:


                    mainProjectile = new Projectile(parentWeapon.Name + " Machinegun Round", parentWeapon,
                        projectilePos, projectileVel, damage, explRad, damageRad);
                    break;

                default:
                    mainProjectile = null;
                    break;


            }

            return mainProjectile;

        }
        #endregion

        #region Properties
        public int ProjectilesFiredPerTurn { get => _projectilesFiredPerTurn;
            set => _projectilesFiredPerTurn = value; }
        #endregion
    }
}
