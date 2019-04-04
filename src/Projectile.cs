using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    enum ProjectileState
    {
        Alive,
        Exploding,
        Dead
    }
    class Projectile : Entity, IPhysicsComponent
    {
        /*
         * Once again, more discussion.
         * 
         * I can make the projectile a FlyWeight, that is, the real object is being held by the charcter and it 
         * simply creates references that fly around.
         * 
         * On the other hand, that makes things complicated, though it means the projile can be built easily every time.
         * This is 'cause the projectiles will probably get quite complex, and therefore it would make sense.
         * 
         * In the end, there's a lot of things to do here and the important thing to remember
         * is that each weapon fires a different projectile. Time to clone it.
         */
        PhysicsComponent _physics;
        Bitmap _bitmap;
        Point2D _pos;
        Weapon _parentWeapon;

        ProjectileState _state;

        public Projectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel) : base(name)
        {
            _parentWeapon = parentWeapon;
            _physics = new PhysicsComponent(this);
            _physics.Velocity = vel;
            _physics.Position = pos;
            _state = ProjectileState.Alive;

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

            if (_physics.OnGround)
                Console.WriteLine("Explosion!!");
            _pos.X = _physics.X;
            _pos.Y = _physics.Y;
        }
    }
}
