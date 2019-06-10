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

        public UI_StaticImage(Camera camera, float x, float y, Bitmap bitmap)
            : base(camera)
        {
            Visible = true;
            X = x;
            Y = y;

            _bitmap = bitmap;

            if (_bitmap != null)
            {
                _width = _bitmap.Width;
                _height = _bitmap.Height;

            }
        }


        public override void Draw()
        {
            if (Visible)
                SwinGame.DrawBitmap(_bitmap, X, Y);
        }

        public override void Update()
        {
            
        }

    }
}
