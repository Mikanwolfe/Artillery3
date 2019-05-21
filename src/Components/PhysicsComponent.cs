using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IPhysicsComponent
    {
        PhysicsComponent Physics { get; set; }
    }
    public class PhysicsComponent : UpdatableObject
    {
        #region Fields
        bool _toBeRemoved = false;
        #endregion

        #region Constructor
        public PhysicsComponent()
        {

        }

        #endregion

        public override void Update()
        {
            throw new NotImplementedException();
        }
        #region Methods
        #endregion

        #region Properties
        #endregion

    }
}
