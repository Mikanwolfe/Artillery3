using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    interface IWeapon
    {
        List<Projectile> Ammunition { get; set; }
        void Fire();

    }

    /*
     * Normally Weapon should be an EntityAssembly since it contains
     * entities but here, it contains only one entity. It *must* contain one SightComponent entity.
     * Hence, a special kind of entity called Weapon contains only one SightComponent entity with
     *  manaual implementation to update the position and direction of sight.
     * 
     */

    class Weapon : Entity, IWeapon
    {
        //Entity has position and direction, however
        // it needs to know the relative angle for drawing itself and the sight.
        // No wait, entities need to know about relative direction anyway. e.g. shields.


        Bitmap _bitmap;
        List<Projectile> _ammunition;
        float _weaponAngle, _minWepAngleRad, _maxWepAngleRad;
        float _relativeAngle;

        public Weapon(string name) : base(name)
        {
            _ammunition = new List<Projectile>();
            _minWepAngleRad = 0;
            _maxWepAngleRad = 0;
            _weaponAngle = _minWepAngleRad;
        }

        public Weapon (string name, float minWepAngleDeg, float maxWepAngleDeg)
            :base(name)
        {
            _ammunition = new List<Projectile>();
            _minWepAngleRad = minWepAngleDeg;
            _maxWepAngleRad = maxWepAngleDeg;
            _weaponAngle = _minWepAngleRad;
        }
        
        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }
        List<Projectile> IWeapon.Ammunition { get => _ammunition; set => _ammunition = value; }
        
        public override void Draw()
        {
            if(Direction == FacingDirection.Right)
            {
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float) Math.Cos(_relativeAngle), Pos.Y - 10 * (float)Math.Sin(_relativeAngle), Pos.X + 30 * (float)Math.Cos(_relativeAngle), Pos.Y - 30 * (float)Math.Sin(_relativeAngle));
            } else
            {
                SwinGame.DrawLine(Color.Black, Pos.X + 10, Pos.Y, Pos.X - 10, Pos.Y);
            }

            SwinGame.DrawText("Weapon direction: " + Deg(_relativeAngle),Color.Black, 50, 90);
        }

        public void Fire()
        {
            throw new NotImplementedException();
        }

        public override void Update()
        {
            if (Direction == FacingDirection.Right)
                _relativeAngle = AbsoluteAngle;
            else
                _relativeAngle = AbsoluteAngle * -1;

        }


    }
}
