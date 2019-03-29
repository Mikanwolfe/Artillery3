using System;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class GameMain
    {
        public static void Main()
        {
            ArtilleryGame _game = new ArtilleryGame();

            SwinGame.OpenAudio();
            //Open the game window
            SwinGame.OpenGraphicsWindow("Artillery3", 1600, 900);


            while (!SwinGame.WindowCloseRequested())
            {
                //Fetch the next batch of UI interaction
                SwinGame.ProcessEvents();



                //Clear the screen and draw the framerate
                SwinGame.ClearScreen(Color.White);

                SwinGame.DrawFramerate(0, 0);

                //Draw onto the screen
                SwinGame.RefreshScreen(60);
            }

            SwinGame.CloseAudio();
            SwinGame.ReleaseAllResources();

        }
    }
}