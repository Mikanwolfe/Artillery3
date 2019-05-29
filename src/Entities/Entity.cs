using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    // A leaf node of the composite pattern used for entities.
    // Entities are defined as any game thing that is not the UI.
    // That should have its own composite tree or will be integrated here slowly.
    // Entities have a position and angle, and face a certain direction, though they don't need to be utilised.
    public abstract class Entity : DrawableObject, ICameraCanFocus
    {
        // PhysicsComponent _physicsComponent

        string _name;
        string _shortDesc;
        string _longDesc;
        Vector _pos;
        FacingDirection _direction;
        float _absAngle;

        bool _enabled;

        public Entity(string name)
        {
            _name = name;
            _pos = new Vector();
            _direction = FacingDirection.Left;
            _absAngle = 0;
            _enabled = true;


        }

        public string Name { get => _name; set => _name = value; }
        public Vector Pos { get => _pos; set => _pos = value; }
        public virtual string ShortDesc { get => _name; set => _shortDesc = value; }
        public virtual string LongDesc { get => "A " + _name; set => _longDesc = value; }
        internal FacingDirection Direction { get => _direction; set => _direction = value; }
        public float AbsoluteAngle { get => _absAngle; set => _absAngle = value; }

        public abstract override void Draw();

        public abstract override void Update();

        public virtual void Damage(float damage)
        {
            //Base: Do nothing. Can't  be damaged.
        }

        public virtual void UpdatePosition(Vector pos, FacingDirection direction, float absoluteAngle)
        {
            _absAngle = absoluteAngle;
            _pos = pos;
            _direction = direction;
        }

    }
}
