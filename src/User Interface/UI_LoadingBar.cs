using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_LoadingBar : UIElement
    {

        float _fillPercentage;
        int _width, _height;
        Color _color;
        float _playerPreviousPercentage;


        public UI_LoadingBar()
            : this(70, 20)
        {
        }

        public UI_LoadingBar(int width, int height)
            : this(width, height, Color.Orange, ZeroPoint2D())
        {
            
        }

        public UI_LoadingBar(int width, int height, Color clr, Point2D pos)
        {
            Pos = pos;
            _width = width;
            _height = height;
            _color = clr;
            Camera = UserInterface.Instance.Camera;
        }

        public UI_LoadingBar(int width, int height, Color clr, float x, float y)
            : this(width, height, clr, new Point2D() { X = x, Y = y })
        {
        }

        

        public override void Draw()
        {
            if (Camera != null)
            {
                SwinGame.FillRectangle(Color.Black, Pos.X + Camera.Pos.X, Pos.Y + 10 + Camera.Pos.Y, _width, _height - 20);
                SwinGame.FillRectangle(_color, Pos.X + Camera.Pos.X, Pos.Y + 5 + Camera.Pos.Y, _width * _fillPercentage, _height - 10);

                SwinGame.FillRectangle(Color.Black, Pos.X + Camera.Pos.X, Pos.Y + Camera.Pos.Y, 3, _height);
                SwinGame.FillRectangle(Color.Black, Pos.X + Camera.Pos.X + _width - 2, Pos.Y + Camera.Pos.Y, 3, _height);

                SwinGame.DrawLine(Color.Black, Camera.Pos.X + Pos.X + _width * _playerPreviousPercentage,
                    Pos.Y + Camera.Pos.Y, Camera.Pos.X + Pos.X + _width * _playerPreviousPercentage, Camera.Pos.Y + Pos.Y + _height);

            }
        }

        public override void Update()
        {
        }

        public void SetPlayerPreviousPercentage(float percentage)
        {
            _playerPreviousPercentage = percentage;
        }
        public void UpdateLoadingBar(float percentage)
        {
            _fillPercentage = Clamp(percentage, 0, 1);
        }

    }
}
