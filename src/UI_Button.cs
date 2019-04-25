using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    /*
     * For now I'll inherit from the entity class
     *  though future versions will have to be rather careful 
     *  with this.
     * I'd want to look into how I construct GUI objects
     *  compared to normal entities.
     * It just looks like there should be a DrawableObj and GameObj
     *  class, though spltting them is... Maybe not ideal.
     *  
     * It would feel right to make a IDrawable interface since 
     *  not all objects use the drawable materials
     * However some entities may have special drawing requirements.
     * 
     * More research and/or thinking
     *  is DEFINITELY required.
     *  
     *  ....HOW!?
     *  Does every button send events? Does this mean you need a lot of publishers!?
     *  Should I use the observer pattern...?
     *  
     */

    public class UI_Button : Entity // Make sure this doesn't stay.
    {
        Bitmap _bitmap;

        public UI_Button() 
            : base("button")
        {
            EntityManager.Instance.AddEntity(this);
        }

        public UI_Button(float x, float y) 
            : this()
        {
            Pos = new Point2D()
            {
                X = x,
                Y = y
            };
        }

        public override void Draw()
        {
            if (_bitmap == null)
            {
                SwinGame.FillRectangle(Color.Grey, Pos.X, Pos.Y, 120, 50);
                SwinGame.DrawRectangle(Color.Black, Pos.X, Pos.Y, 120, 50);

            }
        }

        public override void Update()
        {
           
        }
    }
}
