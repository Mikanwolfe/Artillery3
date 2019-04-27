using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    class Satellite : Entity
    {
        //Base satellite will be the *Maia* satellite

        Color _mainColor = SwinGame.RGBColor(120, 32, 78);
        Color _accentColor = SwinGame.RGBColor(23, 23, 47);
        float _explRad;
        float _damage;
        float _fireDelay;

        float _angleFacing;
        float _angleDestination;

        Laser _laserProjectile;
        Point2D _destination;

        public Satellite(string name, float x, float y) 
            : base(name)
        {
            _fireDelay = 0;
            _angleFacing = 0;
            _angleDestination = Rad(270f);
            Pos = new Point2D()
            {
                X = x,
                Y = y
            };
        }

        public void Fire(Point2D destination)
        {
            _fireDelay = 2f;
            _destination = destination;
        }

        void FireLaser(Point2D destination)
        {
            _laserProjectile = new Laser(Name + "'s Laser", null, Pos, destination);
            _angleDestination = VectorDirection(Pos, destination);
        }

        public override void Draw()
        {
            SwinGame.FillCircle(_mainColor, Pos, 50);
            SwinGame.FillCircle(_accentColor, Pos, 45);
            SwinGame.FillCircle(_mainColor, Pos, 40);

            SwinGame.DrawLine(_mainColor, Pos.X, Pos.Y, 50 * (float)Math.Cos(_angleFacing+Rad(10)) + Pos.X, 50 * (float)Math.Sin(_angleFacing + Rad(10)) + Pos.Y);
        }

        public override void Update()
        {
            _angleFacing += (_angleDestination - _angleFacing) / 2000;



            if (_fireDelay > 0)
            {
                _fireDelay -= 0.1f;
            } else
            {
                if (_fireDelay != -1)
                {
                    FireLaser(_destination);
                    _fireDelay = -1;
                }
            }
        }
    }
}
