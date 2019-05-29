using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{

    public enum CombatState
    {
        Loading,
        TrackingPlayer,
        TrackingProjectile,
        TrackingEntity,
        ShowWinScreen,
        EndGame
    }

    public delegate void NotifyGameEnded();

    public class CombatGameState : GameState
    {

        #region Fields

        Command _playerCommand;
        InputHandler _inputHandler;
        StateComponent<CombatState> _state;
        Observer _observer;


        string _presetEnvironment = Constants.EnvironmentPreset;

        Rectangle _windowRect;

        CameraFocusPoint _cameraFocusPoint;

        int _turnCount;
        int _winScreenCount;

        int _playersAlive;


        NotifyGameEnded onNotifyGameEnded;


        A3RData _a3RData;

        #endregion

        #region Constructor
        public CombatGameState(A3RData a3RData)
            : base(a3RData)
        {
            _a3RData = a3RData;
            _windowRect = a3RData.WindowRect;

            _cameraFocusPoint = new CameraFocusPoint();

            A3RData.Environment = new Environment(_windowRect, A3RData.Camera);

            _state = new StateComponent<CombatState>(CombatState.TrackingPlayer); //change to loading later

            A3RData.Satellite = new Satellite("Maia", Constants.TerrainWidth / 2, -300);

            _inputHandler = new InputHandler();

            _observer = new CombatStateObserver(this);

            UIModule = new UI_Combat(A3RData);

            _turnCount = 0;
        }
        #endregion

        #region Methods

        public override void EnterState()
        {
            EnvironmentPreset _temporaryPreset = new EnvironmentPreset("Sad Day", 3);
            _temporaryPreset.ParallaxBgCoef = new float[] { 0.70f, 0.65f, 0.55f };
            _temporaryPreset.ParallaxBgColor = new Color[] {SwinGame.RGBAFloatColor(0f, 0.2f, 0f, 1),
                                                            SwinGame.RGBAFloatColor(0.1f, 0.3f, 0.1f, 1),
                                                            SwinGame.RGBAFloatColor(0.2f, 0.4f, 0.2f, 1) };
            _temporaryPreset.BgColor = Color.CadetBlue;
            _temporaryPreset.CloudColor = Color.Gray;

            //it should be A3RData's job to handle the environment.          


            GenerateEnvironment(_temporaryPreset);

            A3RData.Environment.Initialise(_temporaryPreset);
            A3RData.Terrain = A3RData.Environment.Generate();

            foreach (Player p in A3RData.Players)
            {
                p.LinkCombatState(this);
                p.SetXPosition((int)RandDoubleBetween(Constants.CameraPadding, A3RData.Terrain.Map.Length - 1 - Constants.CameraPadding));
                p.Initiallise();
                //p.Character.Health = p.Character.MaxHealth;
                //p.Character.Armour = p.Character.MaxArmour;
            }

            A3RData.SelectedPlayer = A3RData.Players[0];

            Artillery3R.Services.PhysicsEngine.Settle();
            SwitchCameraFocus(A3RData.SelectedPlayer.Character as ICameraCanFocus);

            _turnCount = 0;
            base.EnterState();
        }

        public void GenerateEnvironment(EnvironmentPreset preset)
        {
            //Generates the terrain + sky


            //_logicalTerrain = _environment.Generate();
            //Artillery3R.Services.PhysicsEngine.Terrain = _logicalTerrain;
        }

        public void CyclePlayers()
        {

            _playersAlive = 0;

            foreach (Player p in A3RData.Players)
            {
                if (p.IsAlive)
                    _playersAlive++;
            }
            if (_playersAlive <= 1)
            {
                if (PeekState() != CombatState.ShowWinScreen)
                    SwitchState(CombatState.ShowWinScreen);
            }

            int currentPlayerIndex = A3RData.Players.IndexOf(A3RData.SelectedPlayer);
            int nextPlayer = currentPlayerIndex++;

            if (nextPlayer > A3RData.NumberOfPlayers - 1)
            {
                nextPlayer = 0;
            }

            A3RData.SelectedPlayer = A3RData.Players[nextPlayer];

            A3RData.SelectedPlayer.SwitchState(PlayerState.Idle);
            A3RData.SelectedPlayer.NewTurn();

            A3RData.Satellite.NewTurn();

            _turnCount++;

            if (_turnCount % 4 == 0)
            {
                Artillery3R.Services.PhysicsEngine.SetWind();
            }
        }


        /*
        public void HandleInput()
        {
            if (PeekState() != WorldState.ShowWinScreen)
            {
                _playerCommand = _inputHandler.HandleInput();
                if (_playerCommand != null)
                    _playerCommand.Execute(_a3RData);
            }

        }
        */

        public void FocusOnPlayer()
        {
            SwitchCameraFocus(A3RData.SelectedPlayer.Character as ICameraCanFocus);
        }

        public void EndPlayerTurn()
        {
            CyclePlayers();
            SwitchCameraFocus(A3RData.SelectedPlayer.Character as ICameraCanFocus);
        }

        public void CharacterFiredProjectile(Entity projectile)
        {
            A3RData.Camera.FocusCamera(projectile);
            SwitchState(CombatState.TrackingProjectile);
        }

        public void FocusOnSatellite()
        {
            A3RData.Camera.FocusCamera(A3RData.Satellite);
            A3RData.Satellite.LookAtPos(A3RData.SelectedPlayer.Character.LastProjectilePosition);
        }

        public void FocusOnSatelliteStrike()
        {
            _cameraFocusPoint.Pos = A3RData.SelectedPlayer.Character.LastProjectilePosition;
            A3RData.Camera.FocusCamera(_cameraFocusPoint);
        }

        public void FireSatellite()
        {
            A3RData.Satellite.Fire(A3RData.SelectedPlayer.Character.LastProjectilePosition);
        }


        public override void Update()
        {
            A3RData.Camera.Update();
            A3RData.Environment.Update();
            _inputHandler.HandleInput(_a3RData);
            Artillery3R.Services.Update();


            Artillery3R.Services.PhysicsEngine.SetBoundaryBoxPos(A3RData.Camera.Pos);

            foreach (Player p in A3RData.Players)
            {
                p.Update();
            }

            //_windMarker.X = A3RData.Camera.Pos.X + (_windowRect.Width / 2) - 50;
            //_windMarker.Y = A3RData.Camera.Pos.Y + 50;

            //_windMarker.Rotation = Artillery3R.Services.PhysicsEngine.WindMarkerDirection + 180;
            A3RData.Satellite.Update();

            switch (PeekState())
            {
                case CombatState.ShowWinScreen:
                    _winScreenCount++;


                    if (_winScreenCount > 200)
                        SwitchState(CombatState.EndGame);

                    break;


            }

        }

        public void DrawSatellite()
        {
            A3RData.Satellite.Draw();
        }

        public override void Draw()
        {
            SwinGame.ClearScreen(A3RData.Environment.SkyColor);
            A3RData.Environment.Draw();
            A3RData.Terrain.Draw();

            Artillery3R.Services.Draw();
            DrawSatellite();

            SwinGame.DrawText("Selected Player: " + A3RData.SelectedPlayer.Name, Color.Black, 50, 70);
            A3RData.SelectedPlayer.Draw();

            SwinGame.DrawText("World State: " + _state.Peek(), Color.Black, A3RData.Camera.Pos.X + 20f, A3RData.Camera.Pos.Y + 40f);
            SwinGame.DrawText("Player State: " + A3RData.SelectedPlayer.PeekState(), Color.Black, A3RData.Camera.Pos.X + 20f, A3RData.Camera.Pos.Y + 50f);
            SwinGame.DrawText("Character State: " + A3RData.SelectedPlayer.Character.PeekState(), Color.Black, A3RData.Camera.Pos.X + 20f, A3RData.Camera.Pos.Y + 60f);
        }

        

        public void SwitchCameraFocus(ICameraCanFocus focusPoint)
        {
            A3RData.Camera.FocusCamera(focusPoint);
        }

        public void SwitchState(CombatState state)
        {
            // State machine transition code goes here

            switch (state)
            {
                case CombatState.ShowWinScreen:
                    foreach (Player p in A3RData.Players)
                    {
                        if (p.IsAlive)
                            A3RData.SelectedPlayer = p;
                    }

                    FocusOnPlayer();
                    _winScreenCount = 0;
                    break;

                case CombatState.EndGame:
                    if (onNotifyGameEnded != null)
                    {
                        onNotifyGameEnded();
                    }
                    break;
            }

            _state.Switch(state);
        }

        public CombatState PeekState()
        {
            return _state.Peek();
        }

        public void PushState(CombatState state)
        {
            _state.Push(state);
        }

        public CombatState PopState()
        {
            return _state.Pop();
        }
        #endregion

        #region Properties
        public Color SkyColor { get => A3RData.Environment.Preset.BgColor; }
        public Player SelectedPlayer { get => A3RData.SelectedPlayer; set => A3RData.SelectedPlayer = value; }
        public NotifyGameEnded OnNotifyGameEnded { get => onNotifyGameEnded; set => onNotifyGameEnded = value; }

        public Observer ObserverInstance => _observer;
       
        #endregion

    }
}
