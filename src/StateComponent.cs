using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    /*
     * 
     * Since a few classes (Weapon, Projectile)
     *  seem to use states, it seems to make sense
     *  that we would have a dedicated state 
     *  component to help with not needing to rewrite code.
     *  
     * Since I have a component I might as well go all the way. 
     * 
     */

    interface IStateComponent<T>
    {
        
        void Switch(T state);
        T Peek(); //Peek at state
        void Push(T state);
        T Pop();

        
        
    }

    class StateComponent<T> : IStateComponent<T>
    {
        Stack<T> _stateStack;
        // T should refer to the enum used for the state.

        public StateComponent(T initState)
        {
            _stateStack = new Stack<T>();
            Push(initState);
        }

        public T Peek()
        {
            return _stateStack.Peek();
        }

        public T Pop()
        {
            return _stateStack.Pop();
        }

        public void Push(T state)
        {
            _stateStack.Push(state);
        }

        public void Switch(T state)
        {
            _stateStack.Pop();
            _stateStack.Push(state);
        }

    }
}
