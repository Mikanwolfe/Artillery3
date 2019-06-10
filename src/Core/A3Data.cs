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

        ICommandStream _commandStream;

        IPlayer _selectedPlayer;

        private int _selectedPlayerIndex;

        List<Entity> _entities;

        Random _random = new Random();

        Rectangle _windowRect = new Rectangle()
        {
            Width = Artillery.Constants.WindowWidth,
            Height = Artillery.Constants.WindowHeight
        };

        Rectangle _terrainBox = new Rectangle()
        {
            Width = Artillery.Constants.TerrainWidth + Artillery.Constants.TerrainBoxPadding,
            Height = Artillery.Constants.TerrainHeight + Artillery.Constants.TerrainBoxPadding
        };

        Camera _camera;

        Terrain _logicalTerrain;
        List<Terrain> _bgTerrain = new List<Terrain>(Artillery.Constants.NumBgTerrain);

        TerrainFactory _terrainFactory;

        #endregion

        #region Constructor 

        public A3Data()
        {
            _camera = new Camera(_windowRect);
            _terrainFactory = new TerrainFactoryMidpoint(_windowRect, _terrainBox, _camera);

            _entities = new List<Entity>();

            _commandStream = new CommandStream();

        }



        #endregion

        #region Methods


        public void ShufflePlayers()
        {
            //Shuffle players that are alive, make sure to let the 
            // right character know they're selected.

            



        }

        public void GenerateTerrain()
        {
            _logicalTerrain = _terrainFactory.Generate(Color.Green);
        }

        #endregion

        #region Properties

        public TerrainFactory TerrainFactory { get => _terrainFactory; set => _terrainFactory = value; }
        public Terrain LogicalTerrain { get => _logicalTerrain; set => _logicalTerrain = value; }
        public List<Terrain> BgTerrain { get => _bgTerrain; set => _bgTerrain = value; }
        public List<Entity> Entities { get => _entities; set => _entities = value; }
        public ICommandStream CommandStream { get => _commandStream; set => _commandStream = value; }
        public IPlayer SelectedPlayer { get => _selectedPlayer; set => _selectedPlayer = value; }

        #endregion
    }
}
