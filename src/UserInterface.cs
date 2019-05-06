using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public delegate void NotifyGame(UIEventArgs uiEvent);
    public class UserInterface
    {
        List<UIElement> _uiElements;
        private static UserInterface instance;
        Rectangle _windowRect;
        World _world;
        Observer _observerInstance;

        UI_Combat _uiCombat;
        UI_MainMenu _uiMainMenu;
        UI_PlayerSelect _uiPlayerSelect;
        MenuState _currentState;

        

        NotifyGame onNotifyUIEvent;

        Camera _camera;

        private UserInterface()
        {
            instance = this;
            _uiElements = new List<UIElement>();
            _observerInstance = new UserInterfaceObserver();
        }

        public static UserInterface Instance
        {
            get
            {
                if (instance == null)
                    instance = new UserInterface();
                return instance;
            }
        }

        

        public void NotifyUIEvent(object sender, UIEventArgs uiEventArgs)
        {
            onNotifyUIEvent(uiEventArgs);
        }

        public void FinishedPlayerSelection(List<Player> players)
        {
            UIEventArgs eventArgs = new UIEventArgs(UIEvent.StartCombat);
            eventArgs.Players = players;
            onNotifyUIEvent(eventArgs);
        }

        public void UpdatePreviousWeaponCharge()
        {
            _uiCombat.SetPlayerPreviousPercentage(_world.SelectedPlayer.Character.PreviousWeaponChargePercentage);
        }


        public Camera Camera { get => _camera; set => _camera = value; }
        public Rectangle WindowRect { get => _windowRect; }
        public World World { get => _world; set => _world = value; }
        public Observer ObserverInstance { get => _observerInstance; set => _observerInstance = value; }
        public NotifyGame OnNotifyUIEvent { get => onNotifyUIEvent; set => onNotifyUIEvent = value; }

        public void SetWindowRect(Rectangle windowRect)
        {
            _windowRect = windowRect;
        }

        public void Initialise(MenuState menuState)
        {

            if (_camera != null)
            {
                SwinGame.SetCameraPos(ZeroPoint2D());
                for (float i = 0; i < 1; i += 0.1f)
                {
                    SwinGame.FillRectangle(SwinGame.RGBAFloatColor(1, 1, 1, i), _camera.Pos.X, _camera.Pos.Y, WindowRect.Width, WindowRect.Height);
                    SwinGame.RefreshScreen(60);
                }
            } else
            {
                SwinGame.SetCameraPos(ZeroPoint2D());
                for (float i = 0; i < 1; i += 0.1f)
                {
                    SwinGame.FillRectangle(SwinGame.RGBAFloatColor(1, 1, 1, i), 0, 0, WindowRect.Width, WindowRect.Height);
                    SwinGame.RefreshScreen(60);
                }
            }
            


            _uiElements.Clear();
            _currentState = menuState;

            switch (menuState)
            {

                case MenuState.MainMenu:
                    _uiMainMenu = new UI_MainMenu();
                    AddElement(_uiMainMenu);
                    break;


                case MenuState.PlayerSelectState:
                    _uiPlayerSelect = new UI_PlayerSelect();
                    AddElement(_uiPlayerSelect);
                    break;

                case MenuState.CombatStage:
                    _uiCombat = new UI_Combat();
                    AddElement(_uiCombat);
                    break;
            }
        }

        public void ShowWinScreen()
        {



        }

        public void NewPlayerTurn()
        {
            UpdatePreviousWeaponCharge();
        }

        public void AddElement(UIElement element)
        {
            _uiElements.Add(element);
        }

        public void Update()
        {
            foreach(UIElement e in _uiElements)
            {
                e.Update();
            }
        }

        public void Draw()
        {
            foreach (UIElement e in _uiElements)
            {
                e.Draw();
            }
        }



        public void UpdateChargeBar()
        {
            _uiCombat.UpdatePlayerChargeBar(_world.SelectedPlayer.WeaponChargePercentage);

        }

        public void ClearChargeBar()
        {
            _uiCombat.ClearChargeBar();
        }






    }
}
