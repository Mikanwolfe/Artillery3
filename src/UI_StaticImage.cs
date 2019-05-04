using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_StaticImage : UIElement
    {

        Bitmap _bitmap;

        int _height = 40;
        int _width = 150;

        float _x = 0;
        float _y = 0;

        public UI_StaticImage(float x, float y, Bitmap bitmap)
        {
            Visible = true;
            _x = x;
            _y = y;

            _bitmap = bitmap;

            if (_bitmap != null)
            {
                _width = _bitmap.Width;
                _height = _bitmap.Height;

            }
        }

        public float X { get => _x; set => _x = value; }
        public float Y { get => _y; set => _y = value; }

        public override void Draw()
        {
            if (Visible)
                SwinGame.DrawBitmap(_bitmap, _x, _y);
        }

        public override void Update()
        {
            
        }

    }
}
