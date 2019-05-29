using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static ArtillerySeries.src.Utilities;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class Wind
    {
        float _direction;
        float _magnitude;
        float _markerDirection;

        Random _random = new Random();

        public Wind()
        {
            _direction = 0;
            _magnitude = 0;
            _markerDirection = 0;
        }

        public void SetWind(float direction, float magnitude)
        {
            _direction = direction;
            _magnitude = magnitude;
        }

        public void Update()
        {
            _markerDirection += (_direction - _markerDirection) / 20;
        }

        public void SetWind()
        {
            int _directionInDeg = _random.Next(180);
            if (_directionInDeg > 45)
                _directionInDeg += 90;
            if (_directionInDeg > 225)
                _directionInDeg += 90;

            _direction = Rad(_directionInDeg);
            _magnitude = (float)_random.NextDouble();
        }

        public float X { get => _magnitude * (float)Math.Cos(_direction); }
        public float Y { get => _magnitude * (float)Math.Sin(_direction); }
        public float Direction { get => _direction; set => _direction = value; }
        public float DirectionInDeg { get => Deg(_direction); }
        public float MarkerDirection { get => Deg(_markerDirection); }
        public float Magnitude { get => _magnitude; set => _magnitude = value; }
    }
}
