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

        int _numberOfPlayers;
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

        Satellite _satellite;

        Environment _environment;

        //Terrain _terrain;
        Wind _wind;

        

        List<Terrain> _bgTerrain = new List<Terrain>(Constants.NumberParallaxBackgrounds);

        TerrainFactory _terrainFactory;
        Terrain _logicalTerrain;

        Dictionary<int, Color> _rarityReference;

        bool _userExitRequested = false;


        #region Shop Items
        List<Weapon> _shopWeapons;

        #endregion

        #endregion

        #region Constructor 

        public A3RData()
        {
            _camera = new Camera(_windowRect);
            _players = new List<Player>();

            _entities = new List<Entity>();

            _commandStream = new CommandStream();

            _wind = new Wind();

            _shopWeapons = new List<Weapon>();

            Weapon _howitzer = new Weapon("152mm/22 Howitzer", 10, 90, ProjectileType.Shell);
            _howitzer.BaseDamage = 300;
            _howitzer.AimDispersion = 5;
            _howitzer.WeaponMaxCharge = 30;
            _howitzer.DamageRad = 60;
            _howitzer.Rarity = 3;
            _howitzer.ShortDesc = "A big gun with a short barrel; sacrifices range and accuracy for big boom.";
            _howitzer.LongDesc = "A well-worn 152mm howitzer";
            _shopWeapons.Add(_howitzer);

            Weapon _batchat155 = new Weapon("B.C. 155/58 de Canon", -5, 90, ProjectileType.Shell);
            _batchat155.AutoloaderClip = 5;
            _batchat155.WeaponMaxCharge = 70;
            _batchat155.BaseDamage = 90;
            _batchat155.DamageRad = 20;
            _batchat155.UsesSatellite = true;
            _batchat155.Rarity = 4;
            _batchat155.ShortDesc = "An experimental autoloading weapon. Incredibly accurate, doesn't pack a punch.";
            _batchat155.LongDesc = "Long range, smaller shells.";
            _shopWeapons.Add(_batchat155);

            _rarityReference = new Dictionary<int, Color>();
            _rarityReference.Add(1, Color.SteelBlue);
            _rarityReference.Add(2, Color.ForestGreen);
            _rarityReference.Add(3, Color.OrangeRed);
            _rarityReference.Add(4, Color.HotPink);
            _rarityReference.Add(5, Color.Purple);
            _rarityReference.Add(6, Color.Cyan);



        }



        #endregion

        #region Methods


        public void ShufflePlayers()
        {
            //Shuffle players that are alive, make sure to let the 
            // right character know they're selected.
            // Does a deck shuffle itself? No obviously not. But then, we have to teach people to shuffle.
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
        public bool UserExitRequested { get => _userExitRequested; set => _userExitRequested = value; }
        public Camera Camera { get => _camera; set => _camera = value; }
        public int NumberOfPlayers { get => _numberOfPlayers; set => _numberOfPlayers = value; }
        internal Satellite Satellite { get => _satellite; set => _satellite = value; }
        public Environment Environment { get => _environment; set => _environment = value; }
        public Terrain Terrain { get => _logicalTerrain; set => _logicalTerrain = value; }
        public List<Weapon> ShopWeapons { get => _shopWeapons; set => _shopWeapons = value; }
        public Dictionary<int, Color> RarityReference { get => _rarityReference; set => _rarityReference = value; }

        #endregion
    }
}
