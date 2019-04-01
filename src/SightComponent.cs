using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    class SightComponent : Entity
    {
        FacingDirection _parentDirection;
        Point2D _parentPos;
        public SightComponent(string name, FacingDirection parentDirection, Point2D parentPos) 
            : base(name)
        {
            _parentDirection = parentDirection; //These should pass as references, I hope.
            _parentPos = parentPos;
        }

        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }

        public override void Draw()
        {
            // Draw angles!

        }

        public override void Update()
        {
            throw new NotImplementedException();
        }
    }
}
