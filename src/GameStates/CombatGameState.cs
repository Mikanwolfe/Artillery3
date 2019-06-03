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

        Timer _winCounterTimer;


        string _presetEnvironment = Constants.EnvironmentPreset;

        Rectangle _windowRect;

        CameraFocusPoint _cameraFocusPoint;

        int _turnCount;
        int _winScreenCount;

        int _playersAlive;

        Bitmap _backgroundBg;

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

            _backgroundBg = SwinGame.BitmapNamed("combatBg");

            _turnCount = 0;
        }
        #endregion

        #region Methods

        public override void EnterState()
        {
            A3RData.Camera.FocusLock = false;
            _inputHandler.Enabled = true;
            _state.Switch(CombatState.TrackingPlayer);

            Artillery3R.Services.PhysicsEngine.Clear();
            Artillery3R.Services.ParticleEngine.Clear();

            SwinGame.StopMusic();
            SwinGame.PlayMusic("generalBg");
            SwinGame.PlaySoundEffect("entryboomCombat");

            EnvironmentPreset _temporaryPreset = new EnvironmentPreset("Snowy Day", 3);
            _temporaryPreset.ParallaxBgCoef = new float[] { 0.70f, 0.65f, 0.55f };
            _temporaryPreset.ParallaxBgColor = new Color[] {SwinGame.RGBAColor(3, 21, 46, 255),
                                                            SwinGame.RGBAColor(52, 51, 50, 255),
                                                            SwinGame.RGBAColor(188, 195, 210, 255) };
            _temporaryPreset.BgColor = SwinGame.RGBAColor(229, 218, 248, 1);
            _temporaryPreset.CloudColor = Color.Gray;

            A3RData.Environment = new Environment(_windowRect, A3RData.Camera);
            A3RData.Environment.Initialise(_temporaryPreset);
            A3RData.Terrain = A3RData.Environment.Generate();

            foreach (Player p in A3RData.Players)
            {
                Artillery3R.Services.PhysicsEngine.AddComponent(p.Character as IPhysicsComponent);
                p.LinkCombatState(this);
                p.SetXPosition((int)RandDoubleBetween(Constants.CameraPadding, A3RData.Terrain.Map.Length - 1 - Constants.CameraPadding));
                p.Initiallise();
            }

            A3RData.SelectedPlayer = A3RData.Players[0];
            A3RData.SelectedPlayer.NewTurn();

            Artillery3R.Services.PhysicsEngine.Settle();
            SwitchCameraFocus(A3RData.SelectedPlayer.Character as ICameraCanFocus);

            _winCounterTimer = new Timer(200, NotifyCombatEndedGame);
            _winCounterTimer.Enabled = false;

            _turnCount = 0;
            base.EnterState();
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

            if (PeekState() != CombatState.ShowWinScreen)
            {
                int currentPlayerIndex = A3RData.Players.IndexOf(A3RData.SelectedPlayer);
                int nextPlayer = currentPlayerIndex + 1;

                if (nextPlayer > A3RData.NumberOfPlayers - 1)
                {
                    nextPlayer = 0;
                }

                A3RData.SelectedPlayer = A3RData.Players[nextPlayer];

                A3RData.SelectedPlayer.SwitchState(PlayerState.Idle);
                A3RData.SelectedPlayer.NewTurn();

                A3RData.Satellite.NewTurn();

                _turnCount++;

                if (_turnCount % 12 == 0)
                {
                    Artillery3R.Services.PhysicsEngine.SetWind();
                }

            }
        }



        public void FocusOnPlayer()
        {
            SwitchCameraFocus(A3RData.SelectedPlayer.Character as ICameraCanFocus);
        }

        public void EndPlayerTurn()
        {
            SwinGame.PlaySoundEffect("newTurn");
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
            A3RData.Wind.Update();
            A3RData.Environment.Update();
            _inputHandler.HandleInput(_a3RData);
            Artillery3R.Services.Update();

            _winCounterTimer.Tick();


            Artillery3R.Services.PhysicsEngine.SetBoundaryBoxPos(A3RData.Camera.Pos.ToPoint2D);

            foreach (Player p in A3RData.Players)
            {
                p.Update();
            }

            A3RData.Satellite.Update();

            switch (PeekState())
            {
                case CombatState.ShowWinScreen:

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
            _backgroundBg.Draw(_a3RData.Camera.Pos.X, _a3RData.Camera.Pos.Y - 500);
            A3RData.Environment.Draw();
            A3RData.Terrain.Draw();

            Artillery3R.Services.Draw();
            DrawSatellite();

            A3RData.SelectedPlayer.Draw();

            //SwinGame.DrawText("World State: " + _state.Peek(), Color.Black, A3RData.Camera.Pos.X + 20f, A3RData.Camera.Pos.Y + 40f);
            //SwinGame.DrawText("Player State: " + A3RData.SelectedPlayer.PeekState(), Color.Black, A3RData.Camera.Pos.X + 20f, A3RData.Camera.Pos.Y + 50f);
            //SwinGame.DrawText("Character State: " + A3RData.SelectedPlayer.Character.PeekState(), Color.Black, A3RData.Camera.Pos.X + 20f, A3RData.Camera.Pos.Y + 60f);
        }



        public void SwitchCameraFocus(ICameraCanFocus focusPoint)
        {
            A3RData.Camera.FocusCamera(focusPoint);
        }

        public override void ExitState()
        {
            base.ExitState();
        }

        public void NotifyCombatEndedGame()
        {
            Console.WriteLine("Combat just ended");
            
            onNotifyGameEnded?.Invoke();
            _winCounterTimer.Enabled = false;

            foreach (Player p in A3RData.Players)
            {
                p.Money += 500 + Artillery3R.Services.Achievements.Damage / 2;
            }

            Artillery3R.Services.Achievements.Damage = 0;

            UserInterface.Instance.NotifyUIEvent(this, new UIEventArgs(UIEvent.EndCombat));
        }

        public void SwitchState(CombatState state)
        {
            // State machine transition code goes here

            switch (state)
            {
                case CombatState.ShowWinScreen:
                    SwinGame.PlaySoundEffect("winSound");
                    foreach (Player p in A3RData.Players)
                    {
                        if (p.IsAlive)
                            A3RData.SelectedPlayer = p;
                    }
                    _winCounterTimer.Enabled = true;
                    FocusOnPlayer();
                    _inputHandler.Enabled = false;
                    UserInterface.Instance.AddElement(new UI_WinUI(A3RData));
                    break;

                case CombatState.EndGame:
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
