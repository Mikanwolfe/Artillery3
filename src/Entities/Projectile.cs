using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public enum ProjectileState
    {
        Alive,
        Exploding,
        Dead
    }
    public class Projectile : Entity, IPhysicsComponent, ICameraCanFocus
    {
        #region Fields
        private IPhysicsComponent _physicsComponent;
        StateComponent<ProjectileState> _stateComponent;
        Weapon _parentWeapon;

        float _explRad = 10;
        float _baseDamage;
        float _damageRad;
        #endregion

        #region Constructor
        public Projectile(string name, Weapon parentWeapon, Vector pos, Vector vel, float damage, float explRad, float damageRad) : base(name)
        {
            _parentWeapon = parentWeapon;
            _physicsComponent = new PhysicsComponent(this)
            {
                Pos = pos,
                Vel = vel
            };

            _stateComponent = new StateComponent<ProjectileState>(ProjectileState.Alive);

            _baseDamage = damage;
            _explRad = explRad;
            _damageRad = damageRad;
        }
        #endregion

        #region Methods
        #endregion

        #region Properties

        public override Vector Pos { get => _physicsComponent.Pos; set => _physicsComponent.Pos = value; }
        public Vector Vel { get => _physicsComponent.Vel; set => _physicsComponent.Vel = value; }
        public Vector Acc { get => _physicsComponent.Acc; set => _physicsComponent.Acc = value; }
        public float WeightMult { get => _physicsComponent.WeightMult; set => _physicsComponent.WeightMult = value; }
        public float FricCoef { get => _physicsComponent.FricCoef; set => _physicsComponent.FricCoef = value; }
        public float WindFricMult { get => _physicsComponent.WindFricMult; set => _physicsComponent.WindFricMult = value; }
        public double RelAngle { get => _physicsComponent.RelAngle; set => _physicsComponent.RelAngle = value; }
        public bool OnGround { get => _physicsComponent.OnGround; set => _physicsComponent.OnGround = value; }
        public bool GravityEnabled { get => _physicsComponent.GravityEnabled; set => _physicsComponent.GravityEnabled = value; }
        public bool HasGroundFriction { get => _physicsComponent.HasGroundFriction; set => _physicsComponent.HasGroundFriction = value; }
        public bool CanCollideWithGround { get => _physicsComponent.CanCollideWithGround; set => _physicsComponent.CanCollideWithGround = value; }
        public bool DiesUponExitingScreen { get => _physicsComponent.DiesUponExitingScreen; set => _physicsComponent.DiesUponExitingScreen = value; }

        public void Die()
        {
            _physicsComponent.Die();
        }

        #endregion
    }
}
