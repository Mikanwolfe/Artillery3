using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

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


            //let's make a fun transition:
            float i = 0;
            
            while (i <= 1)
            {
                i += 0.05f;
                Color _rectColour = SwinGame.RGBAFloatColor(1f, 1f, 1f, i);
                SwinGame.FillRectangle(_rectColour,0,0,2000,2000);

                SwinGame.RefreshScreen(60);
            }



            GameState nextState = _gameStates.Pop();
            GameState leavingState = _gameStates.Pop();

            leavingState.ExitState();
            nextState.EnterState();

            _gameStates.Push(nextState);
        }
    }
}
