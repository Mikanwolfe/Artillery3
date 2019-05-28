using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    class UI_Button : UIElement
    {
        public event EventHandler<UIEventArgs> OnUIEvent;

        Bitmap _bitmap;
        Bitmap _selectedBitmap;
        int _height = 40;
        int _width = 150;
        string _text;
        bool _isMouseOver = false;
        Rectangle _buttonArea;
        bool _middleAligned = false;
        UIEventArgs _uiEventArgs;
        Color _baseColor = Color.Black;
        Color _highlightColor = Color.Orange;
        SoundEffect _mouseOverSoundEffect;



        public UI_Button(Camera camera, string text, float x, float y, UIEvent uiEvent)
            : base(camera)
        {
            _text = text;
            Pos = new Point2D() { X = x, Y = y };

            _uiEventArgs = new UIEventArgs(uiEvent);
        }

        public UI_Button(Camera camera, string text, float x, float y, UIEventArgs uiEvent)
            : base(camera)
        {
            _text = text;
            Pos = new Point2D() { X = x, Y = y };

            _uiEventArgs = uiEvent;

        }

        public UI_Button(Camera camera,string text, float x, float y, UIEvent uiEvent, Bitmap bitmap)
            : this(camera, text, x, y, uiEvent)
        {
            _bitmap = bitmap;
            if (_bitmap != null)
            {
                _width = _bitmap.Width;
                _height = _bitmap.Height;

            }
        }

        public UI_Button(Camera camera, string text, float x, float y, UIEvent uiEvent, Bitmap bitmap, Bitmap selectedBitmap)
            : this(camera, text, x, y, uiEvent, bitmap)
        {
            _selectedBitmap = selectedBitmap;

        }

        public override void Draw()
        {
            if (_bitmap == null)
            {
                if (_isMouseOver)
                {
                    if (_middleAligned)
                        SwinGame.DrawRectangle(_highlightColor, Pos.X - _width / 2, Pos.Y - _height / 2, _width, _height);
                    else
                        SwinGame.DrawRectangle(_highlightColor, Pos.X, Pos.Y, _width, _height);
                }
                else
                {
                    if (_middleAligned)
                        SwinGame.DrawRectangle(_baseColor, Pos.X - _width / 2, Pos.Y - _height / 2, _width, _height);
                    else
                        SwinGame.DrawRectangle(_baseColor, Pos.X, Pos.Y, _width, _height);
                }

                if (_middleAligned)
                    DrawTextCentre(_text, Color.Black, Pos.X - 5, Pos.Y  - 5);
                else
                    DrawTextCentre(_text, Color.Black, Pos.X + _width / 2 - 5, Pos.Y + _height / 2 - 5);
            }
            else
            {
                if (_selectedBitmap == null)
                {
                    if (_middleAligned)
                        SwinGame.DrawRectangle(_highlightColor, Pos.X - _width / 2, Pos.Y - _height / 2, _width, _height);
                    else
                        SwinGame.DrawRectangle(_highlightColor, Pos.X, Pos.Y, _width, _height);

                    SwinGame.DrawBitmap(_bitmap, Pos.X, Pos.Y);
                }
                else
                {
                    if (_isMouseOver)
                        SwinGame.DrawBitmap(_selectedBitmap, Pos.X, Pos.Y);
                    else 
                        SwinGame.DrawBitmap(_bitmap, Pos.X, Pos.Y);
                }
            }
        }

        public override void Update()
        {
            _buttonArea = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = _width,
                Height = _height
            };

            if (MiddleAligned)
            {
                _buttonArea.X -= _width / 2;
                _buttonArea.Y -= _height / 2;
            }

            if (SwinGame.PointInRect(SwinGame.MousePosition(), _buttonArea))
            {
                if (_isMouseOver == false)
                {
                    //false-->true mousing over.
                    if (_mouseOverSoundEffect != null)
                    {
                        SwinGame.PlaySoundEffect(_mouseOverSoundEffect);
                    }

                }
                _isMouseOver = true;
            }
            else
                _isMouseOver = false;

            if (_isMouseOver && SwinGame.MouseClicked(MouseButton.LeftButton) && OnUIEvent != null)
            {
                OnUIEvent(this, _uiEventArgs);
            }
        }

        public SoundEffect MouseOverSoundEffect { get => _mouseOverSoundEffect; set => _mouseOverSoundEffect = value; }
        public bool MiddleAligned { get => _middleAligned; set => _middleAligned = value; }
    }
}
