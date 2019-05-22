using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IPhysicsComponent
    {
        PhysicsComponent Physics { get; set; }
    }
    public class PhysicsComponent : UpdatableObject
    {
        #region Fields
        bool _toBeRemoved = false;
        IPhysicsComponent _parent;
        Vector _pos, _vel, _acc;
        float _weightMult;
        float _fricCoef;
        float _windFricMult;
        double _absAngle;
        double _relAngle;
        bool _onGround;
        bool _gravityEnabled, _hasGroundFriction, _canCollideWithGround;

        Direction _facing;
        #endregion

        #region Constructor
        public PhysicsComponent(IPhysicsComponent parent)
        {
            _parent = parent;
            _pos = new Vector();
            _vel = new Vector();
            _acc = new Vector();
            _weightMult = 1f;
            _windFricMult = 1f;
            _canCollideWithGround = true;
            _gravityEnabled = true;
            _absAngle = 0;
            _relAngle = 0;
        }

        public PhysicsComponent(IPhysicsComponent parent, Vector pos)
            : this(parent)
        {
            _pos = pos;
        }

        #endregion

        #region Methods
        public override void Update()
        {
            if (_vel.X > 0)
                _facing = Direction.Right;
            if (_vel.X < 0)
                _facing = Direction.Left;
            _acc.X = 0;
            _acc.Y = 0;
        }

        #endregion

        #region Properties
        public bool ToBeRemoved { get => _toBeRemoved; set => _toBeRemoved = value; }
        public Vector Pos { get => _pos; set => _pos = value; }
        public Vector Vel { get => _vel; set => _vel = value; }
        public Vector Acc { get => _acc; set => _acc = value; }
        public float WeightMult { get => _weightMult; set => _weightMult = value; }
        public float FricCoef { get => _fricCoef; set => _fricCoef = value; }
        public float WindFricMult { get => _windFricMult; set => _windFricMult = value; }
        public double AbsAngle { get => _absAngle; set => _absAngle = value; }
        public double RelAngle { get => _relAngle; set => _relAngle = value; }
        public bool OnGround { get => _onGround; set => _onGround = value; }
        public bool GravityEnabled { get => _gravityEnabled; set => _gravityEnabled = value; }
        public bool HasGroundFriction { get => _hasGroundFriction; set => _hasGroundFriction = value; }
        public bool CanCollideWithGround { get => _canCollideWithGround; set => _canCollideWithGround = value; }
        #endregion

    }
}
