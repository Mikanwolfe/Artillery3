using SwinGameSDK;

namespace ArtillerySeries.src
{

    enum ParticleType
    {
        Fire,
        Rectangle
    }

    class Particle : Entity, IPhysicsComponent
    {
        Bitmap _bitmap;
        PhysicsComponent _physics;
        double _life;
        double _maxLife;
        Color _color;
        double _radius;

        public Particle(double life, Point2D pos, Point2D vel, double radius, Color color, float weight)
            : base("particle")
        {
            _physics = new PhysicsComponent(this);
            _physics.Velocity = vel;
            _physics.Position = pos;

            _maxLife = life;
            _life = life;
            _radius = radius;

            _color = color;

            if (weight == 0f)
            {
                _physics.GravityEnabled = false;
                _physics.Weight = 0f;
            }
            else
            {
                _physics.GravityEnabled = true;
                _physics.Weight = weight;
            }
        }

        public override void Draw()
        {
            if (Visible)
            {
                if (_bitmap == null)
                {
                    SwinGame.FillCircle(_color, Pos, (int)_radius);
                }
            }

        }

        public override void Update()
        {
            if (Enabled)
            {
                _life -= Constants.ParticleLifeDispersion;
                if (_life < 0)
                {
                    Enabled = false;
                    Visible = false;
                    ParticleEngine.Instance.RemoveParticle(this);
                    PhysicsEngine.Instance.RemoveComponent(this);
                }

                _color = SwinGame.RGBAColor(_color.R, _color.G, _color.B, (byte)(255 * _life / _maxLife));


                Pos = _physics.Position;
            }
        }

        public void SetGravity(bool hasGravity)
        {
            _physics.GravityEnabled = hasGravity;
        }

        public PhysicsComponent Physics { get => _physics; set => _physics = value; }
    }
}
