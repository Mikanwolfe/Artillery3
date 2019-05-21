using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{

    public interface ICommand
    {
        void Execute();
    }
    public abstract class Command : ICommand
    {
        public abstract void Execute();
    }
}
