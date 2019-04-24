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
    }
}
