using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    class CelestialBody : Entity
    {
        bool _hasOrbit;
        float _orbitSpeed;
        Color _color;

        int _radius;

        int _particleDelayCount = 0;


        public CelestialBody(string name, Color color, int radius, float x, float y) 
            : base(name)
        {
            _color = color;
            _radius = radius;
            Pos = new Vector(x, y);
        }

        public override void Draw()
        {
            SwinGame.FillCircle(_color, Pos.ToPoint2D, _radius);
        }

        public override void Update()
        {
            _particleDelayCount++;
            if (_particleDelayCount > 5)
            {
                _particleDelayCount = 0;

                Artillery3R.Services.ParticleEngine.CreateNonCollideParticle(Pos, _color, 2f, 2f, 0.5f, 1f);

            }
        }
    }
}
