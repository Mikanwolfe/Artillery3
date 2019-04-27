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

    public class Projectile : Entity, IPhysicsComponent, ICameraCanFocus
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
         * is that each weapon fires a different projectile. Time to clone it.4
         * 
         * 
         * 
         * What about polymorphism/composition for states?
         * Should i include a state component that's Projectile.State<T>? 
         * That would allow me to write one State.Switch(State State) method each time
         * though it would be dependant on the specific enum for the state...
         * Then again, that only matters to external observers, hence, the StateComponent
         * should be private only.
         */
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

        public virtual void Explode()
        {
            int width = ((int)_explRad * Constants.BaseExplosionDiaScaling) - 1;
            float[] _crater = new float[(int)width];
            float _period = (float)Math.PI * 2 / width;

            for (int i = 0; i < width; i++)
            {
                _crater[i] = _explRad * (float)(-1 * Math.Cos(_period * (i - Math.PI * 2)) + 1);
            }

            PhysicsEngine.Instance.BlowUpTerrain(_crater, Pos);
            ParticleEngine.Instance.CreateFastExplosion(Pos, 100);
            EntityManager.Instance.DamageEntities(100, 70, Pos);
        }

        void SwitchState(ProjectileState nextState)
        {
            switch (nextState)
            {

                case ProjectileState.Exploding:
                    if (_state.Peek() == ProjectileState.Alive)
                    {
                        Explode();
                        SwitchState(ProjectileState.Dead);
                    }
                    break;

                case ProjectileState.Dead:
                    Enabled = false;

                    break;

            }
            _state.Switch(nextState);
        }
    }
}
