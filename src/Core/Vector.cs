using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{
    public class Vector
    {
        double _x = 0;
        double _y = 0;


        public Vector(double x, double y)
        {
            _x = x;
            _y = y;
        }
        public Vector(float x, float y)
            : this((double)x, (double)y)
        {

        }
        
        public Vector(Point2D pt)
            : this(pt.X, pt.Y)
        {

        }

        public void Normalise()
        {
            double magnitude = Math.Sqrt((_x * _x) + (_y * _y));
            _x /= magnitude;
            _y /= magnitude;
        }

        public double Magnitude
        {
            get => Math.Sqrt((_x * _x) + (_y * _y));
        }

        public Point2D ToPoint2D
        {
            get => new Point2D()
                {
                X = (float)_x,
                    Y = (float)_y
                };
        }
        public double X { get => _x; set => _x = value; }
        public double Y { get => _y; set => _y = value; }
    }
}
