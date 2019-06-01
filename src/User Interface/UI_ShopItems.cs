using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class UI_ShopItems : UIElementAssembly
    {
        int cursor = 0;
        
        public UI_ShopItems(A3RData a3RData) : base(a3RData)
        {
            
            foreach(Weapon w in A3RData.ShopWeapons)
            {
                UI_ShopButton shopButton = new UI_ShopButton(Camera, new Vector(Width(0.29f),
                    Height(0.45f) + cursor * 160), A3RData.RarityReference, A3RData.RarityWords);
                shopButton.ItemBeingBought = w;
                
                AddElement(shopButton);
                cursor++;
            }

            
        }

        public override void Draw()
        {
            base.Draw();
        }

        public override void Update()
        {
            base.Update();
        }
    }
}
