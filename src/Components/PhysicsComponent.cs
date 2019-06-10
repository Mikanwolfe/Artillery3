using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Artillery3R;

namespace ArtillerySeries.src
{

    public interface IPhysicsComponent
    {
        PhysicsComponent Physics { get; set; }
    }
    
    public enum FacingDirection
    {
        Left,
        Right
    }

    public delegate void RemoveCommand();

    public class PhysicsComponent
    {
        IPhysicsComponent _entity;
        Point2D _pos, _vel, _acc;
        //PHYSICS!!
        bool _enabled;
        float _weight;
        float _fricCoefficient;
        float _windFrictionMult;
        float _absAngleToGround;
        float _relativeAngleToGround;
        bool _gravityEnabled, _onGround, _hasGroundFriction, _canCollideWithGround;

        FacingDirection _facing;

        /*
         * Explained:
         *  Weight--> weight of 1 means normal gravity (F = mg * weight)
         *            weight of 0.5 means 1/2 gravity, etc.
         * 
         */ 
        


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

        PhysicsComponent()
        {
            _enabled = true;
            _gravityEnabled = true;
            _vel = ZeroPoint2D();
            _acc = ZeroPoint2D();
            _facing = FacingDirection.Right;
            _hasGroundFriction = true;
            _weight = 1f;
            _windFrictionMult = 1f;
            _fricCoefficient = Constants.BaseFrictionCoef;
            _canCollideWithGround = true;
        }

        public PhysicsComponent(IPhysicsComponent entity)
            : this()
        {
            _entity = entity;
            Artillery3R.Services.PhysicsEngine.AddComponent(_entity);
            _pos = ZeroPoint2D();

        }

        public PhysicsComponent(IPhysicsComponent entity, Point2D pos)
            : this()
        {
            _entity = entity;
            Artillery3R.Services.PhysicsEngine.AddComponent(_entity);
            _pos = pos;

        }

        public void Update()
        {
            if (_vel.X > 0)
                _facing = FacingDirection.Right;
            if (_vel.X < 0)
                _facing = FacingDirection.Left;

            if (_facing == FacingDirection.Right)
                _relativeAngleToGround = _absAngleToGround;
            else
                _relativeAngleToGround = _absAngleToGround * -1 ;

            _acc.X = 0;
            _acc.Y = 0;
        }

        public Point2D Position { get => _pos; set => _pos = value; }
        public Point2D Velocity { get => _vel; set => _vel = value; }
        public Point2D Acceleration { get => _acc; set => _acc = value; }
        public bool GravityEnabled { get => _gravityEnabled; set => _gravityEnabled = value; }
        public float Weight { get => _weight; set => _weight = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        public float X { get => _pos.X; set => _pos.X = value; }
        public float VelX { get => _vel.X; set => _vel.X = value; }
        public float VelY { get => _vel.Y; set => _vel.Y = value; }
        public float AccX { get => _acc.X; set => _acc.X = value; }
        public float AccY { get => _acc.Y; set => _acc.Y = value; }
        public bool OnGround { get => _onGround; set => _onGround = value; }
        public float AbsAngleToGround { get => _absAngleToGround; set => _absAngleToGround = value; }
        public float RelAngleToGround { get => _relativeAngleToGround; set => _relativeAngleToGround = value; }
        internal FacingDirection Facing { get => _facing; }
        public bool HasGroundFriction { get => _hasGroundFriction; set => _hasGroundFriction = value; }
        public float WindFrictionMult { get => _windFrictionMult; set => _windFrictionMult = value; }
        public bool CanCollideWithGround { get => _canCollideWithGround; set => _canCollideWithGround = value; }
        public float FricCoefficient { get => _fricCoefficient; set => _fricCoefficient = value; }
        public bool Enabled { get => _enabled; set => _enabled = value; }
    }
}
