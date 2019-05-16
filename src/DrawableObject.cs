using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{

    public interface IDrawable
    {
        void Draw();
    }

    public abstract class DrawableObject : UpdatableObject, IDrawable
    {
        bool _visible;
        public DrawableObject()
        {
            _visible = true;
        }

        public abstract void Draw();
    }
}
