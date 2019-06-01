using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_WeaponEquipBox : UIElement
    {

        /*
         * Box Layouts:
         * +---------------+   +------+
         * |   Main        |   | Move |
         * +---------------+   +------+
         */
        A3RData _a3RData;

        Color _mainBoxColor;
        Color _targetMainBoxColor;

        Color _moveBoxColor;
        Color _targetMoveBoxColor;

        Color _textColor;
        Color _targetTextColor;

        Color _highlightMainColor;
        Color _highlightMoveColor;
        Color _targetHighlightColor;

        private bool _mouseOverMain, _mouseOverMove;
        private bool _mouseSelectedMain, _mouseSelectedMove;

        private Rectangle _moveBox;
        private Rectangle _mainBox;

        private Rectangle _moveBoxActiveArea;
        private Rectangle _mainBoxActiveArea;

        private Weapon _heldWeapon;

        private int _padding = 10;

        public Weapon HeldWeapon { get => _heldWeapon; set => _heldWeapon = value; }

        public UI_WeaponEquipBox(Camera camera, A3RData a3RData, Vector pos) 
            : base(camera)
        {
            _a3RData = a3RData;
            Pos = pos;

            _mainBox = new Rectangle()
            {
                X = Pos.X + Camera.Pos.X,
                Y = Pos.Y + Camera.Pos.Y,
                Width = 220,
                Height = 50
            };

            _moveBox = new Rectangle()
            {
                X = _mainBox.X + _mainBox.Width + 20,
                Y = _mainBox.Y,
                Width = 40,
                Height = _mainBox.Height
            };

            _mainBoxActiveArea = new Rectangle()
            {
                X = Pos.X + Camera.Pos.X,
                Y = Pos.Y + Camera.Pos.Y,
                Width = 220,
                Height = 50
            };

            _moveBoxActiveArea = new Rectangle()
            {
                X = _mainBox.X + _mainBox.Width + 20,
                Y = _mainBox.Y,
                Width = 30,
                Height = _mainBox.Height
            };



            _targetMainBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.2f);
            _targetMoveBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.2f);
            _targetTextColor = Color.White;
            _targetHighlightColor = Color.Pink;

            _mainBoxColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _moveBoxColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _textColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _highlightMainColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _highlightMoveColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);


        }

        public Color UpdateColor(Color c, Color target)
        {
            return SwinGame.RGBAColor(
                target.R,
                target.G,
                target.B,
                (byte)Clamp(c.A +1, 0, target.A));
        }

        public Color UpdateColor(Color c, Color target, int increment)
        {
            return SwinGame.RGBAColor(
                target.R,
                target.G,
                target.B,
                (byte)Clamp(c.A + increment, 0, target.A));
        }

        public override void Draw()
        {
            SwinGame.FillRectangle(_mainBoxColor, _mainBox);
            SwinGame.FillRectangle(_moveBoxColor, _moveBox);
            SwinGame.FillRectangle(_highlightMainColor, _mainBox);
            SwinGame.FillRectangle(_highlightMoveColor, _moveBox);
        }

        public override void Update()
        {
            _mainBox.X = Camera.Pos.X + Pos.X;
            _mainBox.Y = Camera.Pos.Y + Pos.Y;
            _moveBox.X = _mainBox.X + _mainBox.Width + 20;
            _moveBox.Y = _mainBox.Y;


            _mainBoxColor = UpdateColor(_mainBoxColor, _targetMainBoxColor);
            _moveBoxColor = UpdateColor(_moveBoxColor, _targetMoveBoxColor);
            _highlightMainColor = UpdateColor(_highlightMainColor, _targetHighlightColor, -5);
            _highlightMoveColor = UpdateColor(_highlightMainColor, _targetHighlightColor, -5);
            _textColor = UpdateColor(_textColor, _targetTextColor);

        }
    }
}
