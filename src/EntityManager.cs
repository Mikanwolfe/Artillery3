using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    /*
     * A singleton for the purpose of keeping track of and being the topmost node
     *  in the entity composite tree.
    */
    class EntityManager : Entity
    {
        private static EntityManager instance;
        private static List<Entity> _entities;
        private EntityManager()
            : base("Entity Manager")
        {
            instance = this;
            _entities = new List<Entity>();
        }

        public static EntityManager Instance
        {
            get
            {
                if (instance == null)
                    instance = new EntityManager();
                return instance;
            }
        }

        public List<Entity> Entities { get => _entities; }

        public void Add(Entity e)
        {
            Entities.Add(e);
        }
        public int Count
        {
            get => Entities.Count();
        }

        public override string ShortDesc { get => "Entity Manager" ; }
        public override string LongDesc { get => "The topmost node in the Entity Tree."; }

        public override void Draw()
        {
            foreach(Entity e in Entities)
            {
                e.Draw();
            }
        }

        public override void Update()
        {
            foreach(Entity e in Entities)
            {
                e.Update();
            }
        }
    }
}
