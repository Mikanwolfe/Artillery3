using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;


namespace ArtillerySeries.src
{
    public class UI_Box : UIElementAssembly
    {
        protected int _width;
        protected int _height;
        bool _onScreen = true;
        string _text;

        protected Color _color;
        protected Color _targetColor;
        protected Color _textColor;
        byte _colorAlpha;

        public UI_Box(A3RData a3RData, int width, int height, Vector pos) 
            : base(a3RData)
        {
            _width = width;
            _height = height;
            Pos = pos;
            _color = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.5f);
            _textColor = Color.White;

            _colorAlpha = 0;
        }

        

        public override void Draw()
        {
            if (_onScreen)
            {
                SwinGame.FillRectangle(_targetColor, A3RData.Camera.Pos.X + Pos.X, A3RData.Camera.Pos.Y + Pos.Y, _width, _height);
                if (_text != null)
                {
                    SwinGame.DrawText(_text, _textColor, A3RData.Camera.Pos.X + Pos.X, A3RData.Camera.Pos.Y + Pos.Y);
                }
            }
            else
            {
                SwinGame.DrawRectangle(_targetColor, Pos.X, Pos.Y, _width, _height);
                SwinGame.DrawText(_text, Color.White, Pos.X, Pos.Y);
            }
            
            base.Draw();
        }

        public override void Update()
        {
            if (_colorAlpha < _color.A)
            {
                _colorAlpha+=2;
            }
            else
            {
                _colorAlpha = _color.A;
            }

            _targetColor = SwinGame.RGBAColor(_color.R, _color.B, _color.G, _colorAlpha);

            base.Update();
        }
        public void DetachFromScreen()
        {
            _onScreen = false;
        }

        public void LockToScreen()
        {
            _onScreen = true;
        }


        public bool OnScreen { get => _onScreen; set => _onScreen = value; }
        public Color Color { get => _color; set => _color = value; }
        public string Text { get => _text; set => _text = value; }
    }
}
