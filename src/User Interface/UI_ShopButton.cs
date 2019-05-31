using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{

    public interface ShoppableItem
    {
        string Name { get;  }
        string ShortDesc { get;  }
        string LongDesc { get;  }
        int Rarity { get; }
        int Cost { get; }
    }
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

        ShoppableItem _itemBeingBought;

        private bool _mouseOver;
        private bool _mouseSelected;

        byte _alphaValueIncrement = 1;

        Rectangle _mainBox;
        Rectangle _buyBox;
        Rectangle _iconBox;

        Dictionary<int, Color> _rarityReference;

        public ShoppableItem ItemBeingBought { get => _itemBeingBought; set => _itemBeingBought = value; }
        public int Cost { get => _cost; set => _cost = value; }
        public Color IconBoxHighlight { get => _iconBoxHighlight; set => _iconBoxHighlight = value; }

        public UI_ShopButton(Camera camera, Vector pos, Dictionary<int, Color> rarityReference) 
            : base(camera)
        {
            _targetBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.2f);
            _targetTextColor = Color.White;
            _targetHighlightColor = Color.Pink;

            _iconBoxHighlight = Color.Black;

            _rarityReference = rarityReference;


            _boxColor = SwinGame.RGBAFloatColor(0,0,0,0);
            _textColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _highlightColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);

            Pos = pos;

            _mainBox = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = 750,
                Height = 120
            };

            _buyBox = new Rectangle()
            {
                X = Pos.X + _mainBox.Width + 20,
                Y = Pos.Y,
                Width = _mainBox.Height,
                Height = _mainBox.Height
            };

            _iconBox = new Rectangle()
            {
                X = Pos.X + 10,
                Y = Pos.Y + 10,
                Width = 100,
                Height = 100
            };
        }

        public override void Draw()
        {

            SwinGame.DrawText(ItemBeingBought.Name, _rarityReference[_itemBeingBought.Rarity],
                SwinGame.FontNamed("winnerFont"), Pos.X + 130, Pos.Y + 35);

            SwinGame.DrawText(ItemBeingBought.ShortDesc, _textColor, SwinGame.FontNamed("shopFont"),
                Pos.X + 130, Pos.Y + 75);




            SwinGame.FillRectangle(_boxColor, _mainBox);
            SwinGame.FillRectangle(_highlightColor, _mainBox);

            SwinGame.DrawRectangle(_rarityReference[_itemBeingBought.Rarity], _iconBox);

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
