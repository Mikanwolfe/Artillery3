using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IServices : IUpdatable, IDrawable
    {

    }
    public class Services : IServices
    {

        #region Fields
        private static Services _instance;
        private IEntityManager _entityManager;
        private IPhysicsEngine _physicsEngine;
        private ICommandProcessor _commandProcessor;

        private bool _enabled = true;

        private List<IServices> _services;

        private A3Data _a3Data;

        #endregion

        #region Constructor
        private Services()
        {
            _instance = this;
            _services = new List<IServices>();
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
            _commandProcessor.Update(_a3Data);

            foreach (IServices s in _services)
            {
                if (s.Enabled)
                    s.Update();
            }
        }

        public void Draw()
        {
            _entityManager.Draw();

            foreach (IServices s in _services)
            {
                if (s.Enabled)
                    s.Draw();
            }
        }

        public void Initialise(A3Data a3Data)
        {
            _a3Data = a3Data;
            _entityManager = new EntityManager(_a3Data);
            _physicsEngine = new PhysicsEngine(_a3Data);

            _commandProcessor = new CommandProcessor();
        }

        public void AddService(IServices service)
        {
            _services.Add(service);
        }

        public void ClearServices()
        {
            _services.Clear();
        }

        public void SetPhysicsEngine(IPhysicsEngine p)
        {
            _physicsEngine = p;
        }

        public void SetEntityManager(IEntityManager e)
        {
            _entityManager = e;
        }

        public void SetCommandProcessor(ICommandProcessor c)
        {
            _commandProcessor = c;
        }

        #endregion

        #region Properties
        public IEntityManager EntityManager { get => _entityManager; set => _entityManager = value; }
        public IPhysicsEngine PhysicsEngine { get => _physicsEngine; set => _physicsEngine = value; }
        public bool Enabled { get => _enabled; set => _enabled = value; }
        #endregion
    }
}
