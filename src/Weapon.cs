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
        SightComponent Sight { get; set; }
        void Fire(float relativeAngle);

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
        SightComponent _sight;
        List<Projectile> _ammunition;

        public Weapon(string name) : base(name)
        {
            _ammunition = new List<Projectile>();
            _sight = new SightComponent(name + " sight");
        }
        
        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }
        SightComponent IWeapon.Sight { get => _sight; set => _sight = value; }
        List<Projectile> IWeapon.Ammunition { get => _ammunition; set => _ammunition = value; }
        
        public override void Draw()
        {
            if(Direction == FacingDirection.Right)
            {
                SwinGame.DrawLine(Color.Black, Pos.X, Pos.Y, Pos.X + 10, Pos.Y);
            } else
            {
                SwinGame.DrawLine(Color.Black, Pos.X, Pos.Y, Pos.X - 10, Pos.Y);
            }
        }

        public void Fire(float relativeAngle)
        {
            throw new NotImplementedException();
        }

        public override void Update()
        {
        }

        public override void UpdatePosition(Point2D pos, FacingDirection direction)
        {
            _sight.Direction = direction;
            _sight.Pos = pos;
            base.UpdatePosition(pos, direction);
        }
    }
}
