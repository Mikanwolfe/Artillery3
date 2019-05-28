using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class LoadingGameState : GameState
    {
        Stack<GameState> _gameStates;
        public LoadingGameState(Stack<GameState> gameStates) : base(null)
        {
            _gameStates = gameStates;
        }

        public override void Update()
        {
            GameState poppedState = _gameStates.Pop();
            if (poppedState != this)
            {
                throw new Exception("Loading state was not most recent state -- something smells fishy.");
            }
                

            GameState nextState = _gameStates.Pop();
            GameState leavingState = _gameStates.Pop();

            leavingState.ExitState();
            nextState.EnterState();

            _gameStates.Push(nextState);
        }
    }
}
