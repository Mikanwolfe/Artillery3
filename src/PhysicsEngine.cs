using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryGame;

namespace ArtillerySeries.src
{
    /*
    * A singleton for physics calculations and simulations.
    * Being a singleton allows components to self-register themselves
    * as components of the physics engine.
    */
    class PhysicsEngine
    {
        
        private static PhysicsEngine instance;
        List<IPhysicsComponent> _components;
        Terrain _terrain;

        private PhysicsEngine()
        {
            instance = this;
            _components = new List<IPhysicsComponent>();
        }

        public static PhysicsEngine Instance
        {
            get
            {
                if (instance == null)
                    instance = new PhysicsEngine();
                return instance;
            }
        }

        public Terrain Terrain { get => _terrain; set => _terrain = value; }

        public float Clamp(float value, float min, float max)
        {
            if (value < min)
                return value = min;
            if (value > max)
                return value = max;
            return value;
        }

        public int Clamp(int value, int min, int max)
        {
            if (value < min)
                return value = min;
            if (value > max)
                return value = max;
            return value;
        }


        public void Simulate()
        {
            if (_terrain == null)
                throw new MissingMemberException("No terrain to simulate with! Nothing to stop falls!");
                //make this not an exception!!
            foreach(IPhysicsComponent p in _components)
            {
                if (p != null)
                {
                    if (p.Physics.GravityEnabled)
                    {
                        p.Physics.VelY += Constants.Gravity * p.Physics.Weight;
                    }
                    if (p.Physics.Position.Y >= _terrain.Map[(int)p.Physics.Position.X])
                    {
                        p.Physics.VelY = 0;
                        p.Physics.Y = _terrain.Map[(int)p.Physics.Position.X];
                        p.Physics.OnGround = true;

                    }
                    else
                    {
                        p.Physics.OnGround = false;
                    }

                    if (p.Physics.OnGround)
                    {
                        int x = (int)p.Physics.X;

                        float p1 = _terrain.Map[Clamp((int)(x - 1), 0, _terrain.Map.Length - 1)];
                        float p2 = _terrain.Map[Clamp((int)(x + 1), 0, _terrain.Map.Length - 1)];

                        p.Physics.VelX *= (float)Math.Cos(p.Physics.RelAngleToGround);
                        p.Physics.VelY *= (float)Math.Cos(p.Physics.RelAngleToGround);

                        if (p.Physics.HasGroundFriction)
                            p.Physics.VelX *= Constants.BaseFrictionCoefKinetic;

                        p.Physics.AbsAngleToGround = (float)Math.Atan((p1 - p2) / (3));
                    }

                    //p.Physics.Position.Add(p.Physics.Velocity);
                    //p.Physics.Velocity.Add(p.Physics.Acceleration);
                    p.Physics.X += p.Physics.VelX;
                    p.Physics.Y += p.Physics.VelY;



                    p.Physics.X = Clamp(p.Physics.X, 0, _terrain.Map.Length - 1);
                    p.Physics.VelX += p.Physics.AccX;
                    p.Physics.VelY += p.Physics.AccY;
                    //p.Physics.VelX *= Constants.VelocityLoss;

                    p.Physics.Simulate();                }
            }
        }

        public void Settle()
        {
            foreach(IPhysicsComponent p in _components)
            {
                p.Physics.Y = _terrain.Map[(int)p.Physics.X];
            }
        }

        public void BlowUpTerrain(float[] crater, Point2D pos)
        {
            int xPos;
            for(int i = 0; i < crater.Length -1; i++)
            {
                xPos = (int)pos.X - (crater.Length / 2) + i;
                xPos = Clamp(xPos, 0, _terrain.Map.Length - 1);
                _terrain.Map[xPos] += crater[i];
            }
        }


        public void AddComponent(IPhysicsComponent component)
        {
            _components.Add(component);
        }

        public void RemoveComponent(IPhysicsComponent component)
        {
            _components.Remove(component);
        }
    }
}
