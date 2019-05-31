using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

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

        Rectangle _mainBox;
        public UI_ShopButton(Camera camera) 
            : base(camera)
        {
            _targetBoxColor = SwinGame.RGBAFloatColor(0.3f, 0.3f, 0.3f, 0.4f);
            _targetTextColor = Color.White;
            _targetHighlightColor = Color.Pink;

            _mainBox = new Rectangle()
            {
                X = Pos.X,
                Y = Pos.Y,
                Width = 850,
                Height = 120
            };
        }

        public override void Draw()
        {
            

           SwinGame.FillRectangle(_boxColor, _mainBox)
        }

        public override void Update()
        {
            
        }
    }
}
