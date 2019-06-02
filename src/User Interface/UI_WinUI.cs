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
        Rectangle _backgroundRect2;
        Rectangle _backgroundRect3;
        int _height = 50;
        int _count = 0;
        int _bgTimeConst = 20;
        int _bgTimeConst2 = 50;

        public UI_WinUI(A3RData a3RData) : base(a3RData)
        {
            _backgroundRect = new Rectangle()
            {
                X = A3RData.Camera.Pos.X + A3RData.Camera.WindowRect.Width / 2,
                Y = A3RData.Camera.Pos.Y + A3RData.Camera.WindowRect.Height / 2,
                Height = 1,
                Width = 1
            };

            _backgroundRect2 = new Rectangle()
            {
                X = A3RData.Camera.Pos.X + A3RData.Camera.WindowRect.Width / 2,
                Y = A3RData.Camera.Pos.Y + A3RData.Camera.WindowRect.Height / 2,
                Height = 1,
                Width = 1
            };

            _backgroundRect3 = new Rectangle()
            {
                X = A3RData.Camera.Pos.X + A3RData.Camera.WindowRect.Width / 2,
                Y = A3RData.Camera.Pos.Y + A3RData.Camera.WindowRect.Height / 2,
                Height = 1,
                Width = 1
            };
        }

        public override void Draw()
        {
            SwinGame.FillRectangle(Color.White, _backgroundRect);
            SwinGame.FillRectangle(Color.White, _backgroundRect2);
            SwinGame.FillRectangle(Color.White, _backgroundRect3);

            SwinGame.DrawText( A3RData.SelectedPlayer.Name+" wins!", SwinGame.RGBAColor(20,20,50,255), SwinGame.FontNamed("winnerFont"),
                Camera.Pos.X + Width(0.45f), Camera.Pos.Y + Height(0.48f));
            base.Draw();
        }

        public override void Update()
        {
            _count++;

            
            if (_backgroundRect.Width < A3RData.WindowRect.Width)
            {
                _backgroundRect.X = A3RData.Camera.Pos.X + A3RData.Camera.WindowRect.Width / 2 - 5 * _count;
                _backgroundRect.Y = A3RData.Camera.Pos.Y + A3RData.Camera.WindowRect.Height / 2 - (_height + 400 * 1 / (_count * 0.05f)) / 2;

                _backgroundRect.Width = 10 * _count;
            }

            _backgroundRect.Height = _height + 400 * 1 / (_count * 0.05f);

            if (_backgroundRect2.Width < A3RData.WindowRect.Width)
            {
                _backgroundRect2.X = A3RData.Camera.Pos.X + A3RData.Camera.WindowRect.Width / 2 - 5 * (_count - _bgTimeConst);
                _backgroundRect2.Y = A3RData.Camera.Pos.Y + A3RData.Camera.WindowRect.Height / 2 - (_height + 400 * 1 / ((_count - _bgTimeConst) * 0.05f)) / 2;

                _backgroundRect2.Width = 10 * (_count - _bgTimeConst);
            }

            _backgroundRect2.Height = _height + 400 * 1 / ((_count - _bgTimeConst) * 0.05f);

            if (_backgroundRect3.Width < A3RData.WindowRect.Width)
            {
                _backgroundRect3.X = A3RData.Camera.Pos.X + A3RData.Camera.WindowRect.Width / 2 - 5 * (_count - _bgTimeConst2);
                _backgroundRect3.Y = A3RData.Camera.Pos.Y + A3RData.Camera.WindowRect.Height / 2 - (_height + 400 * 1 / ((_count - _bgTimeConst2) * 0.05f)) / 2;

                _backgroundRect3.Width = 10 * (_count - _bgTimeConst2);
            }

            _backgroundRect3.Height = _height + 400 * 1 / ((_count - _bgTimeConst2) * 0.05f);



            base.Update();
        }
    }
}
