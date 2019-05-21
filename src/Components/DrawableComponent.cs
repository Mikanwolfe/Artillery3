using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{
    public interface IDrawableComponent
    {
        void Draw();
    }

    public class DrawableComponent : IDrawableComponent
    {
        Sprite _sprite;
        
        public DrawableComponent(Sprite sprite)
        {
            _sprite = sprite;
        }

        public DrawableComponent(Bitmap bitmap)
            : this(new Sprite(bitmap))
        {

        }
        public virtual void Draw()
        {
            _sprite.Draw(new ZeroVector().ToPoint2D);
        }
    }
}
