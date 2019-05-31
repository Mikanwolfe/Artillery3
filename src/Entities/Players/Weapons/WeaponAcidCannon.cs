using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    class WeaponAcidCannon : Weapon
    {

        public WeaponAcidCannon(float minWepAngleDeg, float maxWepAngleDeg) 
            : base("Acid Cannon", minWepAngleDeg, maxWepAngleDeg, ProjectileType.Shell)
        {
            UsesSatellite = true;
        }

        public override void FireProjectile()
        {
            Projectile projectile = new AcidProjectile(Name + " Projectile", this, ProjectilePos, ProjectileVel);
            SetProjectile(projectile);
        }
    }
}
