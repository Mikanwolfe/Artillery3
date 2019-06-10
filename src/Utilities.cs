using System;
using SwinGameSDK;

namespace Artillery
{
    public static class Utilities
    {





        /* -------------------- The assumption is that conversions take processing power --------------------- */
        public static double Clamp(double value, double min, double max)
        {
            if (value < min)
                return min;
            if (value > max)
                return max;
            return value;
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

        public static void DrawTextCentre(string text, Color color, float x, float y)
        {
            SwinGame.DrawText(text, color, x - (text.Length * 3.5f), y);
        }

        public static void DrawTextCentre(string text, Color color, Point2D pt)
        {
            DrawTextCentre(text, color, pt.X, pt.Y);
        }


        public static float Rad(float deg)
        {
            return deg * (float)Math.PI / 180;
        }

        public static float Deg(float rad)
        {
            return (rad * 180 / (float)Math.PI) % 360f;
        }
    }
}
