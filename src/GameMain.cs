using System;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class GameMain
    {
        public static class Constants
        {
            public const float Gravity = 0.6f;
            public const float VelocityLoss = 0.8f;
            public const string Data = "data.json";

            //For now we'll have consts inside here, i'll incorporate json support later.


            public const int InvalidPlayerCircleRadius = 3;
            public const float PlayerSpeed = 0.1f; //TODO: Change to Accel
            public const float BaseFrictionCoefKinetic = 0.5f;
            public const float BaseFrictionCoefStatic = 0.8f;
            public const float BaseFrictionStaticError = 0.2f;
            public const float BaseVehicleWeight = 1000f; //Arbitrary units
        }

        public static void Main()
        {
            Rectangle _windowRect = new Rectangle
            {
                Height = 900,
                Width = 1600
            };
            ArtilleryGame Artillery3 = new ArtilleryGame(_windowRect);
            

            Artillery3.Run(_windowRect);
        }
    }
}