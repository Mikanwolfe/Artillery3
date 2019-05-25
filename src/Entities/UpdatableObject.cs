using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface IUpdatable
    {
        void Update();
        bool Enabled { get; set; }
    }


    public abstract class UpdatableObject : IUpdatable
    {
        public abstract void Update();

        public bool Enabled { get; set; } = true;

    }
}
