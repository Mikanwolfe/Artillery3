using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    class TextParticle : Particle
    {

        string _text;

        Point2D _vel = new Point2D()
        {
            Y = -2
        };

        public TextParticle(string text, double life, Point2D pos, Color color, float weight) 
            : base(life, pos, ZeroPoint2D(), 0, color, weight)
        {
            _text = text;
            Vel = new Point2D()
            {
                Y = -2
            };
        }
        

        public override void Draw()
        {
            if (Visible)
            {
                DrawTextCentre(_text, Color, Pos);
            }
        }

    }
}
