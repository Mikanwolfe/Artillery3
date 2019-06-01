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

        Weapon _itemBeingBought;

        private bool _mouseOver;
        private bool _mouseSelected;

        private bool _mouseOverBuy;

        byte _alphaValueIncrement = 1;

        Rectangle _mainBox;
        Rectangle _buyBox;
        Rectangle _iconBox;

        Dictionary<int, Color> _rarityReference;
        Dictionary<int, String> _rarityWords;

        public Weapon ItemBeingBought { get => _itemBeingBought; set => _itemBeingBought = value; }
        public int Cost { get => _cost; set => _cost = value; }
        public Color IconBoxHighlight { get => _iconBoxHighlight; set => _iconBoxHighlight = value; }

        public UI_ShopButton(Camera camera, Vector pos, Dictionary<int, Color> rarityReference, Dictionary<int, String> rarityWords) 
            : base(camera)
        {
            _targetBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.2f);
            _targetTextColor = Color.White;
            _targetHighlightColor = Color.Pink;

            _iconBoxHighlight = Color.Black;

            _rarityReference = rarityReference;
            _rarityWords = rarityWords;


            _boxColor = SwinGame.RGBAFloatColor(0,0,0,0);
            _textColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);
            _highlightColor = SwinGame.RGBAFloatColor(0, 0, 0, 0);

            Pos = pos;

            _mainBox = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = 730,
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
            SwinGame.FillRectangle(_boxColor, _mainBox);
            SwinGame.FillRectangle(_boxColor, _buyBox);
            SwinGame.FillRectangle(_highlightColor, _mainBox);

            

            SwinGame.DrawRectangle(_rarityReference[_itemBeingBought.Rarity], _iconBox);
            SwinGame.DrawText(_rarityWords[_itemBeingBought.Rarity], _rarityReference[_itemBeingBought.Rarity]
                , SwinGame.FontNamed("smallFont"), Pos.X + 25, Pos.Y + _mainBox.Height - 30);
            SwinGame.DrawText(_rarityWords[_itemBeingBought.Rarity].Substring(0, 1) 
                + ItemBeingBought.ProjectileType.ToString().Substring(0,1).ToLower(), 
                _rarityReference[_itemBeingBought.Rarity], SwinGame.FontNamed("bigFont"), Pos.X + 20, Pos.Y + 15);

            if (_mouseOver || _mouseSelected)
            {
                SwinGame.DrawRectangle(_targetHighlightColor, _mainBox);
            }

            

            if (!_mouseSelected)
            {
                SwinGame.DrawText(ItemBeingBought.Name, _rarityReference[_itemBeingBought.Rarity],
                SwinGame.FontNamed("winnerFont"), Pos.X + 130, Pos.Y + 35);

                SwinGame.DrawText(ItemBeingBought.ShortDesc, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 130, Pos.Y + 75);
            }
            else
            {
                _textColor = Color.White;
                SwinGame.DrawText(ItemBeingBought.LongDesc, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 130, Pos.Y + 20);
                SwinGame.DrawText("Damage: " + ItemBeingBought.BaseDamage, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 140, Pos.Y + 50);
                SwinGame.DrawText("Range: " + ItemBeingBought.WeaponMaxCharge, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 140, Pos.Y + 70);
                SwinGame.DrawText("Weapon Type: " + ItemBeingBought.ProjectileType, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 140, Pos.Y + 90);
                SwinGame.DrawText("Dispersion: " + ItemBeingBought.AimDispersion, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 380, Pos.Y + 50);
                SwinGame.DrawText("Gun Range: " + ItemBeingBought.MinWepDeg + " - " + ItemBeingBought.MaxWepDeg, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 380, Pos.Y + 70);
                SwinGame.DrawText("Clip: " + ItemBeingBought.AutoloaderClip, _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 380, Pos.Y + 90);
            }

            if (_mouseOverBuy)
            {
                _textColor = _rarityReference[_itemBeingBought.Rarity];
            }

            SwinGame.DrawText("Price: ", _textColor, SwinGame.FontNamed("shopFont"),
                    Pos.X + 760, Pos.Y + 35);
            SwinGame.DrawText("$" + ItemBeingBought.Cost.ToString("N0"), _textColor, SwinGame.FontNamed("winnerFont"),
                    Pos.X + 760, Pos.Y + 55);




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

            _mouseOverBuy = (SwinGame.PointInRect(new Point2D()
            {
                X = SwinGame.MouseX() + Camera.Pos.X,
                Y = SwinGame.MouseY() + Camera.Pos.Y
            }, _buyBox));

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
