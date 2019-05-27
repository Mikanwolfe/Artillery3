using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hatsuyuki.Core
{
    public class YuukiNode
    {

        List<YuukiTransition> _transitions;
        string _name;

        public YuukiNode(string name)
        {
            _name = name;
            _transitions = new List<YuukiTransition>();
        }

        public void AddTransition(YuukiTransition transition)
        {
            _transitions.Add(transition);
        }
    }
}
