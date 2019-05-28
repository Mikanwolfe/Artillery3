using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_PlayerSelectNames : UI_PlayerSelectTemplate
    {
        UI_Text _playerText;
        int _playerIndex = 0;
        bool _readingPlayerName = false;

        public UI_PlayerSelectNames(A3RData a3RData, endSelectStage endSelectStage) 
            : base(a3RData, endSelectStage)
        {
            _playerText = new UI_Text(Camera, Width(0.5f), Height(0.35f),
                Color.Black, "Player X:", true);
            AddElement(_playerText);


            
        }



        public override void Update()
        {
            _playerText.Text = "Player " + ((int)_playerIndex + 1) + "'s Name:";


            if (!_readingPlayerName)
            {
                // Start reading player names
                SwinGame.StartReadingText(Color.Black, 20, SwinGame.FontNamed("guiFont"),
                                (int)Width(0.5f), (int)Height(0.4f));
                _readingPlayerName = true;
            }

            if (!SwinGame.ReadingText())
            {
                Player _player = new Player()
                A3RData.Players.Add()

            }

            if (A3RData.NumberOfPlayers > 1)
            {
                EndSelectStage(PlayerSelect.NumberPlayers);
            }




            base.Update();
        }
    }
}
