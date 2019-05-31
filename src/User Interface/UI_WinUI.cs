using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_WinUI : UIElementAssembly
    {

        Rectangle _backgroundRect;
        int _height = 50;
        int _count = 0;
        public UI_WinUI(A3RData a3RData) : base(a3RData)
        {
            _backgroundRect = new Rectangle()
            {
                X = A3RData.Camera.Focus.Pos.X,
                Y = A3RData.Camera.Focus.Pos.Y,
                Height = 1,
                Width = 1
            };
        }

        public override void Draw()
        {
            SwinGame.FillRectangle(Color.BlueViolet, _backgroundRect);
            base.Draw();
        }

        public override void Update()
        {
            _count++;
            if (_backgroundRect.Width < A3RData.WindowRect.Width)
            {
                _backgroundRect.X -= 5;
                _backgroundRect.Width = 10 * _count;
            }

            _backgroundRect.Height = _count * _count - (_count - 60) * (_count - 60);



            base.Update();
        }
    }
}
