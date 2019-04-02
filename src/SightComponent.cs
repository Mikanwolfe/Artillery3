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
        float _minAngleRad, _maxAngleRad;
        Bitmap _bitMap;

        public SightComponent(string name):
            base(name)
        {
            _minAngleRad = 0;
            _maxAngleRad = 0;
        }
        public SightComponent(string name, float minAngleDeg, float maxAngleDeg)
            : base(name)
        {
            _minAngleRad = Rad(minAngleDeg);
            _maxAngleRad = Rad(maxAngleDeg);

        }

        public override string ShortDesc { get => base.ShortDesc; }
        public override string LongDesc { get => base.LongDesc; }
        public float MinAngleDeg { get => Deg(_minAngleRad); }
        public float MaxAngleDeg { get => Deg(_maxAngleRad); }
        public float MinAngleRad { get => _minAngleRad; }
        public float MaxAngleRad { get => _maxAngleRad; }

        public override void Draw()
        {
            if (_bitMap == null)
            {
                Point2D p1 = new Point2D();
                Point2D p2 = new Point2D();

                
            }

        }

        public override void Update()
        {
            throw new NotImplementedException();
        }
    }
}
