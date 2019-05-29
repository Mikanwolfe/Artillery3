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
        }
        public Vector Pos { get => _pos; set => _pos = value; }
    }
}
