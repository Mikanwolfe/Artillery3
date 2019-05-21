using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public class GameStateManager : IUpdatable, IDrawableComponent
    {


        #region Fields
        Stack<GameState> _stateStack;
        #endregion

        #region Constructor
        public GameStateManager(GameState initState)
        {
            _stateStack = new Stack<GameState>();
            PushState(initState);
        }
        #endregion

        #region Methods

        private void SwitchState(GameState nextState)
        {
            //The logic for the state movement goes here, states should not know about each other inside the 
            // state themselves but rather, only the state manager knows.
            PopState();
            PushState(nextState);            
        }

        private void PushState(GameState nextState)
        {
            nextState.Initialise();
            _stateStack.Push(nextState);
        }

        private GameState PopState()
        {
            _stateStack.Peek().Exit();
            return _stateStack.Pop();
        }

        public void Draw()
        {
            _stateStack.Peek().Draw();
        }

        public void Update()
        {
            _stateStack.Peek().Update();
        }

        #endregion

        #region Properties

        #endregion
    }
}
