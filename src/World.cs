using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    enum WorldState
    {
        Loading,
        TrackingPlayer,
        TrackingProjectile,
        TrackingEntity
    }

    class World : IStateComponent<WorldState>
    {

        /*
         * Does the world need a player manager? I don't think so.
         * All the functions should be built here i reckon.
         * 
         */
        Rectangle _windowRect;
        Terrain _logicalTerrain;
        
        Command _playerCommand;
        InputHandler _inputHandler;
        StateComponent<WorldState> _state;
        Random _random;
        Observer _observer;

        Environment _environment;
        string _presetEnvironment = Constants.EnvironmentPreset;

        Camera _camera;


        List<Player> _players;
        Player _selectedPlayer;

        public World(Rectangle windowRect, InputHandler inputHandler)
        {
            _windowRect = windowRect;
            _camera = new Camera(windowRect);
            _logicalTerrain = new Terrain(_windowRect);
            _environment = new Environment(_windowRect, _camera);
            _inputHandler = inputHandler;
            _players = new List<Player>();
            _selectedPlayer = null;
            _state = new StateComponent<WorldState>(WorldState.TrackingPlayer); //change to loading later
            _observer = new WorldObserver(this);
            _random = new Random();
        }

        public void AddPlayer(Player p)
        {
            _players.Add(p);
        }

        public void GenerateEnvironment()
        {
            //Generates the terrain + sky
            _environment.Initialise();
            _logicalTerrain = _environment.Generate();
            PhysicsEngine.Instance.Terrain = _logicalTerrain;
        }

        public void NewSession()
        {
            GenerateEnvironment();




            /*
            TerrainFactory _terrainFactory = 
                new TerrainFactoryMidpoint(_windowRect, Constants.TerrainWidth, Constants.TerrainDepth, _camera);
            _terrain = _terrainFactory.Generate(SwinGame.RGBAFloatColor(0.4f, 0.6f, 0.4f, 1f));
            PhysicsEngine.Instance.Terrain = _terrain;

            _environment.Generate();


    */
            
        

            foreach (Player p in _players)
            {
                p.Character.SetXPosition((int)RandBetween(0, _logicalTerrain.Map.Length - 1));
            }

            PhysicsEngine.Instance.Settle();
            SwitchCameraFocus(_selectedPlayer.Character as ICameraCanFocus);
            //Character Innocentia = new Character("Innocentia");
        }

        public void CyclePlayers() //When do you cycle players? When is one round over?? Multiple weapons?
        {
            if (_players.Count == 1)
            {
                _selectedPlayer = _players[0];
            }
            else
            {

                int nextPlayer = _players.IndexOf(_selectedPlayer) + 1;
                if (nextPlayer > _players.Count - 1)
                    nextPlayer = 0;
                _selectedPlayer = _players[nextPlayer];
                _selectedPlayer.SwitchState(PlayerState.Idle);
            }
        }

        public void HandleInput()
        {
            _playerCommand = _inputHandler.HandleInput();
            if (_playerCommand != null)
                _playerCommand.Execute(_selectedPlayer.Character);

        }

        public void EndPlayerTurn()
        {
            CyclePlayers();
            SwitchCameraFocus(_selectedPlayer.Character as ICameraCanFocus);
        }

        public void CharacterFiredProjectile(Entity projectile)
        {
            _camera.FocusCamera(projectile);
            SwitchState(WorldState.TrackingProjectile);
        }


        public void Update()
        {
            _camera.Update();
            _environment.Update();

            foreach(Player p in _players)
            {
                p.Update();
            }

            
        }

        public void Draw()
        {

            _environment.Draw();
            _logicalTerrain.Draw();

            SwinGame.DrawText("Selected Player: " + _selectedPlayer.Name, Color.Black, 50, 70);
            _selectedPlayer.Draw();
        }

        public Observer ObserverInstance
        {
            get => _observer;
        }

        public void SwitchCameraFocus(ICameraCanFocus focusPoint)
        {
            _camera.FocusCamera(focusPoint);
        }

        public void SwitchState(WorldState state)
        {
            // State machine transition code goes here

            _state.Switch(state);
        }

        public WorldState PeekState()
        {
            return _state.Peek();
        }

        public void PushState(WorldState state)
        {
            _state.Push(state);
        }

        public WorldState PopState()
        {
            return _state.Pop();
        }
    }
}
