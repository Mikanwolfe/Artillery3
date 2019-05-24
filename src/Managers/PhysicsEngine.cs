using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static Artillery.Utilities;

namespace Artillery
{
    public interface IPhysicsEngine
    {
        void Update();
        void Initialise(A3Data a3Data);
    }
    public class PhysicsEngine : IPhysicsEngine, IUpdatable
    {

        #region Fields

        A3Data _a3Data;
        private bool _enabled;

        #endregion

        #region Constructor
        public PhysicsEngine(A3Data a3Data)
        {
            _a3Data = a3Data;
        }

        public bool Enabled { get => _enabled; set => _enabled = value; }

        #endregion

        #region Methods

        public void Initialise(A3Data a3Data)
        {
            _enabled = true;
        }

        public void Update()
        {
            if (!Enabled)
            {
                IPhysicsComponent component;
                foreach (Entity e in _a3Data.Entities)
                {
                    component = e as IPhysicsComponent;
                    if (component != null)
                    {
                        Simulate(component);
                    }
                }
            }
        }

        private void Simulate(IPhysicsComponent e)
        {
            if (_a3Data.LogicalTerrain == null)
                throw new MissingMemberException("No terrain to simulate with! Nothing to stop falls!");

            if (e.Enabled)
            {
                e.Pos.X = Clamp(e.Pos.X, 0, _a3Data.LogicalTerrain.Map.Length);

                if (e.GravityEnabled)
                    e.Vel.Y += Artillery.Constants.Gravity * e.WeightMult;

                if ((e.Pos.Y >= _a3Data.LogicalTerrain.Map[(int)e.Pos.X]) 
                             && e.CanCollideWithGround)
                {
                    e.Vel.Y = 0;
                    e.Pos.Y = _a3Data.LogicalTerrain.Map[(int)e.Pos.X];
                    e.OnGround = true;

                }
                else
                {
                    e.OnGround = false;
                }

                if (e.OnGround)
                {
                    int x = (int)e.Pos.X;

                    float p1 = _a3Data.LogicalTerrain.Map[Clamp((x - 1),
                        0, _a3Data.LogicalTerrain.Map.Length - 1)];
                    float p2 = _a3Data.LogicalTerrain.Map[Clamp((x + 1),
                        0, _a3Data.LogicalTerrain.Map.Length - 1)];

                    e.Vel.X *= (float)Math.Cos(e.RelAngle);
                    e.Vel.Y *= (float)Math.Cos(e.RelAngle);

                    if (e.HasGroundFriction)
                        e.Vel.X *= (1 - e.FricCoef);

                    e.AbsAngle= Math.Atan((p1 - p2) / (3));
                }
                else
                {

                    //p.Physics.VelX += _wind.X * p.Physics.WindFrictionMult;
                    //p.Physics.VelY += _wind.Y * p.Physics.WindFrictionMult;

                }



                e.Pos += e.Vel;


            }


        }
        #endregion

        #region Properties

        #endregion
    }
}
