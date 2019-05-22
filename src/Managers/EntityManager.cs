using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IEntityManager
    {
        void AddEntity(Entity e);
        void RemoveEntity(Entity e);
        void Update();
        void Draw();
        bool HasEntity(Entity e);
        bool HasEntity(string name);
        List<Entity> Entities { get; }
    }
    public class EntityManager : IEntityManager
    {
        #region Fields
        List<Entity> _entities;
        List<Entity> _entitiesToAdd;
        List<Entity> _entitiesToRemove;

        #endregion

        #region Constructor
        public EntityManager()
        {
            _entities = new List<Entity>();
            _entitiesToAdd = new List<Entity>();
            _entitiesToRemove = new List<Entity>();

        }
        #endregion

        #region Methods

        public void Update()
        {
            foreach(Entity e in _entities)
            {
                if(e.Enabled)
                    e.Update();
                if (e.ToBeRemoved)
                    RemoveEntity(e);
            }

            foreach (Entity e in _entitiesToAdd)
            {
                if (e.Enabled)
                    e.Update();
                _entities.Add(e);
            }

            foreach(Entity e in _entitiesToRemove)
            {
                _entities.Remove(e);
            }

            _entitiesToAdd.Clear();
            _entitiesToRemove.Clear();
        }

        public void Draw()
        {
            foreach (Entity e in _entities)
            {
                e.Draw();
            }
        }

        public void AddEntity(Entity e)
        {
            _entitiesToAdd.Add(e);
        }

        public bool HasEntity(Entity e)
        {
            throw new NotImplementedException();
        }

        public bool HasEntity(string name)
        {
            throw new NotImplementedException();
        }

        public void RemoveEntity(Entity e)
        {
            _entitiesToRemove.Add(e);
        }

        #endregion

        #region Properties
        public List<Entity> Entities { get => _entities; }
        #endregion

    }
}
