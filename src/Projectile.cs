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
        Point2D _pos;

        public Projectile(string name) : base(name)
        {
            _physics = new PhysicsComponent(this);
        }

        public float X { get => _pos.X; set => _pos.X = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        PhysicsComponent IPhysicsComponent.Physics { get => _physics; set => _physics = value; }

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
