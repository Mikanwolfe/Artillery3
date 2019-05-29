using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class ParticleEngine
    {
        A3RData _a3RData;

        List<Particle> _particles;
        List<Particle> _particlesToRemove;
        Random _random;

        public ParticleEngine(A3RData a3RData)
        {
            _a3RData = a3RData;

            _particles = new List<Particle>(400);
            _particlesToRemove = new List<Particle>();
            _random = new Random();
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

        public void CreateSimpleParticle(Vector pos, Color color)
        {
            CreateSimpleParticle(pos, color, 1f, 1f, 0f);
        }
        public void CreateSimpleParticle(Vector pos, Color color, float speedMult, float lifeMult, float weight)
        {
            CreateSimpleParticle(pos, color, speedMult, lifeMult, weight, 1);
        }

        public void CreateSimpleParticle(Vector pos, Color color, float speedMult, float lifeMult, float weight, float windFricMult)
        {
            Vector velocity = Normalise(new Vector()
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
                weight,
                windFricMult));
        }

        public void CreateSmokeParticle(Vector pos, Color color, float lifeMult, float sizeMult)
        {
            Vector velocity = Normalise(new Vector()
            {
                X = (float)RandDoubleBetween(-1, 1),
                Y = (float)RandDoubleBetween(0, 1)
            });
            velocity.X *= RandFloatBetween(-1, 1);
            velocity.Y *= RandFloatBetween(0.5f, 1);

            Particle _particleToAdd = new Particle(
                RandDoubleBetween(0.5, 1) * lifeMult,
                pos,
                velocity,
                _random.Next(2, 10),
                color,
                -0.4f,
                1);

            _particleToAdd.Radius *= sizeMult;
            _particleToAdd.Physics.CanCollideWithGround = false;

            _particles.Add(_particleToAdd);
        }

        public void CreateNonCollideParticle(Vector pos, Color color, float speedMult, float lifeMult, float weight, float windFricMult)
        {
            Vector velocity = Normalise(new Vector()
            {
                X = (float)RandDoubleBetween(-1, 1),
                Y = (float)RandDoubleBetween(-1, 1)
            });
            velocity.X *= speedMult * RandFloatBetween(-1, 1);
            velocity.Y *= speedMult * RandFloatBetween(-1, 1);

            Particle _particleToAdd = new Particle(
                RandDoubleBetween(0.5, 1) * lifeMult,
                pos,
                velocity,
                _random.Next(2, 10),
                color,
                weight,
                windFricMult);

            _particleToAdd.Physics.CanCollideWithGround = false;

            _particles.Add(_particleToAdd);
        }

        public void CreateDamageText(Vector pos, Color color, float lifeMult, String text, float weight)
        {
            TextParticle _textParticle = new TextParticle(
                text, lifeMult, pos, color, weight);
            _textParticle.Physics.CanCollideWithGround = false;
            _textParticle.SetFriction(0);
            _textParticle.Physics.WindFrictionMult = 0;

            _particles.Add(_textParticle);
        }

        public void CreateAcidParticle(Vector pos, Color color, float speedMult, float lifeMult, float weight, float windFricMult, float damage)
        {
            Vector velocity = Normalise(new Vector()
            {
                X = (float)RandDoubleBetween(-1, 1),
                Y = (float)RandDoubleBetween(-1, 1)
            });
            velocity.X *= speedMult * RandFloatBetween(-1, 1);
            velocity.Y *= speedMult * RandFloatBetween(-1, 1);

            Particle _particleToAdd = new Particle(
                RandDoubleBetween(0.5, 1) * lifeMult,
                pos,
                velocity,
                _random.Next(2, 10),
                color,
                weight,
                windFricMult);

            _particleToAdd.SetDamage(damage);
            _particleToAdd.SetFriction(0.15f);

            _particles.Add(_particleToAdd);
        }


        public void CreateTracer(Vector pos, Color color, double radius, float lifeMult, float weight)
        {
            _particles.Add(new Particle(
                lifeMult,
                pos,
                ZeroVector(),
                radius,
                color,
                weight,
                0));
        }

        /* ----------------------------------------------
         *           Effect creation methods
           ---------------------------------------------- */

        public void CreateExplosion(Vector pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateSimpleParticle(pos, Roughly(Color.OrangeRed, 0.2f));
                CreateSimpleParticle(pos, Roughly(Color.Yellow, 0.2f));
            }
        }
        public void CreateFastExplosion(Vector pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateSimpleParticle(pos, Roughly(Color.Orange, 0.2f), 10, 2, 0.1f);
                CreateSimpleParticle(pos, RoughlyValued(Color.Black, 0.5f), 10, 4, 0.1f);
                CreateSimpleParticle(pos, Roughly(Color.Yellow, 0.2f), 10, 2, 0.1f);
            }
        }

        public void CreateLaserExplosion(Vector pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateAcidParticle(pos, Color.Cyan, 15, 2, 0.3f, 1, 0.02f);
                CreateAcidParticle(pos, Color.LightBlue, 15, 2, 0.3f, 1, 0.02f);
                CreateAcidParticle(pos, Color.GhostWhite, 15, 3, 0.3f, 1, 0.02f);

            }
        }

        public void CreateAcidExplosion(Vector pos, int numParticles)
        {
            for (int i = 0; i < numParticles; i++)
            {
                CreateAcidParticle(pos, Color.Orange, 20, 7, 0.3f, 1, 0.12f);
                CreateAcidParticle(pos, Color.Yellow, 20, 7, 0.3f, 1, 0.12f);
                CreateAcidParticle(pos, Color.Green, 20, 10, 0.3f, 1, 0.12f);

            }
        }



        /* ----------------------------------------------
         *                Normal stuff
           ---------------------------------------------- */


        public void Update()
        {
            foreach (Particle p in _particles)
            {
                p.Update();

                if (!WithinBoundary(p.Pos, Services.Instance.PhysicsEngine.BoundaryBox))
                    RemoveParticle(p);
            }

            foreach (Particle p in _particlesToRemove)
            {
                p.Enabled = false;
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

        public void Clear()
        {
            _particles.Clear();
            _particlesToRemove.Clear();
        }
    }
}
