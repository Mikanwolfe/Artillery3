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
        float _baseDamage;
        float _damageRad;


        public Projectile(string name, Weapon parentWeapon, Point2D pos, Point2D vel, float damage, float explRad, float damageRad) : base(name)
        {
            _parentWeapon = parentWeapon;
            _physics = new PhysicsComponent(this);
            _physics.Velocity = vel;
            Pos = pos;
            _physics.Position = pos;
            _state = new StateComponent<ProjectileState>(ProjectileState.Alive);

            _baseDamage = damage;
            _explRad = explRad;
            _damageRad = damageRad;
            
            Artillery3R.Services.EntityManager.AddEntity(this);
        }

        public float X { get => Pos.X; }
        public float Y { get => Pos.Y; }

        public float ExplRad { get => _explRad; set => _explRad = value; }

        public PhysicsComponent Physics { get => _physics; set => _physics = value; }
        public float BaseDamage { get => _baseDamage; set => _baseDamage = value; }
        public float BaseDamage1 { get => _baseDamage; set => _baseDamage = value; }
        public float DamageRad { get => _damageRad; set => _damageRad = value; }

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

                if ((Pos.X <= 0) || (Pos.X >= Artillery3R.Services.PhysicsEngine.Terrain.Map.Length - 1))
                    SwitchState(ProjectileState.Dead);

                Artillery3R.Services.ParticleEngine.CreateTracer(
                    Pos,
                    Color.DarkMagenta,
                    3,
                    1,
                    0);

            } else
            {
                Visible = false;
                Artillery3R.Services.EntityManager.RemoveEntity(this);
                Artillery3R.Services.PhysicsEngine.RemoveComponent(this);
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

            Artillery3R.Services.PhysicsEngine.BlowUpTerrain(_crater, pt);
        }

        public virtual void Explode(Point2D pt)
        {
            BlowUpTerrain(pt);
            Artillery3R.Services.ParticleEngine.CreateFastExplosion(pt, 100);
            Artillery3R.Services.EntityManager.DamageEntities(this, _baseDamage, (int)_damageRad, pt);
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
