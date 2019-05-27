using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{




    public delegate void NotifyGame(UIEventArgs uiEvent);
    public class UserInterface
    {


        #region Fields
        List<UIElement> _uiElements;
        private static UserInterface instance;
        Observer _observerInstance;

        

        A3RData _a3RData;

        NotifyGame onNotifyUIEvent;
        #endregion

        #region Constructor
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


        public void ChangeGameState(UIElementAssembly _uiAssembly)
        {
            _uiElements.Clear();
            _uiElements.Add(_uiAssembly);
        }



        #endregion

        #region Methods
        public void NotifyUIEvent(object sender, UIEventArgs uiEventArgs)
        {
            onNotifyUIEvent(uiEventArgs);
        }

        /*
        public void FinishedPlayerSelection()
        {
            UIEventArgs eventArgs = new UIEventArgs(UIEvent.StartCombat);
            onNotifyUIEvent(eventArgs);
        }
        */

        


        public void Initialise(A3RData a3RData)
        {
            _a3RData = a3RData;
            _uiElements.Clear();

        }



        /*
       _currentState = MenuState.MainMenu;


       _uiElements.Clear();
       _currentState

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
   */
   /*
        public void ShowWinScreen()
        {
            _camera.Zero();


        }

        public void NewPlayerTurn()
        {
            UpdatePreviousWeaponCharge();
        }
        */


        public void AddElement(UIElement element)
        {
            _uiElements.Add(element);
        }

        public void Update()
        {
            foreach (UIElement e in _uiElements)
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

        /*

        public void UpdateChargeBar()
        {
            _uiCombat.UpdatePlayerChargeBar(_world.SelectedPlayer.WeaponChargePercentage);

        }

        public void ClearChargeBar()
        {
            _uiCombat.ClearChargeBar();
        }
        */


        /*
        public void UpdatePreviousWeaponCharge()
        {
            _uiCombat.SetPlayerPreviousPercentage(_world.SelectedPlayer.Character.PreviousWeaponChargePercentage);
        }
        */

        #endregion

        #region Properties
        public Observer ObserverInstance { get => _observerInstance; set => _observerInstance = value; }
        public NotifyGame OnNotifyUIEvent { get => onNotifyUIEvent; set => onNotifyUIEvent = value; }
        public A3RData A3RData { set => _a3RData = value; }


        #endregion

    }
}
