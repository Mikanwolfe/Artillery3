using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class InputHandler
    {
        public void HandleInput(A3RData a3RData)
        {
            a3RData.SelectedPlayer.InputMethod.HandleInput(a3RData);
        }
    }
}
