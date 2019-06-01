using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_Line : UIElement
    {

        Vector _pt1;
        Vector _pt2;

        Color _color;
        Color _targetColor;

        public UI_Line(Camera camera, Vector pt1, Vector pt2) 
            : base(camera)
        {
            _pt1 = pt1;
            _pt2 = pt2;

            _targetColor = Color.White;
            _color = SwinGame.RGBAColor(0, 0, 0, 0);
        }

        public Color TargetColor { get => _targetColor; set => _targetColor = value; }

        public override void Draw()
        {
            SwinGame.DrawLine(_color, (_pt1 + Camera.Pos).ToPoint2D, (_pt2 + Camera.Pos).ToPoint2D);
        }

        public override void Update()
        {
            _color = UpdateColor(_color, _targetColor);
        }
    }
}
