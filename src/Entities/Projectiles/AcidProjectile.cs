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
        public AcidProjectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel)
            : base(name, parentWeapon, pos, vel, 0, 12, 1)
        {

        }



        public override void Explode(Point2D pt)
        {
            BlowUpTerrain(pt);
            Artillery3R.Services.ParticleEngine.CreateAcidExplosion(pt, 100);
        }

    }
}
