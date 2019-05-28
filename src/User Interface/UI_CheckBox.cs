using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_CheckBox : UIElement
    {
        Bitmap _bitmap;
        Bitmap _selectedBitmap;

        int _height = 20;
        int _width = 20;
        string _text;

        Color _baseColor = Color.Black;
        Color _highlightColor = Color.Orange;

        Rectangle _buttonArea;
        Rectangle _fillArea;

        bool _checked = false;

        public UI_CheckBox(Camera camera, string text, bool isChecked)
            : this(camera, text)
        {
            _checked = isChecked;
        }
        public UI_CheckBox(Camera camera, string text)
            : base(camera)
        {
            _text = text;
            

            _buttonArea = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = _width,
                Height = _height
            };

            _fillArea = new Rectangle()
            {
                X = Pos.X + 3,
                Y = Pos.Y + 3,
                Width = _width - 6,
                Height = _height - 6
            };

        }



        public override void Draw()
        {
            if (_bitmap == null)
            {
                SwinGame.DrawRectangle(_baseColor, _buttonArea);
                if (_checked)
                {
                    SwinGame.FillRectangle(_highlightColor, _fillArea);
                }
            }
        }

        public override void Update()
        {
            if (SwinGame.PointInRect(SwinGame.MousePosition(), _buttonArea))
            {
                if (SwinGame.MouseClicked(MouseButton.LeftButton))
                    _checked = !_checked;

            }
        }
    }
}
