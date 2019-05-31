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

        public delegate void OnButtonEvent();

        OnButtonEvent _buttonEvent;

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

        Vector _cameraPos;
        bool _onScreen = false;


        bool _fadesIn = false;
        int _fadeCount = 0;

        public UI_Button(Camera camera, string text, float x, float y, OnButtonEvent onButtonEvent)
            : base(camera)
        {
            _text = text;
            Pos.X = x;
            Pos.Y = y;
            _buttonEvent = onButtonEvent;
            _cameraPos = new Vector();

        }

        public UI_Button(Camera camera, string text, float x, float y, UIEvent uiEvent)
            : base(camera)
        {
            _text = text;
            Pos.X = x;
            Pos.Y = y;
            _cameraPos = new Vector();

            _uiEventArgs = new UIEventArgs(uiEvent);
        }

        public UI_Button(Camera camera, string text, float x, float y, UIEventArgs uiEvent)
            : base(camera)
        {
            _text = text;
            Pos.X = x;
            Pos.Y = y;
            _cameraPos = new Vector();

            _uiEventArgs = uiEvent;

        }

        public UI_Button(Camera camera, string text, float x, float y, UIEvent uiEvent, Bitmap bitmap)
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

        public void LockToScreen()
        {
            _onScreen = true;
        }

        public void SetFadeIn(int fadeDuration)
        {
            _fadesIn = true;
            _fadeCount = 0;
        }

        public override void Draw()
        {
            if (_bitmap == null)
            {


                if (_isMouseOver)
                {
                    SwinGame.DrawRectangle(_highlightColor, _buttonArea);
                }
                else
                {
                    SwinGame.DrawRectangle(_baseColor, _buttonArea);
                }

                if (_middleAligned)
                    DrawTextCentre(_text, Color.Black, Pos.X - 5 + _cameraPos.X, Pos.Y + _cameraPos.Y - 5);
                else
                    DrawTextCentre(_text, Color.Black, Pos.X + _cameraPos.X + _width / 2 - 5, Pos.Y + _cameraPos.Y + _height / 2 - 5);
            }
            else
            {
                if (_selectedBitmap == null)
                {
                    if (_middleAligned)
                        SwinGame.DrawRectangle(_highlightColor, Pos.X - _width / 2 + _cameraPos.X,
                            Pos.Y - _height / 2 + _cameraPos.Y, _width, _height);
                    else
                        SwinGame.DrawRectangle(_highlightColor, Pos.X + _cameraPos.X, Pos.Y + _cameraPos.Y, _width, _height);

                    SwinGame.DrawBitmap(_bitmap, Pos.X + _cameraPos.X, Pos.Y + _cameraPos.Y);
                }
                else
                {
                    if (_isMouseOver)
                        SwinGame.DrawBitmap(_selectedBitmap, Pos.X + _cameraPos.X, Pos.Y + _cameraPos.Y);
                    else
                        SwinGame.DrawBitmap(_bitmap, Pos.X + _cameraPos.X, Pos.Y + _cameraPos.Y);
                }
            }
        }

        public override void Update()
        {
            if (_onScreen)
            {
                _cameraPos = Camera.Pos;
            }

            if (_fadesIn)
                _fadeCount++;

            _fadeCount = Clamp(_fadeCount, 0, 100);

            _buttonArea = new Rectangle()
            {
                X = Pos.X + _cameraPos.X,
                Y = Pos.Y + _cameraPos.Y,
                Width = _width,
                Height = _height
            };

            if (MiddleAligned)
            {
                _buttonArea.X -= _width / 2;
                _buttonArea.Y -= _height / 2;
            }

            Rectangle _activeMouseRect= new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = _width,
                Height = _height
            };

            if (MiddleAligned)
            {
                _activeMouseRect.X -= _width / 2;
                _activeMouseRect.Y -= _height / 2;
            }

            if (SwinGame.PointInRect(SwinGame.MousePosition(), _activeMouseRect))
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

            if (_isMouseOver && SwinGame.MouseClicked(MouseButton.LeftButton))
            {
                OnUIEvent?.Invoke(this, _uiEventArgs);
                _buttonEvent?.Invoke();
            }
        }

        public SoundEffect MouseOverSoundEffect { get => _mouseOverSoundEffect; set => _mouseOverSoundEffect = value; }
        public bool MiddleAligned { get => _middleAligned; set => _middleAligned = value; }
    }
}
