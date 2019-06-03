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
            _howitzer.BaseDamage = 100;
            _howitzer.AimDispersion = 5;
            _howitzer.WeaponMaxCharge = 40;
            _howitzer.DamageRad = 120;
            _howitzer.ExplRad = 20;
            _howitzer.Rarity = 1;
            _howitzer.ShortDesc = "A big gun with a short barrel; sacrifices range and accuracy for big boom.";
            _howitzer.LongDesc = "A well-worn 152mm howitzer.";
            _howitzer.Cost = 1220;
            _shopWeapons.Add(_howitzer);

            Weapon _weapon = new Weapon("90mm/109 LFS 'Claymore'", -5, 40, ProjectileType.Shell);
            _weapon.AutoloaderClip = 3;
            _weapon.WeaponMaxCharge = 50;
            _weapon.AimDispersion = 1.5f;
            _weapon.BaseDamage = 100;
            _weapon.ExplRad = 5;
            _weapon.DamageRad = 60;
            _weapon.Rarity = 1;
            _weapon.ShortDesc = "'Designed and Manufactured by Lymilark Future Sciences' -- on the side.";
            _weapon.LongDesc = "A three-clip low-calibre artillery piece.";
            _weapon.Cost = 1650;
            _shopWeapons.Add(_weapon);

            _weapon = new Weapon("75mm CLS-T Lensed x2 Laser Mount", -25, 25, ProjectileType.Laser);
            _weapon.AutoloaderClip = 2;
            _weapon.WeaponMaxCharge = 80;
            _weapon.AimDispersion = 0.6f;
            _weapon.BaseDamage = 200;
            _weapon.ExplRad = 3;
            _weapon.DamageRad = 30;
            _weapon.Rarity = 1;
            _weapon.ShortDesc = "Nothing says experimental like duct tape everywhere. Even on the lens.";
            _weapon.LongDesc = "Like all lasers, high damage, low consistency.";
            _weapon.Cost = 1980;
            _shopWeapons.Add(_weapon);

            _weapon = new Weapon("122mm/90 LFS 'Long Lance'", -5, 60, ProjectileType.Shell);
            _weapon.AutoloaderClip = 2;
            _weapon.WeaponMaxCharge = 60;
            _weapon.AimDispersion = 1f;
            _weapon.BaseDamage = 150;
            _weapon.ExplRad = 8;
            _weapon.DamageRad = 80;
            _weapon.Rarity = 2;
            _weapon.ShortDesc = "An older model from the Lymilark, the Long Lance boasts excellent accuracy.";
            _weapon.LongDesc = "A higher-accuracy piece with surprisingly high damage.";
            _weapon.Cost = 2650;
            _shopWeapons.Add(_weapon);

            Weapon _coilgun = new Weapon("90mm Exp. Coilgun", -10, 40, ProjectileType.Gun);
            _coilgun.AutoloaderClip = 2;
            _coilgun.AimDispersion = 3;
            _coilgun.ProjectilesFiredPerTurn = 4;
            _coilgun.WeaponMaxCharge = 40;
            _coilgun.BaseDamage = 80;
            _coilgun.DamageRad = 55;
            _coilgun.Rarity = 2;
            _coilgun.ShortDesc = "A high-speed coilgun developed by CLS-T. Fires four rounds at once.";
            _coilgun.LongDesc = "Less artillery gun and more machine gun.";
            _coilgun.Cost = 2910;
            _shopWeapons.Add(_coilgun);

            _weapon = new Weapon("181mm Obj. 261", 0, 70, ProjectileType.Shell);
            _weapon.AutoloaderClip = 1;
            _weapon.WeaponMaxCharge = 90;
            _weapon.AimDispersion = 0.5f;
            _weapon.BaseDamage = 250;
            _weapon.DamageRad = 130;
            _weapon.ExplRad = 20;
            _weapon.Rarity = 2;
            _weapon.ShortDesc = "Retrofitted from Anti-Air to Anti-Everything. Reminds you of twintails...";
            _weapon.LongDesc = "Larger shell means large blast radius. Also means one shot.";
            _weapon.Cost = 3520;
            _shopWeapons.Add(_weapon);

            _weapon = new Weapon("Hatsuyuki Type-11/N15", 0, 90, ProjectileType.Shell);
            _weapon.AutoloaderClip = 3;
            _weapon.WeaponMaxCharge = 90;
            _weapon.AimDispersion = 0.5f;
            _weapon.BaseDamage = 120;
            _weapon.UsesSatellite = true;
            _weapon.DamageRad = 70;
            _weapon.ExplRad = 10;
            _weapon.Rarity = 3;
            _weapon.ShortDesc = "A relic of the Hatsuyuki Project; utilises the MAIA Satellite System";
            _weapon.LongDesc = "Flexible but doesn't do much damage.";
            _weapon.Cost = 3990;
            _shopWeapons.Add(_weapon);

            _weapon = new Weapon("50mm x5 Kotona Lensed-AE Rifle", -30, 30, ProjectileType.Laser);
            _weapon.AutoloaderClip = 5;
            _weapon.WeaponMaxCharge = 80;
            _weapon.AimDispersion = 0.5f;
            _weapon.BaseDamage = 200;
            _weapon.ExplRad = 2;
            _weapon.DamageRad = 50;
            _weapon.Rarity = 3;
            _weapon.ShortDesc = "Classified as an old-generation Light Firearm, found in at a relic site.";
            _weapon.LongDesc = "A relic from the an ancient Kotona empire. It's surprising it still works.";
            _weapon.Cost = 4520;
            _shopWeapons.Add(_weapon);

            Weapon _acidWeapon = new Weapon("122mm CLS-T Type-91", -5, 50, ProjectileType.Acid);
            _acidWeapon.AutoloaderClip = 2;
            _acidWeapon.WeaponMaxCharge = 50;
            _acidWeapon.AimDispersion = 2f;
            _acidWeapon.BaseDamage = 50;
            _acidWeapon.DamageRad = 80;
            _acidWeapon.Rarity = 3;
            _acidWeapon.ShortDesc = "Developed during the last Neko War, fires highly acidic projectiles";
            _acidWeapon.LongDesc = "2-Round Acid Projectiles, otherwise, somewhat mediocre.";
            _acidWeapon.Cost = 5080;
            _shopWeapons.Add(_acidWeapon);

            Weapon _batchat155 = new Weapon("B.C. 155/58 de Canon", -5, 80, ProjectileType.Shell);
            _batchat155.AutoloaderClip = 5;
            _batchat155.WeaponMaxCharge = 70;
            _batchat155.AimDispersion = 1f;
            _batchat155.BaseDamage = 90;
            _batchat155.DamageRad = 80;
            _batchat155.Rarity = 3;
            _batchat155.ShortDesc = "An experimental autoloading weapon. Packs small punches.";
            _batchat155.LongDesc = "B.C. 155/58, a 5-Round Autoloading Artillery.";
            _batchat155.Cost = 5010;
            _shopWeapons.Add(_batchat155);

            _weapon = new Weapon("381mm x2 CLS-T Typ. 67", 0, 70, ProjectileType.Shell);
            _weapon.AutoloaderClip = 1;
            _weapon.ProjectilesFiredPerTurn = 2;
            _weapon.WeaponMaxCharge = 50;
            _weapon.AimDispersion = 4f;
            _weapon.BaseDamage = 180;
            _weapon.DamageRad = 90;
            _weapon.ExplRad = 25;
            _weapon.Rarity = 3;
            _weapon.ShortDesc = "An experimental dual-gun turret designed for cute girls.";
            _weapon.LongDesc = "Fires two rounds, once -- big ones though.";
            _weapon.Cost = 5860;
            _shopWeapons.Add(_weapon);

            Weapon _gwtCannon = new Weapon("290mm/64 G.W. Tiger", -5, 90, ProjectileType.Shell);
            _gwtCannon.AutoloaderClip = 2;
            _gwtCannon.WeaponMaxCharge = 100;
            _gwtCannon.AimDispersion = 1.5f;
            _gwtCannon.BaseDamage = 350;
            _gwtCannon.DamageRad = 200;
            _gwtCannon.Rarity = 4;
            _gwtCannon.ShortDesc = "A weapon developed from the G.W. Tiger program, a deadly weapon, if it hits.";
            _gwtCannon.LongDesc = "High damage, long range, and everything in-between. ";
            _gwtCannon.Cost = 8940;
            _shopWeapons.Add(_gwtCannon);

            _weapon = new Weapon("75mm 2x3 LFS 'Neko Paradise'", -25, 25, ProjectileType.Laser);
            _weapon.AutoloaderClip = 2;
            _weapon.ProjectilesFiredPerTurn = 3;
            _weapon.WeaponMaxCharge = 90;
            _weapon.AimDispersion = 1f;
            _weapon.BaseDamage = 400;
            _weapon.ExplRad = 5;
            _weapon.DamageRad = 70;
            _weapon.Rarity = 4;
            _weapon.ShortDesc = "Part of the next-generation design from the Neko Paradise Project.";
            _weapon.LongDesc = "Somewhat bad accuracy for a laser-weapon, but packs a cute sting.";
            _weapon.Cost = 9880;
            _shopWeapons.Add(_weapon);


            _weapon = new Weapon("220mm/80 CLS-T 'Doki-Doki'", 0, 60, ProjectileType.Shell);
            _weapon.AutoloaderClip = 3;
            _weapon.ProjectilesFiredPerTurn = 3;
            _weapon.WeaponMaxCharge = 50;
            _weapon.AimDispersion = 8f;
            _weapon.BaseDamage = 240;
            _weapon.DamageRad = 100;
            _weapon.ExplRad = 20;
            _weapon.Rarity = 4;
            _weapon.ShortDesc = "A mix of sadness and sweetness with a tinge of searing iron.";
            _weapon.LongDesc = "Three by three they come! Are we missing one? Jus------";
            _weapon.Cost = 11150;
            _shopWeapons.Add(_weapon);

            Weapon _yamatoTurret = new Weapon("460mm/18.1in Type 94 Triple Turret", -5, 90, ProjectileType.Shell);
            _yamatoTurret.AutoloaderClip = 1;
            _yamatoTurret.WeaponMaxCharge = 120;
            _yamatoTurret.ProjectilesFiredPerTurn = 3;
            _yamatoTurret.AimDispersion = 4f;
            _yamatoTurret.BaseDamage = 300;
            _yamatoTurret.DamageRad = 160;
            _yamatoTurret.ExplRad = 30;
            _yamatoTurret.Rarity = 5;
            _yamatoTurret.ShortDesc = "A miniaturised version of the Yamato's triple-turrets. For cute girls.";
            _yamatoTurret.LongDesc = "High damage, long range, but even worse accuracy!";
            _yamatoTurret.Cost = 16360;
            _shopWeapons.Add(_yamatoTurret);

            _weapon = new Weapon("88mm x3 'Nadeko Snake' Laser Turret", -30, 30, ProjectileType.Laser);
            _weapon.AutoloaderClip = 2;
            _weapon.ProjectilesFiredPerTurn = 3;
            _weapon.WeaponMaxCharge = 100;
            _weapon.AimDispersion = 1.55f;
            _weapon.BaseDamage = 450;
            _weapon.DamageRad = 80;
            _weapon.ExplRad = 10;
            _weapon.Rarity = 5;
            _weapon.ShortDesc = "Twice cursed and once more, fires just as hot as the darkness near Shirahebi Shrine.";
            _weapon.LongDesc = "A direct hit is deadly, be careful of small-ish explosions.";
            _weapon.Cost = 18850;
            _shopWeapons.Add(_weapon);

            Weapon _objLaser = new Weapon("90mm Neko-15X Laser", -30, 30, ProjectileType.Laser);
            _objLaser.AutoloaderClip = 2;
            _objLaser.WeaponMaxCharge = 100;
            _objLaser.BaseDamage = 1150;
            _objLaser.AimDispersion = 0.25f;
            _objLaser.DamageRad = 100;
            _objLaser.ExplRad = 5;
            _objLaser.UsesSatellite = true;
            _objLaser.Rarity = 6;
            _objLaser.ShortDesc = "A technologically advanced laser developed from the Neko-15X project. Top Secret.";
            _objLaser.LongDesc = "'Nekomimi Cooperative' written on the plate. Cute!";
            _objLaser.Cost = 39800;
            _shopWeapons.Add(_objLaser);

            _weapon = new Weapon("220mm 3x2 CLS-T 'KARAKARA' Acid", 0, 60, ProjectileType.Acid);
            _weapon.AutoloaderClip = 3;
            _weapon.ProjectilesFiredPerTurn = 2;
            _weapon.WeaponMaxCharge = 70;
            _weapon.AimDispersion = 3f;
            _weapon.BaseDamage = 550;
            _weapon.DamageRad = 100;
            _weapon.ExplRad = 10;
            _weapon.Rarity = 6;
            _weapon.ShortDesc = "Developed on the world of KARAKARA. The cause of environmental damage: this.";
            _weapon.LongDesc = "Acid! Acid! Not the one that makes you high, but it kills you too!";
            _weapon.Cost = 44680;
            _shopWeapons.Add(_weapon);

            _weapon = new Weapon("770mm 4x4 CLS-T 'Natsuki'", 0, 70, ProjectileType.Shell);
            _weapon.AutoloaderClip = 4;
            _weapon.ProjectilesFiredPerTurn = 4;
            _weapon.WeaponMaxCharge = 100;
            _weapon.AimDispersion = 12f;
            _weapon.BaseDamage = 400;
            _weapon.DamageRad = 100;
            _weapon.ExplRad = 40;
            _weapon.Rarity = 6;
            _weapon.ShortDesc = "Cute cupcakes! Sweet and fluffy, pink and purple!";
            _weapon.LongDesc = "Four by four equals sixteen! About her age!";
            _weapon.Cost = 73150;
            _shopWeapons.Add(_weapon);

            _weapon = new Weapon("810mm 4x3 KTS-T 'Terminus Est'", -20, 90, ProjectileType.Shell);
            _weapon.AutoloaderClip = 3;
            _weapon.ProjectilesFiredPerTurn = 4;
            _weapon.WeaponMaxCharge = 100;
            _weapon.AimDispersion = 3f;
            _weapon.BaseDamage = 800;
            _weapon.DamageRad = 200;
            _weapon.ExplRad = 45;
            _weapon.Rarity = 7;
            _weapon.ShortDesc = "White haired and blue-eyed, named after the holy demon sword.";
            _weapon.LongDesc = "What's with the trend of cute girls? Are there any here?";
            _weapon.Cost = 121150;
            _shopWeapons.Add(_weapon);


            Weapon _massDriver = new Weapon("210mm Kinetic Mass Driver", 0, 20, ProjectileType.Laser);
            _massDriver.AutoloaderClip = 2;
            _massDriver.WeaponMaxCharge = 1000;
            _massDriver.AimDispersion = 0.001f;
            _massDriver.ExplRad = 80;
            _massDriver.BaseDamage = 5000;
            _massDriver.DamageRad = 400;
            _massDriver.UsesSatellite = true;
            _massDriver.Rarity = 7;
            _massDriver.ShortDesc = "A mysterious weapon by the Kotona Umbress, it fires entire titanium pillars.";
            _massDriver.LongDesc = "Holding two rounds, it was salvaged from KTNS Hatsuyuki.";
            _massDriver.Cost = 195420;
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
