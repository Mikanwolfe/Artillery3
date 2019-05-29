using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

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
        Vector _pos;
        Vector _vel;
        Vector _acc;
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
        

        PhysicsComponent()
        {
            _enabled = true;
            _gravityEnabled = true;
            _pos = new Vector();
            _vel = new Vector();
            _acc = new Vector();
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
            _pos = new Vector(); 

        }

        public PhysicsComponent(IPhysicsComponent entity, Vector pos)
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

        public Vector Pos { get => _pos; set => _pos = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        public float X { get => _pos.X; set => _pos.X = value; }
        public Vector Vel{ get => _vel; set => _vel = value; }
        public Vector Acc{ get => _acc; set => _acc = value; }
        public bool GravityEnabled { get => _gravityEnabled; set => _gravityEnabled = value; }
        public float Weight { get => _weight; set => _weight = value; }
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
