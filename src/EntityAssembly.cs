using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    // A branch/group of the composite pattern used for entities.
    abstract class EntityAssembly : Entity
    {

        List<Entity> _entities;
        protected List<Entity> Entities { get => _entities; }

        public EntityAssembly(string name)
            :base(name)
        {
            _entities = new List<Entity>();
            Visible = true;
        }


        public override void Draw()
        {
            foreach(Entity e in Entities)
            {
                e.Draw();
            }
        }

        public override void Update()
        {
            foreach (Entity e in Entities)
            {
                e.Update();
                e.UpdatePosition(Pos, Direction, AbsoluteAngle);
            }
        }

        
    }
}
