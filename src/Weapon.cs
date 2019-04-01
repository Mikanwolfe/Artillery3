using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    interface IWeapon
    {
        List<Projectile> Ammunition { get; set; }
        SightComponent Sight { get; set; }
        void Fire(float power, float relativeAngle, FacingDirection direction);

    }


    class Weapon : Entity
    {
        public Weapon(string name) : base(name)
        {
        }

        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }

        public override void Draw()
        {
            throw new NotImplementedException();
        }

        public override void Update()
        {
            throw new NotImplementedException();
        }
    }
}
