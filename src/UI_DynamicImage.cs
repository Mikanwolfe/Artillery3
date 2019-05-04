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
        int _easeSpeed = 10;
        float _animationCount = 0;
        public UI_DynamicImage(float x, float y, float startX, float startY, int easeSpeed, Bitmap bitmap) 
            : base(startX, startY, bitmap)
        {
            _targetX = x;
            _targetY = y;
            _easeSpeed = easeSpeed;
        }

        public override void Draw()
        {
            base.Draw();
        }

        public override void Update()
        {
            _animationCount += 0.005f;
            if (_animationCount > 1f)
            {
                _animationCount = 0f;
            }
            X += (_targetX - X) / _easeSpeed;
            X += 0.5f * (float)Math.Sin(_animationCount * Math.PI * 2);

            Y += (_targetY - Y) / _easeSpeed;
        }
    }
}
