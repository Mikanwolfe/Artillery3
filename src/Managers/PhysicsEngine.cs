using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class PhysicsEngine
    {

        #region Fields
        A3RData _a3RData;

        List<IPhysicsComponent> _components;
        List<IPhysicsComponent> _componentsToRemove;

        Rectangle _boundaryBox;
        Rectangle _windowRect;

        Random _random = new Random();
        #endregion

        #region Constructor

        public PhysicsEngine(A3RData a3RData)
        {
            _a3RData = a3RData;
            _windowRect = _a3RData.WindowRect;
            _components = new List<IPhysicsComponent>();
            _componentsToRemove = new List<IPhysicsComponent>();

            _boundaryBox = new Rectangle()
            {
                X = -Constants.BoundaryBoxPadding,
                Y = -Constants.BoundaryBoxPadding,
                Width = _a3RData.WindowRect.Width + Constants.BoundaryBoxPadding * 2,
                Height = _a3RData.WindowRect.Height + Constants.BoundaryBoxPadding * 2
            };


        }
        #endregion

        #region Methods
        

        public void Update()
        {

            if (_a3RData.Terrain == null)
                throw new MissingMemberException("No terrain to simulate with! Nothing to stop falls!");
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
                        if ((p.Physics.Position.Y >= _a3RData.Terrain.Map[(int)p.Physics.Position.X]) && p.Physics.CanCollideWithGround)
                        {
                            p.Physics.VelY = 0;
                            p.Physics.Y = _a3RData.Terrain.Map[(int)p.Physics.Position.X];
                            p.Physics.OnGround = true;

                        }
                        else
                        {
                            p.Physics.OnGround = false;
                        }

                        if (p.Physics.OnGround)
                        {
                            int x = (int)p.Physics.X;

                            float p1 = _a3RData.Terrain.Map[Clamp((int)(x - 1), 0, _a3RData.Terrain.Map.Length - 1)];
                            float p2 = _a3RData.Terrain.Map[Clamp((int)(x + 1), 0, _a3RData.Terrain.Map.Length - 1)];

                            p.Physics.VelX *= (float)Math.Cos(p.Physics.RelAngleToGround);
                            p.Physics.VelY *= (float)Math.Cos(p.Physics.RelAngleToGround);

                            if (p.Physics.HasGroundFriction)
                                p.Physics.VelX *= (1 - p.Physics.FricCoefficient);

                            p.Physics.AbsAngleToGround = (float)Math.Atan((p1 - p2) / (3));
                        }
                        else
                        {
                            
                            p.Physics.VelX += _a3RData.Wind.X * p.Physics.WindFrictionMult;
                            p.Physics.VelY += _a3RData.Wind.Y * p.Physics.WindFrictionMult;

                        }

                        //p.Physics.Position.Add(p.Physics.Velocity);
                        //p.Physics.Velocity.Add(p.Physics.Acceleration);
                        p.Physics.X += p.Physics.VelX;
                        p.Physics.Y += p.Physics.VelY;


                        p.Physics.X = Clamp(p.Physics.X, 0, _a3RData.Terrain.Map.Length - 1);
                        p.Physics.VelX += p.Physics.AccX;
                        p.Physics.VelY += p.Physics.AccY;
                        //p.Physics.VelX *= Constants.VelocityLoss;

                        p.Physics.Update();

                        //Console.WriteLine("Wind: {0} at {1}*",_a3RData.Wind.Magnitude, Deg(a3RData.Wind.Direction));



                    }

                    //_a3RData.Wind.Update();
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
            int x = (int)Clamp(pt.X, 0, _a3RData.Terrain.Map.Length - 1);
            if (pt.Y < _a3RData.Terrain.Map[x])
                return true;
            return false;
        }

        public void Clear()
        {
            _components.Clear();
        }
        public void Settle()
        {
            foreach (IPhysicsComponent p in _components)
            {
                p.Physics.Y = _a3RData.Terrain.Map[(int)p.Physics.X];
            }
        }

        public void BlowUpTerrain(float[] crater, Point2D pos)
        {
            int xPos;
            for (int i = 0; i < crater.Length - 1; i++)
            {
                xPos = (int)pos.X - (crater.Length / 2) + i;
                xPos = Clamp(xPos, 0, _a3RData.Terrain.Map.Length - 1);
                _a3RData.Terrain.Map[xPos] += crater[i];
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
            //_a3RData.Wind.SetWind();
        }

        public void SetWind(float direction, float magnitude)
        {
            //_a3RData.Wind.SetWind(direction, magnitude);
        }


        public void SetBoundaryBoxPos(Point2D pt)
        {
            _boundaryBox.X = Clamp(pt.X - Constants.BoundaryBoxPadding, 0, _a3RData.Terrain.Map.Length);
            _boundaryBox.Y = pt.Y - Constants.BoundaryBoxPadding;
        }
        public void SetBoundaryBoxPos(int x, int y)
        {
            _boundaryBox.X = Clamp(x - Constants.BoundaryBoxPadding, 0, _a3RData.Terrain.Map.Length - 1);
            _boundaryBox.Y = y - Constants.BoundaryBoxPadding;
        }
        #endregion

        #region Properties
        public float WindDirectionDeg { get => _a3RData.Wind.DirectionInDeg; }
        public float WindMarkerDirection { get => _a3RData.Wind.MarkerDirection; }
        public Rectangle BoundaryBox { get => _boundaryBox; }

        public Terrain Terrain => _a3RData.Terrain; 
        #endregion

    }
}
