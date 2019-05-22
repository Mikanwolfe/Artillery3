using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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

        List<Entity> _components;
        List<Entity> _componentsToAdd;
        List<Entity> _componentsToRemove;

        A3Data _a3Data;

        #endregion

        #region Constructor
        public PhysicsEngine(A3Data a3Data)
        {
            _a3Data = a3Data;
        }

        #endregion

        #region Methods

        public void Initialise(A3Data a3Data)
        {
            _components.Clear();
            _componentsToAdd.Clear();
            _componentsToRemove.Clear();

            _a3Data = a3Data;

            foreach (Entity e in _a3Data.Entities)
            {
                IPhysicsComponent component = e as IPhysicsComponent;
                if (e != null)
                    _components.Add(e);
            }

        }

        public void Update()
        {
            
        }
        #endregion

        #region Properties

        #endregion
    }
}
