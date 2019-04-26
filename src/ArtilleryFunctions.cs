using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public static class ArtilleryFunctions
    {
        /*
         * To add:  
         *  PhysicsEngine.Clamp
         *  Color Roughly
         *  Color RoughlyValued
         *  
         * 
         */

        public static double RandBetween(double min, double max)
        {
            return ParticleEngine.Instance.RandDoubleBetween(min, max);
        }

        public static Point2D Normalise(Point2D vector)
        {
            float x = vector.X;
            float y = vector.Y;
            float magnitude = (float)Math.Sqrt(x * x + y * y);
            vector.X /= magnitude;
            vector.Y /= magnitude;
            return vector;
        }

        public static Point2D ZeroPoint2D()
        {
            return new Point2D()
            {
                X = 0,
                Y = 0
            };
        }


        public static float Rad(float deg)
        {
            return deg * (float)Math.PI / 180;
        }

        public static float Deg(float rad)
        {
            return rad * 180 / (float)Math.PI;
        }

        public static float Clamp(float value, float min, float max)
        {
            if (value < min)
                return min;
            if (value > max)
                return max;
            return value;
        }

        public static int Clamp(int value, int min, int max)
        {
            if (value < min)
                return min;
            if (value > max)
                return max;
            return value;
        }

        public static bool WithinBoundary(Point2D pos, Rectangle boundary)
        {
            if (SwinGame.PointInRect(pos, boundary))
                return true;

            return false;
        }
    }
}
