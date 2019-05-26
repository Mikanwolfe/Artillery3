using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    class Satellite : Entity
    {
        //Base satellite will be the *Maia* satellite

        Color _mainColor = SwinGame.RGBColor(120, 32, 78);
        Color _accentColor = SwinGame.RGBColor(23, 23, 47);
        float _explRad;
        float _damage;
        float _fireDelay = -1;

        float _damageMultiplier = 1;
        float _damageRad;


        float _angleFacing;
        float _angleDestination;

        Laser _laserProjectile;
        Point2D _destination;
        Sprite _sprite;

        public Satellite(string name, float x, float y) 
            : base(name)
        {
            _angleFacing = 0;
            _angleDestination = Rad(270f);
            _damage = 40;
            _explRad = 15;
            _damageRad = 90;
            Pos = new Point2D()
            {
                X = x,
                Y = y
            };
        }

        public void Fire(Point2D destination)
        {
            SwinGame.PlaySoundEffect("laser_satellite");
            _fireDelay = 2f;
            _destination = destination;
        }

        public void NewTurn()
        {
            
        }

        void FireLaser(Point2D destination)
        {
            Console.WriteLine("Satellite damage: {0}", _damage * _damageMultiplier);
            _laserProjectile = new Laser(Name + "'s Laser", null, Pos, destination, _damage * _damageMultiplier, _explRad, _damageRad);
            _angleDestination = VectorDirection(Pos, destination);

            _damageMultiplier += Constants.SatelliteDamageIncPerTurn;
        }

        public void LookAtPos(Point2D destination)
        {
            SwinGame.PlaySoundEffect("satellite_prep");
            _angleDestination = VectorDirection(Pos, destination);
        }

        public override void Draw()
        {
            SwinGame.FillCircle(_mainColor, Pos, 50);
            SwinGame.FillCircle(_accentColor, Pos, 45);
            SwinGame.FillCircle(_mainColor, Pos, 40);
            SwinGame.DrawText(Name + "-Class Low Orbit Ion Cannon", Color.White, Pos.X + 70, Pos.Y + 25); //Magic Numbers
            SwinGame.DrawText("Level: " + ((int)(_damageMultiplier)).ToString(), Color.White, Pos.X + 70, Pos.Y + 45); //Magic Numbers
           

            SwinGame.DrawLine(_mainColor, Pos.X, Pos.Y, 100 * (float)Math.Cos(_angleFacing) + Pos.X, 100 * (float)Math.Sin(_angleFacing) + Pos.Y);
        }

        public override void Update()
        {
            _angleFacing += (_angleDestination - _angleFacing) / 20;



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
