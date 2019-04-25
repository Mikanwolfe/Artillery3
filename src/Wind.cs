using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class Wind
    {
        float _direction;
        float _magnitude;

        public Wind()
        {
            _direction = 0;
            _magnitude = 0;
        }

        public void SetWind(float direction, float magnitude)
        {
            _direction = direction;
            _magnitude = magnitude;
        }

        public float X { get => _magnitude * (float)Math.Cos(_direction); }
        public float Y { get => _magnitude * (float)Math.Sin(_direction); }
        public float Direction { get => _direction; set => _direction = value; }
        public float Magnitude { get => _magnitude; set => _magnitude = value; }
    }
}
