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
        void Fire(float power, float relativeAngle, FacingDirection direction);

    }


    class Weapon : Entity
    {
        FacingDirection _parentDirection;
        Point2D _parentPos;
        public Weapon(string name, FacingDirection parentDirection, Point2D parentPos) : base(name)
        {
            _parentDirection = parentDirection; //These should pass as references, I hope.
            _parentPos = parentPos; // it doesn't
        }

        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }

        public override void Draw()
        {
            if(_parentDirection == FacingDirection.Right)
            {
                SwinGame.DrawLine(Color.Black, _parentPos.X, _parentPos.Y, _parentPos.X + 10, _parentPos.Y);
            } else
            {
                SwinGame.DrawLine(Color.Black, _parentPos.X, _parentPos.Y, _parentPos.X - 10, _parentPos.Y);
            }

            Console.WriteLine("Parent Direction: " + _parentDirection);
            Console.WriteLine("Parent Pos: " + _parentPos);
        }

        public override void Update()
        {
        }
    }
}
