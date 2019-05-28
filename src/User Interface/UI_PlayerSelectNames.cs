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
        public UI_PlayerSelectNames(A3RData a3RData, endSelectStage endSelectStage) 
            : base(a3RData, endSelectStage)
        {
            _playerText = new UI_Text(Camera, Width(0.5f), Height(0.35f),
                Color.Black, "Player X:", true);
            AddElement(_playerText);
            
        }



        public override void Update()
        {
            base.Update();
        }
    }
}
