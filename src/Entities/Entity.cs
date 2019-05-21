using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{
    public enum Direction
    {
        Left,
        Right
    }

    public abstract class Entity : UpdatableObject, IDrawableComponent, ICameraCanFocus
    {

        #region Fields
        DrawableComponent _drawableComponent;
        string _name;
        string _shortDesc;
        string _longDesc;
        Vector _pos;
        Direction _direction;
        double _absAngle;
        
        #endregion

        #region Constructor
        public Entity(string name)
        {
            _name = name;
            _shortDesc = name;
            _longDesc = " An entity, " + name;
            Enabled = true;
            _direction = Direction.Left;
            _absAngle = 0;
            _pos = new Vector();
        }
        #endregion

        #region Methods
        public override void Update()
        {
            
        }

        public virtual void Draw()
        {
            
        }
        #endregion

        #region Properties
        public string Name { get => _name; set => _name = value; }
        public string ShortDesc { get => _shortDesc; set => _shortDesc = value; }
        public string LongDesc { get => _longDesc; set => _longDesc = value; }
        public Direction Direction { get => _direction; set => _direction = value; }
        public float AbsAngle { get => _absAngle; set => _absAngle = value; }
        public Vector Pos { get => _pos; set => _pos = value; }
        public DrawableComponent DrawableComponent { get => _drawableComponent; set => _drawableComponent = value; }
        #endregion

    }
}
