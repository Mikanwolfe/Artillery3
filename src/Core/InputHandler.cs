using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class InputHandler
    {
        private bool _enabled = true;
        public void HandleInput(A3RData a3RData)
        {
            if (Enabled)
                a3RData.SelectedPlayer.InputMethod.HandleInput(a3RData);
        }
        public bool Enabled { get => _enabled; set => _enabled = value; }

    }
}
