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

        public double RandDoubleBetween(double min, double max)
        {
            return _random.NextDouble() * (max - min) + min;
        }

        public void CreateSimpleParticle(Point2D pos, Color color)
        {
            _particles.Add(new Particle(
                RandDoubleBetween(0.5, 1),
                pos,
                new Point2D()
                {
                    X = (float)RandDoubleBetween(-1, 1),
                    Y = (float)RandDoubleBetween(-1, 1)
                },
                _random.Next(2, 10),
                color,
                false));
        }

        public void CreateExplosion(Point2D pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateSimpleParticle(pos, Color.OrangeRed);
                CreateSimpleParticle(pos, Color.Yellow);
            }
        }

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
