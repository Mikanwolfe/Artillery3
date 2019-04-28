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

        public Point2D Pos { get => _pos; set => _pos = value; }
        public Camera Camera { get => _camera; set => _camera = value; }
    }
}
