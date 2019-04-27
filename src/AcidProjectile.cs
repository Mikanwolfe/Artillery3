using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    public class AcidProjectile : Projectile
    {
        public AcidProjectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel)
            : base(name, parentWeapon, pos, vel)
        {

        }

        public override void Explode()
        {
            int width = ((int)ExplRad * Constants.BaseExplosionDiaScaling) - 1;
            float[] _crater = new float[(int)width];
            float _period = (float)Math.PI * 2 / width;

            for (int i = 0; i < width; i++)
            {
                _crater[i] = ExplRad * (float)(-1 * Math.Cos(_period * (i - Math.PI * 2)) + 1);
            }

            PhysicsEngine.Instance.BlowUpTerrain(_crater, Pos);
            ParticleEngine.Instance.CreateAcidExplosion(Pos, 80);
        }

    }
}
