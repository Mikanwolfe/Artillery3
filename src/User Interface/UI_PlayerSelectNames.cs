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

        UI_StaticImage _background;

        UI_CheckBox _isComputerPlayer;
        Dictionary<bool, IInputMethod> _inputMethodKey;

        public UI_PlayerSelectNames(A3RData a3RData, endSelectStage endSelectStage) 
            : base(a3RData, endSelectStage)
        {
            _background = new UI_StaticImage(Camera, 0, 0, SwinGame.BitmapNamed("shopBg"));
            AddElement(_background);


            _playerText = new UI_Text(Camera, Width(0.5f), Height(0.35f),
                Color.Black, "Player X:", true);
            AddElement(_playerText);

            _isComputerPlayer = new UI_CheckBox(Camera, 
                new Vector(Width(0.59f), Height(0.397f)), "Computer Player?");

            AddElement(_isComputerPlayer);
            _inputMethodKey = new Dictionary<bool, IInputMethod>();
            _inputMethodKey.Add(true, new AIInputMethod());
            _inputMethodKey.Add(false, new PlayerInputMethod());

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
                Player _player = new Player(SwinGame.EndReadingText(), 
                    _inputMethodKey[_isComputerPlayer.Checked]);
                A3RData.Players.Add(_player);
                _playerIndex++;
                _readingPlayerName = false;
                _isComputerPlayer.Checked = false;

            }

            if (_playerIndex > A3RData.NumberOfPlayers - 1)
            {
                EndSelectStage(PlayerSelect.PlayerNames);
            }

            base.Update();
        }
    }
}
