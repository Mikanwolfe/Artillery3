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
        Vector Pos { get; set; }
    }

    public class DrawableComponent : IDrawableComponent
    {
        Vector _pos;
        Sprite _sprite;
        
        public DrawableComponent(Sprite sprite)
        {
            _sprite = sprite;
        }

        public DrawableComponent(Bitmap bitmap)
            : this(new Sprite(bitmap))
        {

        }
        public void Draw()
        {
            _sprite.Draw(Pos.ToPoint2D);
        }

        public Vector Pos { get => _pos; set => _pos = value; }
        public double X { get => _pos.X; set => _pos.X = value; }
        public double Y { get => _pos.Y; set => _pos.Y = value; }
    }
}
