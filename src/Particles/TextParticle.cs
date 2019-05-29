using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    class TextParticle : Particle
    {

        string _text;

        Vector _vel = new Vector(0, -2);

        public TextParticle(string text, double life, Vector pos, Color color, float weight) 
            : base(life, pos, new Vector(), 0, color, weight)
        {
            _text = text;
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
