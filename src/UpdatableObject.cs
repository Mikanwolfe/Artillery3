using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    interface IUpdatable
    {
        void Update();
    }

    interface IObject
    {
        void Initialise();
    }

    abstract class UpdatableObject : IUpdatable, IObject
    {
        bool _enabled;
        float _x, _y;

        public bool Enabled { get => _enabled; set => _enabled = value; }
        public float X { get => _x; set => _x = value; }
        public float Y { get => _y; set => _y = value; }

        public UpdatableObject()
        {
            _x = 0;
            _y = 0;
            _enabled = true;
        }

        public UpdatableObject(float x, float y, bool enabled)
        {
            _x = x;
            _y = y;
            _enabled = enabled;
        }

        public abstract void Initialise();
        public abstract void Update();


    }
}
