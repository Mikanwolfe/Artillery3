using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class LaserTargetProjectile : Projectile
    {
        Laser _laserProjectile;
        Weapon _parentWeapon;
        public LaserTargetProjectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel, float damage, float explRad, float damageRad) 
            : base(name, parentWeapon, pos, vel, damage, explRad, damageRad)
        {
            _parentWeapon = parentWeapon;
            Damageable = false;
        }

        public override void Explode(Point2D pt)
        {

            SwinGame.PlaySoundEffect("laser_satellite");
            _laserProjectile 
                = new Laser(Name + "'s Laser", null, _parentWeapon.Pos, Pos, BaseDamage, ExplRad, DamageRad);
            _laserProjectile.Color = Artillery3R.Services.A3RData.RarityReference[_parentWeapon.Rarity];
            _laserProjectile.Color = SwinGame.RGBAColor(
               _laserProjectile.Color.R,
               _laserProjectile.Color.G,
               _laserProjectile.Color.B,
               100);
        }


    }
}
