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

        public override void EnterState()
        {
            Console.WriteLine("Welcome to the shop!");

            //play transitions and whatnot

            base.EnterState();
        }

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
