using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public enum ProjectileType
    {
        Shell,
        MachineGun,
        Missile
    }

    public class ProjectileFactory
    {
        ProjectileType _projectileType;


        public ProjectileFactory(ProjectileType projectileType)
        {
            _projectileType = projectileType;





        }

        public Projectile FireProjectile(Weapon parentWeapon, Point2D projectilePos, Point2D projectileVel, float damage, float explRad, float damageRad)
        {

            Projectile mainProjectile;
            Projectile secondaryProjectile;

            switch (_projectileType)
            {
                case ProjectileType.Shell:

                    mainProjectile = new Projectile(parentWeapon.Name + "Shell", parentWeapon, 
                        projectilePos, projectileVel, damage, explRad, damageRad);

                    return mainProjectile;

                case ProjectileType.MachineGun:


                    mainProjectile = new Projectile(parentWeapon.Name +  "Machinegun Round", parentWeapon, 
                        projectilePos, projectileVel, damage, explRad, damageRad);

                    secondaryProjectile = new Projectile(parentWeapon.Name + "Machinegun Round", parentWeapon,
                        projectilePos, projectileVel, damage, explRad, damageRad);

                    secondaryProjectile = new Projectile(parentWeapon.Name + "Machinegun Round", parentWeapon,
                        projectilePos, projectileVel, damage, explRad, damageRad);

                    return mainProjectile;







            }

            return null;
        }
    }
}
