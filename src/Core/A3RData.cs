using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class A3RData
    {
        /*
         * Why is this class called A3RData? Why not? descriptive, short, and shows it's ONLY for A3.
         * Serialise this to save.
         * 
         */

        #region Fields

        ICommandStream _commandStream;

        Player _selectedPlayer;

        private int _selectedPlayerIndex;

        List<Player> _players;
        List<Entity> _entities;

        Random _random = new Random();

        Rectangle _windowRect = new Rectangle()
        {
            Width = Constants.WindowWidth,
            Height = Constants.WindowHeight
        };

        Rectangle _boundaryBox;

        Camera _camera;

        Terrain _terrain;
        Wind _wind;

        List<Terrain> _bgTerrain = new List<Terrain>(Constants.NumberParallaxBackgrounds);

        TerrainFactory _terrainFactory;

        #endregion

        #region Constructor 

        public A3RData()
        {
            _camera = new Camera(_windowRect);
            _players = new List<Player>();

            _entities = new List<Entity>();

            _commandStream = new CommandStream();

            _wind = new Wind();
            

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
            //_logicalTerrain = _terrainFactory.Generate(Color.Green);
        }

        #endregion

        #region Properties

        public TerrainFactory TerrainFactory { get => _terrainFactory; set => _terrainFactory = value; }
        public List<Terrain> BgTerrain { get => _bgTerrain; set => _bgTerrain = value; }
        public List<Entity> Entities { get => _entities; set => _entities = value; }
        public ICommandStream CommandStream { get => _commandStream; set => _commandStream = value; }
        public Player SelectedPlayer { get => _selectedPlayer; set => _selectedPlayer = value; }
        public Rectangle WindowRect { get => _windowRect; set => _windowRect = value; }
        public List<Player> Players { get => _players; set => _players = value; }
        public Wind Wind { get => _wind; set => _wind = value; }
        public Terrain Terrain { get => _terrain; set => _terrain = value; }

        #endregion
    }
}
