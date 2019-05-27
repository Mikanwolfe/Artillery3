using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hatsuyuki.Core
{
    public class YuukiTransition
    {
        State _targetState;

        public YuukiTransition(State parentState, State targetState)
        {
            _targetState = targetState;
        }

        public bool TransitionCondition()
        {
            return false;
        }
        public State TargetState { get => _targetState; set => _targetState = value; }
    }
}
