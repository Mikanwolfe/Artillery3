using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{
    public class A3Data
    {
        /*
         * Why is this class called A3Data? Why not? descriptive, short, and shows it's ONLY for A3.
         * Serialise this to save.
         * 
         */

        #region Fields

        Camera _camera;
        Rectangle _windowRect = new Rectangle()
        {
            Width = Artillery.Constants.WindowWidth,
            Height = Artillery.Constants.WindowHeight
        };

        Rectangle _terrainBox = new Rectangle()
        {
            Width = Artillery.Constants.WindowWidth + Artillery.Constants.TerrainBoxPadding,
            Height = Artillery.Constants.WindowHeight + Artillery.Constants.TerrainBoxPadding
        };

        Terrain _logicalTerrain;
        List<Terrain> _bgTerrain = new List<Terrain>(Artillery.Constants.NumBgTerrain);

        TerrainFactory _terrainFactory;

        #endregion

        #region Constructor 

        public A3Data()
        {
            _terrainFactory = new TerrainFactoryMidpoint(_windowRect, _terrainBox, _camera);
        }



        #endregion

        #region Methods

        public void GenerateTerrain()
        {
            _logicalTerrain = _terrainFactory.Generate(Color.Green);
        }

        #endregion

        #region Properties

        public TerrainFactory TerrainFactory { get => _terrainFactory; set => _terrainFactory = value; }

        #endregion
    }
}
