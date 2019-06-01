using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_SelectableTextBox : UI_TextBox
    {
        private bool _mouseOver;
        private Color _highlightColour;
        Rectangle _activeMouseArea;
        Rectangle _rectangleArea;

        byte _alphaValue;

        public delegate void PlayerSelectedWeapon();
        PlayerSelectedWeapon _playerSelectedWeapon;
        private bool _mouseSelected;

        public UI_SelectableTextBox(A3RData a3RData, int width, int height, Vector pos)
            : base(a3RData, width, height, pos)
        {
            _activeMouseArea = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = width,
                Height = height
            };

            _rectangleArea = new Rectangle()
            {
                X = Pos.X + Camera.Pos.X,
                Y = Pos.Y + Camera.Pos.Y,
                Width = width,
                Height = height
            };


        }

        public override void Draw()
        {
            if (_alphaValue > 0)
            {
                SwinGame.FillRectangle(SwinGame.RGBAColor(
                Color.LightPink.R,
                Color.LightPink.G,
                Color.LightPink.B,
                _alphaValue), _rectangleArea);
            }

            base.Draw();

            if (_mouseOver || _mouseSelected)
            {
                SwinGame.DrawRectangle(Color.LightPink, _rectangleArea);
            }

        }

        public override void Update()
        {
            _rectangleArea.X = Pos.X + Camera.Pos.X;
            _rectangleArea.Y = Pos.Y + Camera.Pos.Y;

            if (_alphaValue > 6)
                _alphaValue -= 6;
            else
                _alphaValue = 0;

            _mouseOver = (SwinGame.PointInRect(SwinGame.MousePosition(), _activeMouseArea));
            if (_mouseOver)
            {
                if (SwinGame.MouseClicked(MouseButton.LeftButton))
                {
                    _alphaValue = 255;
                    _mouseSelected = !_mouseSelected;
                    _playerSelectedWeapon?.Invoke();
                }
                    
            }


            base.Update();
        }

        public PlayerSelectedWeapon OnPlayerSelectWeapon { get => _playerSelectedWeapon; set => _playerSelectedWeapon = value; }
        public bool Selected { get => _mouseSelected; set => _mouseSelected = value; }
    }
}
