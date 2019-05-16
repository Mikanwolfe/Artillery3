using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    public abstract class UIElement : DrawableObject
    {
        Point2D _pos;
        Camera _camera = UserInterface.Instance.Camera;
        float _x;
        float _y;

        Rectangle _windowRect = UserInterface.Instance.WindowRect;


        public float Height(float percent) { return _windowRect.Height* percent; }
        public float Width(float percent) { return _windowRect.Width * percent; }

        public Point2D Pos { get => new Point2D() { X = _x, Y = _y }; set { _x = value.X; _y = value.Y; } }
        
        public Camera Camera { get => _camera; set => _camera = value; }
        public float X { get => _x; set => _x = value; }
        public float Y { get => _y; set => _y = value; }
    }
}
