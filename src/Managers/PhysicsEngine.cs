using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IPhysicsEngine
    {

    }
    public class PhysicsEngine : IPhysicsEngine, IUpdatable
    {

        #region Fields
        A3Data _a3Data;

        #endregion

        #region Constructor
        public PhysicsEngine(A3Data a3Data)
        {
            _a3Data = a3Data;
        }

        #endregion

        #region Methods
        public void Update()
        {
            
        }
        #endregion

        #region Properties

        #endregion
    }
}
