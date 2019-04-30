using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    class UI_Button : UIElement
    {
        public event EventHandler<UIEventArgs> OnUIEvent;

        Bitmap _bitmap;

        int _height = 40;
        int _width = 150;
        string _text;
        bool _isMouseOver = false;

        UIEvent _uiEvent;


        Color _baseColor = Color.Black;
        Color _highlightColor = Color.Orange;


        public UI_Button(string text, float x, float y, UIEvent uiEvent)
        {
            _text = text;
            Pos = new Point2D() { X = x, Y = y };

            _uiEvent = uiEvent;
        }

        public UI_Button(string text, float x, float y, UIEvent uiEvent, Bitmap bitmap)
            : this(text, x, y, uiEvent)
        {
            _bitmap = bitmap;
        }

        public override void Draw()
        {
            if (_bitmap == null)
            {
                if (_isMouseOver)
                    SwinGame.DrawRectangle(_highlightColor, Pos.X, Pos.Y, _width, _height);
                else
                    SwinGame.DrawRectangle(_baseColor, Pos.X, Pos.Y, _width, _height);
                DrawTextCentre(_text, Color.Black, Pos.X + _width / 2 - 5, Pos.Y + _height / 2 - 5);
            }
            else
            {
                SwinGame.DrawBitmap(_bitmap, Pos.X, Pos.Y);

                if (_isMouseOver)
                    SwinGame.DrawRectangle(_highlightColor, Pos.X, Pos.Y, _width, _height);
            }
            
        }

        public override void Update()
        {
            if (SwinGame.PointInRect(SwinGame.MousePosition(), Pos.X, Pos.Y, _width, _height))
                _isMouseOver = true;
            else
                _isMouseOver = false;

            if (_isMouseOver && SwinGame.MouseClicked(MouseButton.LeftButton) && OnUIEvent != null)
            {
                OnUIEvent(this, new UIEventArgs(_uiEvent));
            }
        }
    }
}
