using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_Minimap : UIElement
    {

        int _width, _height;
        A3RData _a3RData;
        public UI_Minimap(A3RData a3Rdata, Camera camera) 
            : base(camera)
        {
            _a3RData = a3Rdata;
            _width = 300;
            _height = 20;

            Pos = new Vector(1250, 80);
        }

        public override void Draw()
        {

            SwinGame.FillRectangle(Color.White,
                Pos.X + Camera.Pos.X,
                Pos.Y + _height / 2 - 1 + Camera.Pos.Y,
                _width,
                2);
            SwinGame.FillRectangle(Color.White,
                Pos.X + Camera.Pos.X,
                Pos.Y + Camera.Pos.Y,
                4,
                _height);
            SwinGame.FillRectangle(Color.White,
                Pos.X + Camera.Pos.X + _width,
                Pos.Y + Camera.Pos.Y,
                4,
                _height);

            foreach (Player p in _a3RData.Players)
            {
                SwinGame.FillCircle(Color.White,
                    Camera.Pos.X + Pos.X + (_width * (p.Pos.X / (float)_a3RData.Terrain.Map.Length)),
                    Camera.Pos.Y + Pos.Y + _height / 2 - 1,
                    3);
            }
            Player s = _a3RData.SelectedPlayer;
            SwinGame.DrawCircle(Color.Purple,
                    Camera.Pos.X + Pos.X + (_width * (s.Pos.X / (float)_a3RData.Terrain.Map.Length)),
                    Camera.Pos.Y + Pos.Y + _height / 2 - 1,
                    5);

            SwinGame.DrawCircle(Color.Orange,
                    Camera.Pos.X + Pos.X + 
                    (_width * (s.Character.LastProjectilePosition.X / (float)_a3RData.Terrain.Map.Length)),
                    Camera.Pos.Y + Pos.Y + _height / 2 - 1,
                    3);


        }

        public override void Update()
        {
            
        }
    }
}
