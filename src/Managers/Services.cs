using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface IServices : IUpdatable, IDrawable
    {
        
    }
    public class Services : IServices
    {

        #region Fields
        private static Services _instance;
        private EntityManager _entityManager;
        private PhysicsEngine _physicsEngine;
        private ParticleEngine _particleEngine;
        private ICommandProcessor _commandProcessor;

        private bool _enabled = true;

        private List<IServices> _services;

        private A3RData _a3RData;

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
            _commandProcessor.Update(_a3RData);

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

        public void Initialise(A3RData a3RData)
        {
            _a3RData = a3RData;
            _entityManager = new EntityManager(_a3RData);
            _physicsEngine = new PhysicsEngine(_a3RData);
            _particleEngine = new ParticleEngine(_a3RData);

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

        public void SetPhysicsEngine(PhysicsEngine p)
        {
            _physicsEngine = p;
        }

        public void SetEntityManager(EntityManager e)
        {
            _entityManager = e;
        }

        public void SetCommandProcessor(ICommandProcessor c)
        {
            _commandProcessor = c;
        }

        #endregion

        #region Properties
        public EntityManager EntityManager { get => _entityManager; set => _entityManager = value; }
        public PhysicsEngine PhysicsEngine { get => _physicsEngine; set => _physicsEngine = value; }
        public ParticleEngine ParticleEngine { get => _particleEngine; set => _particleEngine = value; }
        public bool Enabled { get => _enabled; set => _enabled = value; }
        public A3RData A3RData { get => _a3RData; set => _a3RData = value; }
        #endregion
    }
}
