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
    }


    public abstract class UpdatableObject : IUpdatable
    {
        public UpdatableObject()
        {
        }
        public abstract void Update();


    }
}
