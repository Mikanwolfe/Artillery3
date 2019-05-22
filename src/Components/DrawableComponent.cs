using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{
    public interface IDrawableComponent
    {
        void Draw();
        Vector Pos { get; }
    }

    public class DrawableComponent : IDrawableComponent
    {


        #region Fields
        Sprite _sprite;
        IDrawableComponent _parent;
        #endregion

        #region Constructor

        public DrawableComponent(IDrawableComponent parent)
        {
            _parent = parent;
            _sprite = null;
        }

        public DrawableComponent(IDrawableComponent parent, Sprite sprite)
        {
            _parent = parent;
            _sprite = sprite;
        }

        public DrawableComponent(IDrawableComponent parent, Bitmap bitmap)
            : this(parent, new Sprite(bitmap))
        {

        }
        #endregion

        #region Methods


        public virtual void Draw()
        {
            if (Pos != null)
            {
                if (_sprite != null)
                {
                    _sprite.Draw(new ZeroVector().ToPoint2D);
                }
                else
                {
                    SwinGame.FillCircle(Color.Red, Pos.ToPoint2D, 3);
                }

            }

        }

        #endregion

        #region Properties
        public Vector Pos => _parent.Pos;
        #endregion


    }
}
