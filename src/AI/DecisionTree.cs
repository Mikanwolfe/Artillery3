using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class DecisionTreeInputMethod : InputMethod
    {
        private Player _targetPlayer;
        public DecisionTreeInputMethod(Player _player, A3RData a3RData) 
            : base(_player, a3RData)
        {
        }

        public void HandleInput(A3RData a3RData)
        {
            _targetPlayer = a3RData.Players[1];
            
        }

        public override void HandleInput()
        {
            throw new NotImplementedException();
        }
    }
}
