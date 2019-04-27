using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    public enum ProjectileState
    {
        Alive,
        Exploding,
        Dead
    }

    public class Projectile : Entity, IPhysicsComponent, ICameraCanFocus
    {
        PhysicsComponent _physics;
        Bitmap _bitmap;
        Weapon _parentWeapon;

        StateComponent<ProjectileState> _state;

        float _explRad = Constants.BaseExplosionRadius;


        public Projectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel) : base(name)
        {
            _parentWeapon = parentWeapon;
            _physics = new PhysicsComponent(this);
            _physics.Velocity = vel;
            _physics.Position = pos;
            _state = new StateComponent<ProjectileState>(ProjectileState.Alive);
            
            EntityManager.Instance.AddEntity(this);
        }

        public float X { get => Pos.X; }
        public float Y { get => Pos.Y; }

        public float ExplRad { get => _explRad; }

        public PhysicsComponent Physics { get => _physics; set => _physics = value; }

        public override void Draw()
        {
            if (Visible)
            {
                if (_bitmap == null)
                {
                    SwinGame.FillCircle(Color.DarkMagenta, Pos, 3);

                }

            }
            
        }

        public override void Update()
        {
            if (Enabled)
            {
                if (_physics.OnGround)
                {
                    SwitchState(ProjectileState.Exploding);
                }


                Pos = _physics.Position;

                if ((Pos.X <= 0) || (Pos.X >= PhysicsEngine.Instance.Terrain.Map.Length - 1))
                    SwitchState(ProjectileState.Dead);

                ParticleEngine.Instance.CreateTracer(
                    Pos,
                    Color.DarkMagenta,
                    3,
                    1,
                    0);

            } else
            {
                Visible = false;
                EntityManager.Instance.RemoveEntity(this);
                PhysicsEngine.Instance.RemoveComponent(this);
            }
            
        }

        public virtual void BlowUpTerrain(Point2D pt)
        {
            int width = ((int)_explRad * Constants.BaseExplosionDiaScaling) - 1;
            float[] _crater = new float[(int)width];
            float _period = (float)Math.PI * 2 / width;

            for (int i = 0; i < width; i++)
            {
                _crater[i] = _explRad * (float)(-1 * Math.Cos(_period * (i - Math.PI * 2)) + 1);
            }

            PhysicsEngine.Instance.BlowUpTerrain(_crater, pt);
        }

        public virtual void Explode(Point2D pt)
        {
            BlowUpTerrain(pt);
            ParticleEngine.Instance.CreateFastExplosion(pt, 100);
            EntityManager.Instance.DamageEntities(100, 70, pt);
        }

        public void SwitchState(ProjectileState nextState)
        {
            switch (nextState)
            {

                case ProjectileState.Exploding:
                    if (_state.Peek() == ProjectileState.Alive)
                    {
                        Explode(Pos);
                        SwitchState(ProjectileState.Dead);
                    }
                    break;

                case ProjectileState.Dead:
                    if (_parentWeapon != null)
                        _parentWeapon.LastProjectilePosition(this, Pos);
                    Enabled = false;
                    break;

            }
            _state.Switch(nextState);
        }
    }
}
