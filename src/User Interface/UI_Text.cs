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

        public UI_Text(float x, float y, Color txtColor, string text)
        {
            _text = text;
            X = x;
            Y = y;
            _color = txtColor;
            
        }

        public UI_Text(float x, float y, Color txtColor, string text, bool isCentered)
            : this(x, y, txtColor, text)
        {
            _isCentered = isCentered;
        }

        public override void Draw()
        {
            if (_isCentered)
            {
                DrawTextCentre(_text, _color, Pos);
            } else
            {
                SwinGame.DrawText(_text, _color, X, Y);
            }
        }

        public override void Update()
        {
        }
    }
}
