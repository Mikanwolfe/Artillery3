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
        Point2D _pos;
        public CameraFocusPoint()
        {
        }
        public Point2D Pos { get => _pos; set => _pos = value; }
    }
}
