using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_WindMarker : UIElement
    {
        Sprite _sprite;
        Wind _wind;
        
        public UI_WindMarker(Camera camera, Wind wind) 
            : base(camera)
        {
            _sprite = new Sprite(SwinGame.BitmapNamed("windMarker"));
            _wind = wind;
        }

        public override void Draw()
        {
           
            _sprite.Draw(Pos.ToPoint2D);
        }

        public override void Update()
        {
            _sprite.Rotation = _wind.MarkerDirection + 180;

            Pos.X = Camera.Pos.X + (Camera.WindowRect.Width / 2) - 50;
            Pos.Y = Camera.Pos.Y + 50;
        }
    }
}
