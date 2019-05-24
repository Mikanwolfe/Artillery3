using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public class InputHandler
    {
        public void HandleInput(A3Data a3Data)
        {
            a3Data.SelectedPlayer.InputMethod.HandleInput(a3Data);
        }
    }
}
