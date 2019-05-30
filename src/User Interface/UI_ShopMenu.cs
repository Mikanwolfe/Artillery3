using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    public class UI_ShopMenu : UIElementAssembly
    {
        NotifyPlayerFinishedShop _notifyPlayerFinishedShop;

        
        public UI_ShopMenu(A3RData a3RData, NotifyPlayerFinishedShop notifyPlayerFinishedShop)
            : base(a3RData)
        {
            _notifyPlayerFinishedShop = notifyPlayerFinishedShop;
        }

        

    }
}
