using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_Text : UIElement
    {

        string _text;
        bool _isCentered = false;
        Color _color;

        public UI_Text(Camera camera, float x, float y, Color txtColor, string text)
            :base (camera)
        {
            _text = text;
           Pos.X = x;
           Pos.Y = y;
            _color = txtColor;
            
        }

        public UI_Text(Camera camera, float x, float y, Color txtColor, string text, bool isCentered)
            : this(camera, x, y, txtColor, text)
        {
            _isCentered = isCentered;
        }

        public override void Draw()
        {
            if (_isCentered)
            {
                DrawTextCentre(_text, _color, Pos.ToPoint2D);
            } else
            {
                SwinGame.DrawText(_text, _color, X, Y);
            }
        }

        public override void Update()
        {
        }

        public string Text { get => _text; set => _text = value; }
    }
}
