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

        float _x = 0;
        float _y = 0;

        #region Constructors

        public Vector()
            : this(0, 0)
        {

        }
        public Vector(float x, float y)
        {
            _x = x;
            _y = y;
        }
        public Vector(double x, double y)
            : this((float)x, (float)y)
        {

        }

        public Vector(Point2D pt)
            : this(pt.X, pt.Y)
        {

        }
        #endregion

        #region Methods

        public void Normalise()
        {
            float magnitude = (float)Math.Sqrt((_x * _x) + (_y * _y));
            _x /= magnitude;
            _y /= magnitude;
        }

        public double Magnitude
        {
            get => Math.Sqrt((_x * _x) + (_y * _y));
        }

        public static Vector operator +(Vector a, Vector b)
        {
            return new Vector(a.X + b.X, a.Y + b.Y);
        }

        public static Vector operator -(Vector a, Vector b)
        {
            return new Vector(a.X - b.X, a.Y - b.Y);
        }

        #endregion

        #region Properties
        public Point2D ToPoint2D
        {
            get => new Point2D()
            {
                X = _x,
                Y = _y
            };
        }
        public float X { get => _x; set => _x = value; }
        public float Y { get => _y; set => _y = value; }
        #endregion
    }
}
