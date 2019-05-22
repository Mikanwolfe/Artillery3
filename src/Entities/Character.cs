using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static Artillery.Utilities;

namespace Artillery
{
    public interface ICharacter
    {
        void MoveLeft();
        void MoveRight();
        void Fire();
        void AimWeaponUp();
        void AimWeaponDown();
        void ChargeWeapon();
        void NewTurn();
        void SwitchWeapon();

        void MoveToPosition(Vector pos);

    }
    public enum ChararacterState
    {
        NotSelected,
        Idle,
        Walking,
        Firing,
        Dead,
        EndTurn
    }
    public class Character : Entity, ICharacter, IPhysicsComponent, IDamageableComponent
    {

        #region Fields
        IPhysicsComponent _physicsComponent;
        IDamageableComponent _damageComponent;
        IStateComponent<ChararacterState> _stateComponent;

        bool _isSelected = false;

        #endregion

        #region Constructor
        public Character(string name) : base(name)
        {
            _physicsComponent = new PhysicsComponent(this);
            _damageComponent = new DamageableComponent(this);
            _stateComponent = new StateComponent<ChararacterState>(ChararacterState.Idle);
        }

        #endregion

        #region Methods

        public override void Draw()
        {
            base.Draw();
        }


        public override void Update()
        {
            _physicsComponent.Update();
            base.Update();
        }

        public void Damage(float damage)
        {
            //EVENT can go here
            _damageComponent.Damage(damage);
        }

        public void Die()
        {
            
        }

        public void MoveLeft()
        {
            throw new NotImplementedException();
        }

        public void MoveRight()
        {
            throw new NotImplementedException();
        }

        public void Fire()
        {
            throw new NotImplementedException();
        }

        public void AimWeaponUp()
        {
            throw new NotImplementedException();
        }

        public void AimWeaponDown()
        {
            throw new NotImplementedException();
        }

        public void ChargeWeapon()
        {
            throw new NotImplementedException();
        }

        public void NewTurn()
        {
            throw new NotImplementedException();
        }

        public void SwitchWeapon()
        {
            throw new NotImplementedException();
        }

        public void MoveToPosition(Vector pos)
        {
            throw new NotImplementedException();
        }
        #endregion

        #region Properties
        public IPhysicsComponent Physics { get => _physicsComponent; set => _physicsComponent = value; }
        public Vector Vel { get => _physicsComponent.Vel; set => _physicsComponent.Vel = value; }
        public Vector Acc { get => _physicsComponent.Acc; set => _physicsComponent.Acc = value; }
        public float WeightMult { get => _physicsComponent.WeightMult; set => _physicsComponent.WeightMult = value; }
        public float FricCoef { get => _physicsComponent.FricCoef; set => _physicsComponent.FricCoef = value; }
        public float WindFricMult { get => _physicsComponent.WindFricMult; set => _physicsComponent.WindFricMult = value; }
        double IPhysicsComponent.AbsAngle { get => _physicsComponent.AbsAngle; set => _physicsComponent.AbsAngle = value; }
        public double RelAngle { get => _physicsComponent.RelAngle; set => _physicsComponent.RelAngle = value; }
        public bool OnGround => _physicsComponent.OnGround;
        public bool GravityEnabeld { get => _physicsComponent.GravityEnabeld; set => _physicsComponent.GravityEnabeld = value; }
        public bool HasGroundFriction { get => _physicsComponent.HasGroundFriction; set => _physicsComponent.HasGroundFriction = value; }
        public bool CanCollideWithGround { get => _physicsComponent.CanCollideWithGround; set => _physicsComponent.CanCollideWithGround = value; }
        #endregion

    }
}
