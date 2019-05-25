using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface ICommand
    {
        void Execute(A3RData a3RData);
    }
    public abstract class Command : ICommand
    {
        public abstract void Execute(A3RData a3RData);
    }
}
}
