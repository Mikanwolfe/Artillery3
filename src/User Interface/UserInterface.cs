using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{




    public delegate void UIEventOccurred(UIEventArgs uiEvent);
    public class UserInterface
    {


        #region Fields
        List<UIElement> _uiElements;
        private static UserInterface instance;
        Observer _observerInstance;

        GameState _currentState;

        A3RData _a3RData;

        UIEventOccurred onUIEvent;

        bool _queueRefresh = false;
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

        public void Clear()
        {
            _uiElements.Clear();
        }

        public void ChangeGameState(GameState gameState)
        {
            _currentState = gameState;
            _uiElements.Clear();
            _uiElements.Add(_currentState.UIModule);
        }



        #endregion

        #region Methods
        public void NotifyUIEvent(object sender, UIEventArgs uiEventArgs)
        {
            onUIEvent(uiEventArgs);
        }

        public void RefreshUI()
        {
            _queueRefresh = true;
        }

        public void Initialise(A3RData a3RData)
        {
            _a3RData = a3RData;
            _uiElements.Clear();

        }



        public void AddElement(UIElement element)
        {
            _uiElements.Add(element);
        }

        public void Update()
        {
            if (_queueRefresh)
            {
                _uiElements.Clear();
                _uiElements.Add(_currentState.UIModule);
                _queueRefresh = false;
            }

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

        #endregion

        #region Properties
        public Observer ObserverInstance { get => _observerInstance; set => _observerInstance = value; }
        public UIEventOccurred UIEventOccurred { get => onUIEvent; set => onUIEvent = value; }
        public A3RData A3RData { set => _a3RData = value; }


        #endregion

    }
}
