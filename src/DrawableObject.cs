using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface IDrawable
    {
        void Draw();
    }
    public abstract class DrawableObject : UpdatableObject, IDrawable
    {
        //This needs to be made better.
        public DrawableObject()
        {
            _visible = true;
        }

        bool _visible;

        public bool Visible { get => _visible; set => _visible = value; }

        public abstract void Draw();

        public abstract override void Update();
    }
}
