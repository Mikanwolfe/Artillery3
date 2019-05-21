using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{

    public interface IInputHandler
    {
        Command HandleInput();
    }
    public class InputHandler : IInputHandler
    {

        public InputHandler()
        {

        }

        public Command HandleInput() //yes that means we can only handle one command at a time.
        {
            throw new NotImplementedException();
        }
    }
}
