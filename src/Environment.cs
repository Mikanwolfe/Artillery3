using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    class Environment
    {
        /*
         * Environment is the **background**. Since the logical terrain is also drawn,
         *  it shouldn't be included here. This is for uncollideable stuff...
         * 
         */
        Rectangle _windowRect;
        List<Terrain> _backgroundTerrain;
        Terrain _logicalTerrain;
        TerrainFactory _terrainFactory;
        Camera _camera;



        string _presetEnvironment = Constants.EnvironmentPreset;

        public Environment(Rectangle windowRect, Camera camera)
        {
            _windowRect = windowRect;
            _backgroundTerrain = new List<Terrain>();
            _camera = camera;
        }

        //public void Generate(Terrain logicalTerrain)
        public void Generate()
        {
            _terrainFactory = new TerrainFactoryMidpoint(
                _windowRect, Constants.TerrainWidth,
                Constants.TerrainDepth, _camera);

            for (int i = 0; i < Constants.NumberParallaxBackgrounds; i++)
            {
                Terrain _generatedTerrain = _terrainFactory.Generate(SwinGame.RGBAFloatColor(0f + (i * 0.1f), 0.2f + (i * 0.1f), 0f + (i * 0.1f), 1f),
                    Constants.AverageTerrainHeight + i * 150 - 300);
                _generatedTerrain.TerrainDistance = Constants.DistFromInfinity / Constants.NumberParallaxBackgrounds * (Constants.NumberParallaxBackgrounds - i);
                Console.WriteLine("Terrain distance: " + i + " : " + _generatedTerrain.TerrainDistance);
                _backgroundTerrain.Add(_generatedTerrain);
            }
        }

    }
}
