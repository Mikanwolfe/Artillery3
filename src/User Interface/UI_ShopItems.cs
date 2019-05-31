using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class UI_ShopItems : UIElementAssembly
    {
        public UI_ShopItems(A3RData a3RData) : base(a3RData)
        {
            AddElement(new UI_ShopButton(Camera, new Vector(Width(0.31f), Height(0.5f))));
            AddElement(new UI_ShopButton(Camera, new Vector(Width(0.31f), Height(0.6f))));
            AddElement(new UI_ShopButton(Camera, new Vector(Width(0.31f), Height(0.7f))));
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
