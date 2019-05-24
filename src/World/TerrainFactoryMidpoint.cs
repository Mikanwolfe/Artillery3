using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{
    class TerrainFactoryMidpoint : TerrainFactory
    {
        #region Fields
        int _averageTerrainHeight = Artillery.Constants.AverageTerrainHeight;
        #endregion

        #region Constructor
        public TerrainFactoryMidpoint(Rectangle windowRect, Rectangle terrainBox, Camera camera)
            : base(windowRect, terrainBox, camera)
        {

        }
        #endregion

        #region Methods
        float RandDisplacement(float displacement)
        {
            return Random.Next((int)displacement * 2) - displacement;
        }

        public override Terrain Generate(Color color, TerrainOptions options)
        {
            throw new NotImplementedException();
        }

        public override Terrain Generate(Color color)
        {
            Console.WriteLine("Generating Midpoint terrain!");

            int requiredExponent = PowerCeiling(2, TerrainBox.Width);
            int requiredWidth = (int)Math.Pow(2f, requiredExponent); //Should be 2^x - 1. e.g. 0..1024
            float[] generatedMap = new float[requiredWidth + 1];
            int numberOfSegments;
            int segmentLength;
            int xVal;
            float displacement = 200;

            generatedMap[0] =
                _averageTerrainHeight + RandDisplacement(Artillery.Constants.BaseTerrainInitialDisplacement);
            generatedMap[requiredWidth] =
                _averageTerrainHeight + RandDisplacement(Artillery.Constants.BaseTerrainInitialDisplacement);

            for (int step = 0; step <= requiredExponent; step++)
            {
                numberOfSegments = (int)Math.Pow(2, step); //2, 4, 6, 8, 16...
                segmentLength = requiredWidth / numberOfSegments;

                for (int i = 1; i <= numberOfSegments; i++)
                {
                    //Increment through each segment
                    xVal = i * segmentLength - (segmentLength / 2);
                    generatedMap[xVal] = (generatedMap[xVal - (segmentLength / 2)] + generatedMap[xVal + (segmentLength / 2)]) / 2;
                    generatedMap[xVal] += RandDisplacement(displacement);
                }
                displacement *= ReductionCoef;
            }


            /*Terrain _terrain = new Terrain(WindowRect)
            {
                Map = generatedMap
            };
            */

            Terrain _terrain = new Terrain(WindowRect, Camera);
            _terrain.Map = new float[(int)TerrainBox.Width];

            for (int i = 0; i < _terrain.Map.Length; i++)
            {
                _terrain.Map[i] = generatedMap[i];
            }
            _terrain.Color = color;

            if (Camera != null)
            {
                _terrain.CameraInstance = Camera;
            }



            return _terrain;
        }
        #endregion

        #region Properties

        #endregion
    }
}
