using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.GameMain;

namespace ArtillerySeries.src
{
    class PhysicsEngine
    {
        List<IPhysicsComponent> _components;
        Terrain _terrain;

        public PhysicsEngine()
        {
            _components = new List<IPhysicsComponent>();
        }

        public Terrain Terrain { get => _terrain; set => _terrain = value; }

        public void Clamp(float value, float min, float max)
        {
            if (value < min)
                value = min;
            if (value > max)
                value = max;
        }


        public void Simulate()
        {
            foreach(IPhysicsComponent p in _components)
            {
                
                if (p.Physics.GravityEnabled)
                {
                    p.Physics.VelY += Constants.Gravity;
                }
                if (p.Physics.Position.Y > _terrain.Map[(int)p.Physics.Position.X])
                {
                    p.Physics.VelY = 0;
                    p.Physics.Y = _terrain.Map[(int)p.Physics.Position.X];
                }

                //p.Physics.Position.Add(p.Physics.Velocity);
                //p.Physics.Velocity.Add(p.Physics.Acceleration);
                p.Physics.X += p.Physics.VelX;
                p.Physics.Y += p.Physics.VelY;
                Clamp(p.Physics.X, 0, _terrain.Map.Length - 1); // clamp aint working
                if (p.Physics.X < 0)
                    p.Physics.X = 0;
                if (p.Physics.X > _terrain.Map.Length-1)
                    p.Physics.X = _terrain.Map.Length-1;
                p.Physics.VelX += p.Physics.AccX;
                p.Physics.VelY += p.Physics.AccY;
                p.Physics.VelX *= Constants.VelocityLoss;

                p.Simulate();

                


            }
        }

        public void AddComponent(IPhysicsComponent component)
        {
            _components.Add(component);
        }
    }
}
