﻿using System;
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
    class Character : EntityAssembly
    {
        Vehicle _vehicle;
        Point2D _pos;
        Bitmap _charBitmap;

        

        public Character(string name) 
            : base(name)
        {
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
            X += speed;
        }

        public Point2D Pos { get => _pos; set => _pos = value; } //TODO remove ext pos setting. Should be physcomponent only.
        public float X { get => _pos.X; set => _pos.X = value; }
        public float Y { get => _pos.Y; set => _pos.Y = value; }
        public override void Draw()
        {
            
            if (_charBitmap == null)
            {
                SwinGame.FillCircle(Color.IndianRed, _pos.X, _pos.Y, Constants.InvalidPlayerCircleRadius);
            }

            
            base.Draw(); // Draws the sub-entities
        }

        public override void Update()
        {
            base.Update(); // Updates the sub-entities
        }
    }
}
