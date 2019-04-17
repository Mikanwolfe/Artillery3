using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    //TODO: Currently limited by window size, will have to expand to accomodate for 
    //       Camera and camera movement.
    public class TerrainFactoryMidpoint : TerrainFactory
    {

        int _averageTerrainHeight = Constants.AverageTerrainHeight;


        public TerrainFactoryMidpoint(Rectangle windowRect, Rectangle terrainBox) 
            : base(windowRect, terrainBox)
        {
        }

        public TerrainFactoryMidpoint(Rectangle windowRect, int terrainWidth, int terrainDepth)
            : base(windowRect, new Rectangle() { Width = terrainWidth, Height = terrainDepth })
        {
        }

        public TerrainFactoryMidpoint(Rectangle windowRect, int terrainWidth, int terrainDepth, Camera camera)
            : base(windowRect, new Rectangle() { Width = terrainWidth, Height = terrainDepth }, camera)
        {
        }



        float RandDisplacement(float displacement)
        {
            return Random.Next((int)displacement * 2) - displacement;
        }

        public override Terrain Generate(Color color, int averageTerrainHeight)
        {
            _averageTerrainHeight = averageTerrainHeight;
            return Generate(color);
        }

        public override Terrain Generate(Color color)
        {
            Console.WriteLine("Generating Midpoint terrain!");
            /*
             * There's quite the difference between maths and code oftentimes.
             * This implementation of the midpoint displacement algorithm will treat 
             *  each individual x-value in the 1-d array as a point.
             *  
             * These points will be the virtual line segments.
             */

            int requiredExponent = PowerCeiling(2, TerrainBox.Width);
            int requiredWidth = (int)Math.Pow(2f, requiredExponent); //Should be 2^x - 1. e.g. 0..1024
            float[] generatedMap = new float[requiredWidth + 1];
            int numberOfSegments;
            int segmentLength;
            int xVal;
            float displacement = 200;

            /* -- Terrain Generation, Start! -- */

            /* -- Generating the starting and the ending points -- */
            /*
             * Legacy:
            generatedMap[0] = WindowRect.Height * 2 / 3 + RandDisplacement(WindowRect.Height / 5);
            generatedMap[requiredWidth] = WindowRect.Height * 2 / 3 + RandDisplacement(WindowRect.Height / 5);
            */

            generatedMap[0] =
                _averageTerrainHeight + RandDisplacement(Constants.BaseTerrainInitialDisplacement);
            generatedMap[requiredWidth] =
                _averageTerrainHeight + RandDisplacement(Constants.BaseTerrainInitialDisplacement);

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
                displacement *= 0.45f;
            }


            /*Terrain _terrain = new Terrain(WindowRect)
            {
                Map = generatedMap
            };
            */

            Terrain _terrain = new Terrain(WindowRect);
            _terrain.Map = new float[(int)TerrainBox.Width];

            for (int i = 0; i < _terrain.Map.Length; i++)
            {
                _terrain.Map[i] = generatedMap[i];
            }
            _terrain.Color = color;

            if (CameraInstance != null)
            {
                _terrain.CameraInstance = CameraInstance;
            }



            return _terrain;
        }
    }
}
