using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public delegate void NotifyPlayerFinishedShop();
    public class ShopGameState : GameState
    {

        

        public ShopGameState(A3RData a3RData) 
            : base(a3RData)
        {
            UIModule = new UI_ShopMenu(a3RData, NextPlayerShop);

        }

        public void NextPlayerShop()
        {
            //
        }



    }
}
