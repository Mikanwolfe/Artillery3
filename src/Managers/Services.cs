using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IServices
    {
        void Update();
        void Draw();
    }
    public class Services : IServices
    {

        #region Fields
        private static Services _instance;
        private IEntityManager _entityManager;
        private IPhysicsEngine _physicsEngine;
        private A3Data _a3Data;

        #endregion

        #region Constructor
        private Services()
        {
            _instance = this;
        }
        public static Services Instance
        {
            get
            {
                if (_instance == null)
                    _instance = new Services();
                return _instance;
            }
        }

        #endregion

        #region Methods

        public void Update()
        {
            _entityManager.Update();
            _physicsEngine.Update();
        }

        public void Draw()
        {
            _entityManager.Draw();
        }

        public void Initialise(A3Data a3Data)
        {
            _a3Data = a3Data;
            _entityManager = new EntityManager(_a3Data);
            _physicsEngine = new PhysicsEngine(_a3Data);
        }
        #endregion

        #region Properties
        public IEntityManager EntityManager { get => _entityManager; set => _entityManager = value; }
        public IPhysicsEngine PhysicsEngine { get => _physicsEngine; set => _physicsEngine = value; }
        #endregion
    }
}
