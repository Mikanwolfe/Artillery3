using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class ExitState : GameState
    {
        public ExitState(A3RData a3RData) : base(a3RData)
        {
            UIModule = new UIElementAssembly(A3RData);
        }

        public override void EnterState()
        {
            A3RData.UserExitRequested = true;
            base.EnterState();
        }
    }
}
