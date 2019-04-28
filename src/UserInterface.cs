using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{
    public class UserInterface
    {
        List<UIElement> _uiElements;
        private static UserInterface instance;
        Rectangle _windowRect;
        World _world;
        Observer _observerInstance;

        UI_Combat _uiCombat;


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

        public void Initialise()
        {
            _uiCombat = new UI_Combat();
            AddElement(_uiCombat);
        }

        public void NewPlayerTurn()
        {
            UpdatePreviousWeaponCharge();
        }

        public void UpdatePreviousWeaponCharge()
        {
            _uiCombat.SetPlayerPreviousPercentage(_world.SelectedPlayer.Character.PreviousWeaponChargePercentage);
        }


        public Camera Camera { get => _camera; set => _camera = value; }
        public Rectangle WindowRect { get => _windowRect; set => _windowRect = value; }
        public World World { get => _world; set => _world = value; }
        internal Observer ObserverInstance { get => _observerInstance; set => _observerInstance = value; }

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
