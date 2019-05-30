using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public delegate void NotifyPlayerFinishedShop();
    public class ShopGameState : GameState
    {
        int _currentPlayerIndex;

        CameraFocusPoint _scrollingPoint;

        public ShopGameState(A3RData a3RData) 
            : base(a3RData)
        {
            UIModule = new UI_ShopMenu(a3RData, NextPlayerShop);
            _scrollingPoint = new CameraFocusPoint();
            _scrollingPoint.Vector.Y = A3RData.WindowRect.Height / 2;

        }

        public override void EnterState()
        {
            Console.WriteLine("Welcome to the shop!");
            A3RData.Camera.FocusCamera(_scrollingPoint);

            _currentPlayerIndex = 0;
            base.EnterState();
        }

        public override void Update()
        {
            _scrollingPoint.Vector.X = A3RData.WindowRect.Width / 2;
            A3RData.Camera.Update();


            /*
             * Turn these into commands later!!
             */

            //Console.WriteLine();

            if (SwinGame.MouseWheelScroll().Y < 0)
            {
                _scrollingPoint.Vector.Y += Constants.ScrollSpeed;
                Console.WriteLine("Scrolling down!");
            }
            else if (SwinGame.MouseWheelScroll().Y > 0)
            {
                _scrollingPoint.Vector.Y -= Constants.ScrollSpeed;
                Console.WriteLine("Scrolling up!");
            }




            base.Update();
        }

        public void NextPlayerShop()
        {
            if (_currentPlayerIndex >= A3RData.NumberOfPlayers)
            {
                UserInterface.Instance.NotifyUIEvent(this, new UIEventArgs(UIEvent.StartCombat));
            }
        }



    }
}
