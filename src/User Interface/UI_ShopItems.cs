using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    
    public class UI_ShopItems : UIElementAssembly
    {
        public delegate void PlayerBuyEvent();

        PlayerBuyEvent _onPlayerPurchase;

        int cursor = 0;
        private bool _queueRefresh;
        A3RData _a3RData;

        public UI_ShopItems(A3RData a3RData, PlayerBuyEvent onPlayerPurchase) : base(a3RData)
        {
            _onPlayerPurchase = onPlayerPurchase;
            _a3RData = a3RData;
            RefreshUI();
        }

        void RefreshUI()
        {
            _onPlayerPurchase?.Invoke();
            Console.WriteLine("Refeshing ShopItems UI");
            _queueRefresh = false;
            UIElements.Clear();
            int cursor = 0;
            foreach (Weapon w in A3RData.ShopWeapons)
            {
                UI_ShopButton shopButton = new UI_ShopButton(Camera, new Vector(Width(0.29f),
                    Height(0.45f) + cursor * 160), A3RData.RarityReference, A3RData.RarityWords, _a3RData, ItemWasBought);
                shopButton.ItemBeingBought = w;

                AddElement(shopButton);
                cursor++;
            }
        }

        public void RefreshItems()
        {
            _queueRefresh = true;
        }

        public void ItemWasBought(UI_ShopButton sender)
        {
            RefreshItems();
        }

        public override void Draw()
        {
            base.Draw();
        }

        public override void Update()
        {
            if (_queueRefresh)
                RefreshUI();
            base.Update();
        }
    }
}
