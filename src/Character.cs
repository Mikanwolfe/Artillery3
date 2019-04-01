using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.GameMain; // Constants

namespace ArtillerySeries.src
{
    // Players use a single Character per game and they are pre-defined in the system (e.g. Innocentia/Object 261)
    //  but they can also be added to and customized on the fly.
    //  I don't know if this will work well but hey, let's hope for the best!
    class Character : EntityAssembly, IPhysicsComponent
    {
        Vehicle _vehicle;
        Point2D _pos;
        Bitmap _charBitmap;

        PhysicsComponent _physics;

        public Character(string name) 
            : base(name)
        {
            _physics = new PhysicsComponent(this);
            _vehicle = new Vehicle(name);
            Entities.Add(_vehicle);
        }

        public void MoveLeft()
        {
            Move(Constants.PlayerSpeed * -1);
        }
        public void MoveRight()
        {
            Move(Constants.PlayerSpeed);
        }

        void Move(float speed) //TODO: Change to accel
        {
            _physics.AccX = speed;
        }

        public Point2D Pos { get => _pos; set => _pos = value; } //TODO remove ext pos setting. Should be physcomponent only.
        public float X { get => _pos.X; set => _pos.X = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        PhysicsComponent IPhysicsComponent.Physics { get => _physics; set => _physics = value; }

        public override void Draw()
        {
            
            if (_charBitmap == null)
            {
                if (_physics.OnGround)
                    SwinGame.FillCircle(Color.IndianRed, _pos.X, _pos.Y, Constants.InvalidPlayerCircleRadius);
                else
                    SwinGame.FillCircle(Color.Purple, _pos.X, _pos.Y, Constants.InvalidPlayerCircleRadius);

                if (_physics.Facing == FacingDirection.Left)
                    SwinGame.FillCircle(Color.Aquamarine, _pos.X-3, _pos.Y, Constants.InvalidPlayerCircleRadius);
                else
                    SwinGame.FillCircle(Color.Aquamarine, _pos.X+3, _pos.Y, Constants.InvalidPlayerCircleRadius);

            }



            float angle = (float)(_physics.AbsAngleToGround * 180 / Math.PI);
            SwinGame.DrawText("Absolute Angle: " + angle.ToString(), Color.Black, 50, 50);
            angle = (float)(_physics.RelAngleToGround * 180 / Math.PI);
            SwinGame.DrawText("Relative Angle: " + angle.ToString(), Color.Black, 50, 70);

            base.Draw(); // Draws the sub-entities
        }

        public override void Update()
        {
            _pos.X = _physics.X;
            _pos.Y = _physics.Y;
            base.Update(); // Updates the sub-entities
        }

        public void Simulate()
        {
            _physics.Simulate();
        }
    }
}
