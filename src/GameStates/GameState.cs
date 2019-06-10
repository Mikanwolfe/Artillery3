using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface IGameState : IDrawable, IUpdatable
    {

    }
    public abstract class GameState : IGameState
    {


        #region Fields
        bool _enabled;
        A3RData _a3RData;
        UIElementAssembly _uiModule;
        #endregion

        #region Constructor
        public GameState(A3RData a3RData)
        {
            Enabled = true;
            _a3RData = a3RData;
        }
        #endregion

        #region Methods
        public virtual void EnterState()
        {
            UserInterface.Instance.ChangeGameState(this);
        }

        public virtual void ExitState()
        {
            //SwinGameSDK.SwinGame.StopMusic();
        }
        public virtual void Draw()
        {
        }

        public virtual void Update()
        {
        }
        #endregion

        #region Properties
        public bool Enabled { get => _enabled; set => _enabled = value; }
        public A3RData A3RData { get => _a3RData; set => _a3RData = value; }
        public UIElementAssembly UIModule { get => _uiModule; set => _uiModule = value; }

        #endregion
    }
}
