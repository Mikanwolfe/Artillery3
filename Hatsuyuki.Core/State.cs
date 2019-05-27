using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hatsuyuki.Core
{
    public class State
    {
        List<YuukiTransition> _transition;
        string _name;

        public State(string name)
        {
            _name = name;
            _transition = new List<YuukiTransition>();
        }

    }
}
