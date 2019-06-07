using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class AcidProjectile : Projectile
    {
        public AcidProjectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel, float damage, float explRad, float damageRad) 
            : base(name, parentWeapon, pos, vel, damage, explRad, damageRad)
        {
        }

        public override void Explode(Point2D pt)
        {
            Artillery3R.Services.EntityManager.DamageEntities(this, BaseDamage, (int)DamageRad, pt);
            BlowUpTerrain(pt);
            PlayRandomExplosionSound();
            SwinGame.PlaySoundEffect("acid", 2);
            Artillery3R.Services.ParticleEngine.CreateAcidExplosion(pt, 100);
        }

    }
}
