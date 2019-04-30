using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    /*
    * A singleton for physics calculations and simulations.
    * Being a singleton allows components to self-register themselves
    * as components of the physics engine.
    */
    public class PhysicsEngine
    {
        
        private static PhysicsEngine instance;
        List<IPhysicsComponent> _components;
        List<IPhysicsComponent> _componentsToRemove;
        Terrain _terrain;
        Wind _wind;
        Rectangle _windowRect;
        Rectangle _boundaryBox;
        Rectangle _worldBox;

        Random _random = new Random();
        
       

        private PhysicsEngine()
        {
            instance = this;
            _components = new List<IPhysicsComponent>();
            _componentsToRemove = new List<IPhysicsComponent>();
            _wind = new Wind();
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

        public Terrain Terrain
        {
            get => _terrain;
            set
            {
                _terrain = value;

                _boundaryBox = new Rectangle()
                {
                    X = 0,
                    Y = Constants.WorldMaxHeight + Constants.TerrainDepth - _windowRect.Height,
                    Width = _terrain.Map.Length,
                    Height = Constants.WorldMaxHeight + Constants.TerrainDepth
                };

            }
        }
        public Rectangle BoundaryBox { get => _boundaryBox; }

        public void Simulate()
        {

            //Console.WriteLine("BoundaryBox: X{0} y{1}", _boundaryBox.X, _boundaryBox.Y);
            if (_terrain == null)
                throw new MissingMemberException("No terrain to simulate with! Nothing to stop falls!");
            //make this not an exception!!
            foreach (IPhysicsComponent p in _components)
            {
                if (!p.Physics.Enabled)
                    RemoveComponent(p);
                if (p != null)
                {
                    if (p.Physics.Enabled)
                    {
                        if (p.Physics.GravityEnabled)
                        {
                            p.Physics.VelY += Constants.Gravity * p.Physics.Weight;
                        }
                        if ((p.Physics.Position.Y >= _terrain.Map[(int)p.Physics.Position.X]) && p.Physics.CanCollideWithGround)
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
                                p.Physics.VelX *= (1 - p.Physics.FricCoefficient);

                            p.Physics.AbsAngleToGround = (float)Math.Atan((p1 - p2) / (3));
                        } else
                        {

                            p.Physics.VelX += _wind.X * p.Physics.WindFrictionMult;
                            p.Physics.VelY += _wind.Y * p.Physics.WindFrictionMult;

                        }

                        //p.Physics.Position.Add(p.Physics.Velocity);
                        //p.Physics.Velocity.Add(p.Physics.Acceleration);
                        p.Physics.X += p.Physics.VelX;
                        p.Physics.Y += p.Physics.VelY;


                        p.Physics.X = Clamp(p.Physics.X, 0, _terrain.Map.Length - 1);
                        p.Physics.VelX += p.Physics.AccX;
                        p.Physics.VelY += p.Physics.AccY;
                        //p.Physics.VelX *= Constants.VelocityLoss;

                        p.Physics.Simulate();

                        //Console.WriteLine("Wind: {0} at {1}*", _wind.Magnitude, Deg(_wind.Direction));


                        if (SwinGame.KeyTyped(KeyCode.BKey))
                            _wind.SetWind();

                    }

                    _wind.Update();
                }
            }

            foreach (IPhysicsComponent p in _componentsToRemove)
            {
                _components.Remove(p);
            }
            _componentsToRemove.Clear();

        }

        public bool IsUnderTerrain(Point2D pt)
        {
            int x = (int)Clamp(pt.X, 0, Terrain.Map.Length - 1);
            if (pt.Y < Terrain.Map[x])
                return true;
            return false;
        }

        public void Clear()
        {
            _components.Clear();
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
            //_components.Remove(component);
            component.Physics.Enabled = false;
            _componentsToRemove.Add(component);
        }

        public void SetWind()
        {
            _wind.SetWind();
        }

        public void SetWind(float direction, float magnitude)
        {
            _wind.SetWind(direction, magnitude);
        }

        public void SetWindowRect(Rectangle windowRect)
        {
            _windowRect = windowRect;

            _boundaryBox = new Rectangle()
            {
                X = -Constants.BoundaryBoxPadding,
                Y = -Constants.BoundaryBoxPadding,
                Width = windowRect.Width + Constants.BoundaryBoxPadding * 2,
                Height = windowRect.Height + Constants.BoundaryBoxPadding * 2
            };
        }

        public void SetBoundaryBoxPos(Point2D pt)
        {
            _boundaryBox.X = Clamp(pt.X - Constants.BoundaryBoxPadding, 0, PhysicsEngine.Instance.Terrain.Map.Length);
            _boundaryBox.Y = pt.Y - Constants.BoundaryBoxPadding;
        }
        public void SetBoundaryBoxPos(int x, int y)
        {
            _boundaryBox.X = Clamp(x - Constants.BoundaryBoxPadding, 0, _terrain.Map.Length - 1);
            _boundaryBox.Y = y - Constants.BoundaryBoxPadding;
        }

        public float WindDirectionDeg { get => _wind.DirectionInDeg; }
        public float WindMarkerDirection { get => _wind.MarkerDirection; }
    }
}
