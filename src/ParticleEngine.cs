using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    class ParticleEngine
    {

        private static ParticleEngine instance;
        List<Particle> _particles;
        List<Particle> _particlesToRemove;
        Random _random;

        private ParticleEngine()
        {
            instance = this;
            _particles = new List<Particle>();
            _particlesToRemove = new List<Particle>();
            _random = new Random();
        }

        public static ParticleEngine Instance
        {
            get
            {
                if (instance == null)
                    instance = new ParticleEngine();
                return instance; 
            }
        }

        /* ----------------------------------------------
         *          Maff and Particle methods
           ---------------------------------------------- */

        public Color RandColorBetween(float RMin, float RMax, float GMin, float GMax, float BMin, float BMax, float AMin, float AMax)
        {
            return SwinGame.RGBAFloatColor(
                RandFloatBetween(RMin, RMax),
                RandFloatBetween(GMin, GMax),
                RandFloatBetween(BMin, BMax),
                RandFloatBetween(AMin, AMax)
                );
        }

        float Clamp(float value, float min, float max)
        {
            return PhysicsEngine.Instance.Clamp(value, min, max);
        }

        Point2D Normalise(Point2D vector)
        {
            float x = vector.X;
            float y = vector.Y;
            float magnitude = (float)Math.Sqrt(x * x + y * y);
            vector.X /= magnitude;
            vector.Y /= magnitude;
            return vector;
        }

        public Color Roughly(Color color, float var)
        {
            float r = color.R / 255;
            float g = color.G / 255;
            float b = color.B / 255;
            float a = color.A / 255;
            return SwinGame.RGBAFloatColor(
                RandFloatBetween(Clamp(r - var, 0, 1), Clamp(r + var, 0, 1)),
                RandFloatBetween(Clamp(g - var, 0, 1), Clamp(g + var, 0, 1)),
                RandFloatBetween(Clamp(b - var, 0, 1), Clamp(b + var, 0, 1)),
                a
                );
        }

        public Color RoughlyValued(Color color, float var)
        {
            float r = color.R / 255;
            float g = color.G / 255;
            float b = color.B / 255;
            float a = color.A / 255;
            float deviation = RandFloatBetween(-var, var);
            return SwinGame.RGBAFloatColor(
                Clamp(r + deviation, 0, 1),
                Clamp(g + deviation, 0, 1),
                Clamp(b + deviation, 0, 1),
                a
                );
        }
        public double RandDoubleBetween(double min, double max)
        {
            return _random.NextDouble() * (max - min) + min;
        }

        public float RandFloatBetween(float min, float max)
        {
            return (float)RandDoubleBetween(min, max);
        }

        public void CreateSimpleParticle(Point2D pos, Color color)
        {
            CreateSimpleParticle(pos, color, 1f, 1f, 0f);
        }
        public void CreateSimpleParticle(Point2D pos, Color color, float speedMult, float lifeMult, float weight)
        {
            Point2D velocity = Normalise(new Point2D()
            {
                X = (float)RandDoubleBetween(-1, 1),
                Y = (float)RandDoubleBetween(-1, 1)
            });
            velocity.X *= speedMult * RandFloatBetween(-1, 1);
            velocity.Y *= speedMult * RandFloatBetween(-1, 1);

            _particles.Add(new Particle(
                RandDoubleBetween(0.5, 1) * lifeMult,
                pos,
                velocity,
                _random.Next(2, 10),
                color,
                weight));
        }

        /* ----------------------------------------------
         *           Effect creation methods
           ---------------------------------------------- */

        public void CreateExplosion(Point2D pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateSimpleParticle(pos, Roughly(Color.OrangeRed, 0.2f));
                CreateSimpleParticle(pos, Roughly(Color.Yellow, 0.2f));
            }
        }
        public void CreateFastExplosion(Point2D pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateSimpleParticle(pos, Roughly(Color.Orange, 0.2f),10,2, 0.1f);
                CreateSimpleParticle(pos, RoughlyValued(Color.Black, 0.5f),10,4, 0.05f);
                CreateSimpleParticle(pos, Roughly(Color.Yellow, 0.2f),10,2, 0.1f);
            }
        }



        /* ----------------------------------------------
         *                Normal stuff
           ---------------------------------------------- */


        public void Update()
        {
            foreach(Particle p in _particles)
            {
                p.Update();
            }

            foreach (Particle p in _particlesToRemove)
            {
                _particles.Remove(p);
            }
            _particlesToRemove.Clear();

        }

        public void Draw()
        {
            foreach (Particle p in _particles)
            {
                p.Draw();
            }
        }
        

        public void RemoveParticle(Particle p)
        {
            _particlesToRemove.Add(p);
        }
    }
}
