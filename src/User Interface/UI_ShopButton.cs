using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    class UI_ShopButton : UIElement
    {
        Color _boxColor;
        Color _targetBoxColor;
        Color _textColor;
        Color _targetTextColor;

        Color _highlightColor;
        Color _targetHighlightColor;

        Color _iconBoxHighlight;

        int _cost;

        object _itemBeingBought;

        private bool _mouseOver;
        private bool _mouseSelected;

        byte _alphaValueIncrement = 1;

        Rectangle _mainBox;

        Rectangle _iconBox;

        public object ItemBeingBought { get => _itemBeingBought; set => _itemBeingBought = value; }
        public int Cost { get => _cost; set => _cost = value; }
        public Color IconBoxHighlight { get => _iconBoxHighlight; set => _iconBoxHighlight = value; }

        public UI_ShopButton(Camera camera, Vector pos) 
            : base(camera)
        {
            _targetBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.2f);
            _targetTextColor = Color.White;
            _targetHighlightColor = Color.Pink;
            

            _boxColor = SwinGame.RGBAFloatColor(0,0,0,0);
            _textColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _highlightColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);

            Pos = pos;

            _mainBox = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = 850,
                Height = 120
            };

            _iconBox = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = 100,
                Height = 100
            };
        }

        public override void Draw()
        {


            SwinGame.FillRectangle(_boxColor, _mainBox);
            SwinGame.FillRectangle(_highlightColor, _mainBox);

            SwinGame.DrawRectangle(_iconBoxHighlight, _iconBox);

            if (_mouseOver || _mouseSelected)
            {
                SwinGame.DrawRectangle(_targetHighlightColor, _mainBox);
            }
        }

        public Color UpdateColor(Color c, Color target)
        {
            return SwinGame.RGBAColor(
                target.R,
                target.G,
                target.B,
                (byte)Clamp(c.A + _alphaValueIncrement, 0, target.A));
        }

        public Color UpdateColor(Color c, Color target, int increment)
        {
            return SwinGame.RGBAColor(
                target.R,
                target.G,
                target.B,
                (byte)Clamp(c.A + increment, 0, target.A));
        }

        public override void Update()
        {
            if (_mouseSelected)
            {
                _targetBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.5f);
            }
            else
            {
                _targetBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.2f);
            }

            _mouseOver = (SwinGame.PointInRect(new Point2D()
            {
                X = SwinGame.MouseX() + Camera.Pos.X,
                Y = SwinGame.MouseY() + Camera.Pos.Y
            }, _mainBox));

            if (_mouseOver)
            {
                if (SwinGame.MouseClicked(MouseButton.LeftButton))
                {
                    _mouseSelected = !_mouseSelected;
                    _highlightColor = _targetHighlightColor;
                    //invoke stuff here
                }
            }
                

            _boxColor = UpdateColor(_boxColor, _targetBoxColor);
            _highlightColor = UpdateColor(_highlightColor, _targetHighlightColor, -5);
            _textColor = UpdateColor(_textColor, _targetBoxColor);
        }
    }
}
