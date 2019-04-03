using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    class Projectile : Entity, IPhysicsComponent
    {

        PhysicsComponent _physics;
        Bitmap _bitmap;
        Point2D _pos;
        Weapon _parentWeapon;

        public Projectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel) : base(name)
        {
            _parentWeapon = parentWeapon;
            _physics = new PhysicsComponent(this);
            _physics.Velocity = vel;
            _physics.Position = pos;

            EntityManager.Instance.AddEntity(this);
        }

        public float X { get => _pos.X; set => _pos.X = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        PhysicsComponent IPhysicsComponent.Physics { get => _physics; set => _physics = value; }

        public override void Draw()
        {
            if (_bitmap == null)
            {
                SwinGame.FillCircle(Color.DarkMagenta, _pos, 3);



            }
        }

        public override void Update()
        {
            _pos.X = _physics.X;
            _pos.Y = _physics.Y;
        }
    }
}
