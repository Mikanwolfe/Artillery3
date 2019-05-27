using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hatsuyuki.Core
{
    public class YuukiOutput
    {
        object _output;
        string _name;

        public YuukiOutput(object output, string name)
        {
            _output = output;
            _name = name;
        }
        public object Output { get => _output; set => _output = value; }
        public string Name { get => _name; set => _name = value; }
    }
}
