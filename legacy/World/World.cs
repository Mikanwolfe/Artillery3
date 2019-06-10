using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public enum WorldState
    {
        Loading,
        TrackingPlayer,
        TrackingProjectile,
        TrackingEntity,
        ShowWinScreen,
        EndGame
    }

    public delegate void NotifyGameEnded();

    public class World : IStateComponent<WorldState>
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
        CameraFocusPoint _cameraFocusPoint;

        int _turnCount;
        int _winScreenCount;

        List<Player> _players;
        Player _selectedPlayer;
        int _playersAlive;

        Satellite _satellite;
        NotifyGameEnded onNotifyGameEnded;

        Sprite _windMarker;

        public World(Rectangle windowRect, InputHandler inputHandler)
        {
            _windowRect = windowRect;
            UserInterface.Instance.World = this;
            _camera = UserInterface.Instance.Camera;
            _cameraFocusPoint = new CameraFocusPoint();
            _logicalTerrain = new Terrain(_windowRect);
            _environment = new Environment(_windowRect, _camera);
            _inputHandler = inputHandler;
            _players = new List<Player>();
            _selectedPlayer = null;
            _state = new StateComponent<WorldState>(WorldState.TrackingPlayer); //change to loading later
            _observer = new WorldObserver(this);
            _random = new Random();

            _windMarker = SwinGame.CreateSprite(SwinGame.BitmapNamed("windMarker"));

            _satellite = new Satellite("Maia", Constants.TerrainWidth / 2, -300);


            

            _turnCount = 0;
        }

        public void AddPlayer(Player p)
        {
            _players.Add(p);
        }

        public void GenerateEnvironment(EnvironmentPreset preset)
        {
            //Generates the terrain + sky

            _environment.Initialise(preset);
            _logicalTerrain = _environment.Generate();
            PhysicsEngine.Instance.Terrain = _logicalTerrain;
        }

        public void NewSession()
        {
            EnvironmentPreset _temporaryPreset = new EnvironmentPreset("Sad Day", 3);
            _temporaryPreset.ParallaxBgCoef = new float[] { 0.70f, 0.65f, 0.55f };
            _temporaryPreset.ParallaxBgColor = new Color[] {SwinGame.RGBAFloatColor(0f, 0.2f, 0f, 1),
                                                            SwinGame.RGBAFloatColor(0.1f, 0.3f, 0.1f, 1),
                                                            SwinGame.RGBAFloatColor(0.2f, 0.4f, 0.2f, 1) };
            _temporaryPreset.BgColor = Color.CadetBlue;
            _temporaryPreset.CloudColor = Color.Gray;

            _turnCount = 0;


            GenerateEnvironment(_temporaryPreset);


            foreach (Player p in _players)
            {
                p.SetXPosition((int)RandBetween(Constants.CameraPadding, _logicalTerrain.Map.Length - 1 - Constants.CameraPadding));
            }

            PhysicsEngine.Instance.Settle();
            SwitchCameraFocus(_selectedPlayer.Character as ICameraCanFocus);
        }

        public void CyclePlayers()
        {
            if (_players.Count == 1)
            {
                _selectedPlayer = _players[0];
            }
            else
            {

                _playersAlive = 0;
                foreach (Player p in _players)
                {
                    if (p.isCharAlive)
                        _playersAlive++;
                }
                if (_playersAlive <= 1)
                {
                    if(PeekState() != WorldState.ShowWinScreen)
                      SwitchState(WorldState.ShowWinScreen);
                }
                    

                int nextPlayer = Clamp((_players.IndexOf(_selectedPlayer) + 1) % _players.Count, 0, _players.Count - 1);
                _selectedPlayer = _players[nextPlayer];

                if (!_selectedPlayer.isCharAlive)
                    CyclePlayers();

                _selectedPlayer.SwitchState(PlayerState.Idle);
                _selectedPlayer.NewTurn();
                
            }

            UserInterface.Instance.NewPlayerTurn();
            _satellite.NewTurn();

            _turnCount++;

            if (_turnCount % 4 == 0)
            {
                PhysicsEngine.Instance.SetWind();
            }
        }

        public void HandleInput()
        {
            if (PeekState() != WorldState.ShowWinScreen)
            {
                _playerCommand = _inputHandler.HandleInput();
                if (_playerCommand != null)
                    _playerCommand.Execute(_selectedPlayer.Character);
            }

        }

        public void FocusOnPlayer()
        {
            SwitchCameraFocus(_selectedPlayer.Character as ICameraCanFocus);
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

        public void FocusOnSatellite()
        {
            _camera.FocusCamera(_satellite);
            _satellite.LookAtPos(_selectedPlayer.Character.LastProjectilePosition);
        }

        public void FocusOnSatelliteStrike()
        {
            _cameraFocusPoint.Pos = _selectedPlayer.Character.LastProjectilePosition;
            _camera.FocusCamera(_cameraFocusPoint);
        }

        public void FireSatellite()
        {
            _satellite.Fire(_selectedPlayer.Character.LastProjectilePosition);
        }


        public void Update()
        {
            _camera.Update();
            _environment.Update();

            PhysicsEngine.Instance.SetBoundaryBoxPos(_camera.Pos);

            foreach(Player p in _players)
            {
                p.Update();
            }

            _windMarker.X = _camera.Pos.X + (_windowRect.Width / 2) - 50;
            _windMarker.Y = _camera.Pos.Y + 50;

            _windMarker.Rotation = PhysicsEngine.Instance.WindMarkerDirection + 180;
            _satellite.Update();

            switch (PeekState())
            {
                case WorldState.ShowWinScreen:
                    _winScreenCount++;


                    if (_winScreenCount > 200)
                        SwitchState(WorldState.EndGame);

                    break;


            }

        }

        public void DrawSatellite()
        {
            _satellite.Draw();
        }

        public void Draw()
        {

            _environment.Draw();
            _logicalTerrain.Draw();
            

            //SwinGame.DrawBitmap("windMarker", _camera.Pos.X + (_windowRect.Width / 2), _camera.Pos.Y + 50);
            _windMarker.Draw();

            SwinGame.DrawText("Selected Player: " + _selectedPlayer.Name, Color.Black, 50, 70);
            _selectedPlayer.Draw();

            SwinGame.DrawText("World State: " + _state.Peek(), Color.Black, _camera.Pos.X + 20f, _camera.Pos.Y + 40f);
            SwinGame.DrawText("Player State: " + _selectedPlayer.PeekState(), Color.Black, _camera.Pos.X + 20f, _camera.Pos.Y + 50f);
            SwinGame.DrawText("Character State: " + _selectedPlayer.Character.PeekState(), Color.Black, _camera.Pos.X + 20f, _camera.Pos.Y + 60f);
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

            switch (state)
            {
                case WorldState.ShowWinScreen:
                    foreach(Player p in _players)
                    {
                        if (p.isCharAlive)
                            _selectedPlayer = p;
                    }

                    FocusOnPlayer();
                    _winScreenCount = 0;
                    break;

                case WorldState.EndGame:
                    if (onNotifyGameEnded != null)
                    {
                        onNotifyGameEnded();
                    }
                    break;
            }

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

        public Color SkyColor { get => _environment.Preset.BgColor; }
        public Player SelectedPlayer { get => _selectedPlayer; set => _selectedPlayer = value; }
        public NotifyGameEnded OnNotifyGameEnded { get => onNotifyGameEnded; set => onNotifyGameEnded = value; }
    }
}
