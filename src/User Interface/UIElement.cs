using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public abstract class UIElement : DrawableObject
    {
        Point2D _pos;
        float _x;
        float _y;
        Camera _camera;

        public UIElement(Camera camera)
        {
            _camera = camera;
        }

        public Point2D Pos { get => new Point2D() { X = _x, Y = _y }; set { _x = value.X; _y = value.Y; } }
       
        public float X { get => _x; set => _x = value; }
        public float Y { get => _y; set => _y = value; }
        public Camera Camera { get => _camera; set => _camera = value; }
    }
}
