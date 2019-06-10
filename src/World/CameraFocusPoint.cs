using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class CameraFocusPoint : ICameraCanFocus
    {
        Vector _pos;
        public CameraFocusPoint()
        {
            _pos = new Vector();
        }
        public Point2D Pos { get => _pos.ToPoint2D; set => _pos = new Vector(value); }
        public Vector Vector { get => _pos; set => _pos = value; }
    }
}
