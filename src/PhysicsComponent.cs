using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    interface IPhysicsComponent
    {
        void Simulate();
        PhysicsComponent Physics { get; set; }
    }

    class PhysicsComponent
    {
        Entity _entity;
        Point2D _pos, _vel, _acc;
        bool _gravityEnabled;

        void ZeroPoint2D(Point2D point)
        {
            point.X = 0;
            point.Y = 0;
        }

        Point2D ZeroPoint2D()
        {
            Point2D point = new Point2D
            {
                X = 0,
                Y = 0
            };
            return point;
        }

        private PhysicsComponent()
        {
            _gravityEnabled = true;
            _vel = ZeroPoint2D();
            _acc = ZeroPoint2D();
        }

        public PhysicsComponent(Entity entity)
            : this()
        {
            _entity = entity;
            _pos = ZeroPoint2D();
        }

        public PhysicsComponent(Entity entity, Point2D pos)
            : this()
        {
            _entity = entity;
            _pos = pos;

        }

        public Point2D Position { get => _pos; set => _pos = value; }
        public Point2D Velocity { get => _vel; set => _vel = value; }
        public Point2D Acceleration { get => _acc; set => _acc = value; }
        public bool GravityEnabled { get => _gravityEnabled; set => _gravityEnabled = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        public float X { get => _pos.X; set => _pos.X = value; }
        public float VelX { get => _vel.X; set => _vel.X = value; }
        public float VelY { get => _vel.Y; set => _vel.Y = value; }
        public float AccX { get => _acc.X; set => _acc.X = value; }
        public float AccY { get => _acc.Y; set => _acc.Y = value; }
        public void Simulate()
        {
            _acc.X = 0;
            _acc.Y = 0;
        }


    }
}
