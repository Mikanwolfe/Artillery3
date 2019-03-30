using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    interface IDrawable
    {
        void Draw();
    }
    abstract class DrawableObject : UpdatableObject, IDrawable
    {
        bool _visible;

        public bool Visible { get => _visible; set => _visible = value; }

        public abstract void Draw();

        public abstract override void Update();
    }
}
