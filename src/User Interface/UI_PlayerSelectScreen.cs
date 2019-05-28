using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_PlayerSelectTemplate : UIElementAssembly
    {
        UI_StaticImage _menuLogo;
        public UI_PlayerSelectTemplate(A3RData a3RData) : base(a3RData)
        {
            _menuLogo = new UI_StaticImage(Camera, Width(0.45f), Height(0.14f), 
                SwinGame.BitmapNamed("menuLogo"));
            AddElement(_menuLogo);
        }
    }

    public class UI_PlayerSelectNumberPlayers : UI_PlayerSelectTemplate
    {

        public UI_PlayerSelectNumberPlayers(A3RData a3RData)
            : base(a3RData)
        {
            AddElement(new UI_Text(Camera, Width(0.5f), Height(0.35f),
                Color.Black, "Number of players:", true));
        }
    }
}
