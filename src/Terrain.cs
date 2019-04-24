using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class Terrain : IDrawable
    {
        float[] _terrainMap; 
        Rectangle _windowRect;
        Point2D _pos;
        private Color _color;
        private Camera _camera = null;
        private int _cameraMinLimitX, _cameraMaxLimitX;
        private int _terrainDistance = 0; //used for parallax

        public Terrain(Rectangle windowRect)
        {
            _windowRect = windowRect;
            _pos = new Point2D();
        }
        public Terrain(Rectangle windowRect, Camera camera)
            : this(windowRect)
        {
            _camera = camera;
        }

        public int Clamp(int value, int min, int max)
        {
            return PhysicsEngine.Instance.Clamp(value, min, max);
        }

        public float[] Map { get => _terrainMap; set => _terrainMap = value; }
        public Color Color { get => _color; set => _color = value; }
        public Camera CameraInstance { get => _camera; set => _camera = value; }
        public Point2D Pos { get => _pos; }
        public int TerrainDistance { get => _terrainDistance; set => _terrainDistance = value; }

        public virtual void Update()
        {
            /*
             * Terrain Layers: 0 = base terrain
             * Distance from infty?
             * 
             */
            
            if (_terrainDistance != 0)
            {
                int cameraDistanceFromZero = (int)(CameraInstance.Pos.X - _pos.X);
                int distanceFromInfty =  _terrainDistance;

                int proportionalDistance = (int)Math.Round(cameraDistanceFromZero * (distanceFromInfty / (double)Constants.DistFromInfinity));
                _pos.X = proportionalDistance;

                if (_terrainDistance == Constants.DistFromInfinity)
                {
                    _pos.X = CameraInstance.Pos.X;
                }

                Console.WriteLine("Distance : {0}, Pos: {1}, CameraPos: {2}, Distance from Infty: {3}",
                    _terrainDistance, _pos.X, CameraInstance.Pos.X, Constants.DistFromInfinity);
            }
        }

        public virtual void Draw()
        {
            if (_camera != null)
            {
                int xPos = 0;

                _cameraMinLimitX = Clamp((int)_camera.Pos.X, 0, _terrainMap.Length);
                _cameraMaxLimitX = Clamp((int)(_camera.WindowRect.Width + _camera.Pos.X+1),0, _terrainMap.Length);

                for (int i = 0; i < _terrainMap.Length; i++)
                {
                    xPos = Clamp(i + (int)_pos.X,0,_terrainMap.Length);
                    if (xPos >= _cameraMinLimitX && xPos < _cameraMaxLimitX)
                        SwinGame.DrawLine(_color, xPos, Constants.TerrainDepth, xPos, (int)Math.Round(_terrainMap[i]));
                }
            }
            else
            {
                throw new Exception("Camera doesn't exist. TODO: Fix this and turn camera into a need");
                for (int i = 0; i < _terrainMap.Length; i++)
                {
                    SwinGame.DrawLine(_color, i, Constants.TerrainDepth, i, (int)Math.Round(_terrainMap[i]));
                }
            }
        }
    }
}
