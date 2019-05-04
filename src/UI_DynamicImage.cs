using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_DynamicImage : UI_StaticImage
    {

        float _targetX = 0;
        float _targetY = 0;
        public UI_DynamicImage(float x, float y, Bitmap bitmap) 
            : base(-1000, 0, bitmap)
        {
            _targetX = x;
            _targetY = y;
        }

        public override void Draw()
        {
            base.Draw();
        }

        public override void Update()
        {
            Console.WriteLine("Updating Dynamic image");
            X += (_targetX - X) / 10;
        }
    }
}
