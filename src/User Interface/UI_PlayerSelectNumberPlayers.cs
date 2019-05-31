using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_PlayerSelectNumberPlayers : UI_PlayerSelectTemplate
    {
        bool _readingPlayers = false;

        UI_StaticImage _background;

        public UI_PlayerSelectNumberPlayers(A3RData a3RData, endSelectStage endSelectStage)
            : base(a3RData, endSelectStage)
        {
            _background = new UI_StaticImage(Camera, 0, 0, SwinGame.BitmapNamed("shopBg"));
            AddElement(_background);

            AddElement(new UI_Text(Camera, Width(0.5f), Height(0.35f),
                Color.Black, "Number of players:", true));
            A3RData.NumberOfPlayers = 0;

        }

        public override void Update()
        {

            if (!_readingPlayers)
            {
                // Start to read number of players
                SwinGame.StartReadingText(Color.Black, 20, SwinGame.FontNamed("guiFont"),
                                (int)Width(0.5f), (int)Height(0.4f));
                _readingPlayers = true;
            }

            if (!SwinGame.ReadingText())
            {
                try
                {
                    A3RData.NumberOfPlayers = Clamp(Convert.ToInt32(SwinGame.EndReadingText()),
                    0, Constants.MaxNumberPlayers);
                }
                catch (Exception e)
                {
                    Console.WriteLine("Reading number of players failed: " + e.Message);
                    _readingPlayers = false;
                    AddElement(new UI_Text(Camera, Width(0.5f), Height(0.45f),
                Color.Black, "Please enter in a number!", true));
                }

            }

            if (A3RData.NumberOfPlayers > 1)
            {
                A3RData.Players = new List<Player>(A3RData.NumberOfPlayers); // Good example of "External Wiring"
                EndSelectStage(PlayerSelect.NumberPlayers);
            }

            base.Update();
        }
    }
}
