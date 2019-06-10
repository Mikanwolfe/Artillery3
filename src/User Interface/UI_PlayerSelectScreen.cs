using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_PlayerSelectTemplate : UIElementAssembly
    {
        UI_StaticImage _menuLogo;
        endSelectStage _endSelectStage;
        public UI_PlayerSelectTemplate(A3RData a3RData, endSelectStage endSelectStage) : base(a3RData)
        {
            _endSelectStage = endSelectStage;


            _menuLogo = new UI_StaticImage(Camera, Width(0.45f), Height(0.14f),
                SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);
        }

        public endSelectStage EndSelectStage { get => _endSelectStage; set => _endSelectStage = value; }
    }
}
