using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IGameState
    {
        void Update();
        void Draw();
    }
    public class GameState: IGameState, IDrawableComponent
    {
        #region Fields

        protected static Random _random = new Random();
        protected A3Data _a3Data;
        protected InputHandler _inputHandler = new InputHandler();

        #endregion

        #region Constructor

        public GameState(A3Data a3Data)
        {
            _a3Data = a3Data;
        }

        #endregion

        #region Methods

        public void Draw()
        {
            
        }

        public void Update()
        {
            
        }

        #endregion

        #region Properties

        #endregion
    }
}
