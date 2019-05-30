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
        Vector _pos;
        Camera _camera;

        public UIElement(Camera camera)
        {
            _camera = camera;
            _pos = new Vector();
        }

        public float X { get => Pos.X; set => Pos.X = value; }
        public float Y { get => Pos.Y; set => Pos.Y = value; }
        public Camera Camera { get => _camera; set => _camera = value; }
        public Vector Pos { get => _pos; set => _pos = value; }
    }
}
