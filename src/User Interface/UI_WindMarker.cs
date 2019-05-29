using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_WindMarker : UIElement
    {
        Sprite _sprite;
        
        public UI_WindMarker(Camera camera) 
            : base(camera)
        {
            _sprite = new Sprite(SwinGame.BitmapNamed("windMarker"));
        }

        public override void Draw()
        {
            _sprite.Draw(Pos.ToPoint2D);
        }

        public override void Update()
        {
            Pos.X = Camera.Pos.X + (Camera.WindowRect.Width / 2) - 50;
            Pos.Y = Camera.Pos.Y + 50;
        }
    }
}
