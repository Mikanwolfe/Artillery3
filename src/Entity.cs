using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    // A leaf node of the composite pattern used for entities.
    // Entities are defined as any game thing that is not the UI.
    // That should have its own composite tree or will be integrated here slowly.
    abstract class Entity : DrawableObject
    {
        // PhysicsComponent _physicsComponent

        string _name;
        string _shortDesc;
        string _longDesc;

        public Entity(string name)
        {
            _name = name;
        }

        public string Name { get => _name; set => _name = value; }
        public virtual string ShortDesc { get => _name; set => _shortDesc = value; }
        public virtual string LongDesc { get => "A " + _name; set => _longDesc = value; }

        public abstract override void Draw();

        public abstract override void Update();

    }
}
