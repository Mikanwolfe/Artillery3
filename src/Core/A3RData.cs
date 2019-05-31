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
        Dictionary<int, String> _rarityWords;

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

            Weapon _howitzer = new Weapon("152mm/22 Howitzer", 0, 40, ProjectileType.Shell);
            _howitzer.BaseDamage = 200;
            _howitzer.AimDispersion = 5;
            _howitzer.WeaponMaxCharge = 30;
            _howitzer.DamageRad = 60;
            _howitzer.Rarity = 1;
            _howitzer.ShortDesc = "A big gun with a short barrel; sacrifices range and accuracy for big boom.";
            _howitzer.LongDesc = "A well-worn 152mm howitzer";
            _shopWeapons.Add(_howitzer);

            Weapon _coilgun = new Weapon("90mm Coilgun", -10, 40, ProjectileType.Gun);
            _coilgun.AutoloaderClip = 2;
            _coilgun.AimDispersion = 3;
            _coilgun.ProjectilesFiredPerTurn = 4;
            _coilgun.WeaponMaxCharge = 40;
            _coilgun.BaseDamage = 40;
            _coilgun.DamageRad = 20;
            _coilgun.Rarity = 2;
            _coilgun.ShortDesc = "An coilgun developed my LFS technologies. Fires four rounds at once.";
            _coilgun.LongDesc = "Less artillery gun and more machine gun.";
            _shopWeapons.Add(_coilgun);

            Weapon _batchat155 = new Weapon("B.C. 155/58 de Canon", -5, 90, ProjectileType.Shell);
            _batchat155.AutoloaderClip = 5;
            _batchat155.WeaponMaxCharge = 70;
            _batchat155.AimDispersion = 0.5f;
            _batchat155.BaseDamage = 90;
            _batchat155.DamageRad = 20;
            _batchat155.Rarity = 3;
            _batchat155.ShortDesc = "An experimental autoloading weapon. Incredibly accurate, doesn't pack a punch.";
            _batchat155.LongDesc = "B.C. 155/58, a 5-Round Autoloading Artillery.";
            _shopWeapons.Add(_batchat155);

            Weapon _gwtCannon = new Weapon("290mm/64 G.W. Tiger", -5, 90, ProjectileType.Shell);
            _gwtCannon.AutoloaderClip = 1;
            _gwtCannon.WeaponMaxCharge = 100;
            _gwtCannon.AimDispersion = 2f;
            _gwtCannon.BaseDamage = 300;
            _gwtCannon.DamageRad = 50;
            _gwtCannon.Rarity = 4;
            _gwtCannon.ShortDesc = "A weapon developed from the G.W. Tiger program, a deadly weapon, if it hits.";
            _gwtCannon.LongDesc = "High damage, long range, but surprisingly bad accuracy. ";
            _shopWeapons.Add(_gwtCannon);

            Weapon _objLaser = new Weapon("90mm Neko-15X Laser", 0, 50, ProjectileType.Laser);
            _objLaser.AutoloaderClip = 1;
            _objLaser.WeaponMaxCharge = 50;
            _objLaser.BaseDamage = 150;
            _objLaser.AimDispersion = 1f;
            _objLaser.DamageRad = 10;
            _objLaser.ExplRad = 5;
            _objLaser.UsesSatellite = true;
            _objLaser.Rarity = 6;
            _objLaser.ShortDesc = "A technologically advanced laser developed from the Neko-15X project. Top Secret.";
            _objLaser.LongDesc = "Fires lasers similar to Maia, however, has low explosion radius.";
            _shopWeapons.Add(_objLaser);


            Weapon _massDriver = new Weapon("210mm Kinetic Mass Driver", 0, 20, ProjectileType.Shell);
            _massDriver.AutoloaderClip = 2;
            _massDriver.WeaponMaxCharge = 90;
            _massDriver.AimDispersion = 0.001f;
            _massDriver.BaseDamage = 200;
            _massDriver.DamageRad = 80;
            _massDriver.UsesSatellite = true;
            _massDriver.Rarity = 7;
            _massDriver.ShortDesc = "A mysterious weapon by the Kotona Umbress, it fires entire titanium pillars.";
            _massDriver.LongDesc = "Holding two rounds, it was salvaged from KTNS Hatsuyuki.";
            _shopWeapons.Add(_massDriver);

            _rarityReference = new Dictionary<int, Color>();
            _rarityReference.Add(1, Color.SteelBlue);
            _rarityReference.Add(2, Color.ForestGreen);
            _rarityReference.Add(3, Color.OrangeRed);
            _rarityReference.Add(4, Color.DeepPink);
            _rarityReference.Add(5, Color.Purple);
            _rarityReference.Add(6, Color.DarkCyan);
            _rarityReference.Add(7, Color.White);

            _rarityWords = new Dictionary<int, string>();
            _rarityWords.Add(1, "Common");
            _rarityWords.Add(2, "Uncommon");
            _rarityWords.Add(3, "Rare");
            _rarityWords.Add(4, "Epic");
            _rarityWords.Add(5, "Mythical");
            _rarityWords.Add(6, "Legendary");
            _rarityWords.Add(7, "Godly");



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
        public Dictionary<int, string> RarityWords { get => _rarityWords; set => _rarityWords = value; }

        #endregion
    }
}
