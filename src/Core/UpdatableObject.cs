using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IUpdatable
    {
        void Update();
    }
    public abstract class UpdatableObject : IUpdatable
    {
        bool _enabled;
        public UpdatableObject()
        {
            _enabled = true;
        }

        public bool Enabled { get => _enabled; set => _enabled = value; }

        public abstract void Update();
    }
}
