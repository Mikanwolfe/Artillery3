using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class UIElementAssembly : UIElement
    {

        List<UIElement> _uiElements;
        public UIElementAssembly()
        {
            _uiElements = new List<UIElement>();
        }

        public void AddElement(UIElement element)
        {
            _uiElements.Add(element);
        }

        public override void Draw()
        {
            foreach (UIElement e in _uiElements)
            {
                e.Draw();
            }
        }

        public void ClearUI()
        {
            _uiElements.Clear();
        }

        public override void Update()
        {
            foreach (UIElement e in _uiElements)
            {
                e.Update();
            }
        }
    }
}
