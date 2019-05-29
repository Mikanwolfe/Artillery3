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

        int _height = 15;
        int _width = 15;
        string _text;

        Color _baseColor = Color.Black;
        Color _highlightColor = Color.Orange;

        Rectangle _buttonArea;
        Rectangle _fillArea;

        Vector _textPos;

        bool _checked = false;

        public bool Checked { get => _checked; set => _checked = value; }

        public UI_CheckBox(Camera camera, Vector pos, string text, bool isChecked)
            : this(camera, pos, text)
        {
            Pos = pos;
            _checked = isChecked;
        }
        public UI_CheckBox(Camera camera, Vector pos, string text)
            : base(camera)
        {
            _text = text;
            Pos = pos;
            _textPos = new Vector(pos.X + 20, pos.Y+4);

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
                SwinGame.DrawText(_text, Color.Black, _textPos.X, _textPos.Y);
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
