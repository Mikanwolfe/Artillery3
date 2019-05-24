using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IStateComponent<T>
    {
        void SwitchState(T nextState);
        T PeekState();
        void PushState(T nextState);
        T PopState();
    }

    public class StateComponent<T> : IStateComponent<T>
    {
        Stack<T> _stateStack;

        public StateComponent(T initState)
        {
            _stateStack = new Stack<T>();
            PushState(initState);
        }

        public T PeekState()
        {
            return _stateStack.Peek();
        }

        public T PopState()
        {
            return _stateStack.Pop();
        }

        public void PushState(T nextState)
        {
            if (_stateStack.Count != 0)
            {
                if (!_stateStack.Peek().Equals(nextState))
                {
                    _stateStack.Push(nextState);
                }
            }
            else
            {
                _stateStack.Push(nextState);
            }
        }

        public void SwitchState(T nextState)
        {
            if (!_stateStack.Peek().Equals(nextState))
            {
                _stateStack.Pop();
                _stateStack.Push(nextState);
            }
        }
    }
}
