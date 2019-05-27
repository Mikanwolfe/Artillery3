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
        A3RData _a3RData;

        public UIElementAssembly(A3RData a3RData)
        {
            _a3RData = a3RData;
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

        public A3RData A3RData { get => _a3RData; set => _a3RData = value; }
        public float Height(float percent) { return _a3RData.WindowRect.Height * percent; }
        public float Width(float percent) { return _a3RData.WindowRect.Width * percent; }

    }
}
