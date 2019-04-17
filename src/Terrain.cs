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
        private Color _color;
        private Camera _camera = null;
        private int _cameraMinLimit, _cameraMaxLimit;


        public Terrain(Rectangle windowRect)
        {
            _windowRect = windowRect;
        }
        public Terrain(Rectangle windowRect, Camera camera)
            : this(windowRect)
        {
            _camera = camera;
        }

        public float[] Map { get => _terrainMap; set => _terrainMap = value; }
        public Color Color { get => _color; set => _color = value; }
        public Camera CameraInstance { get => _camera; set => _camera = value; }

        public virtual void Draw()
        {
            if (_camera != null)
            {
                _cameraMinLimit = (int)_camera.Pos.X;
                _cameraMaxLimit = (int)(_camera.WindowRect.Width + _camera.Pos.X);
                for (int i = 0; i < _terrainMap.Length; i++)
                {
                    if (i >= _cameraMinLimit && i < _cameraMaxLimit)
                        SwinGame.DrawLine(_color, i, Constants.TerrainDepth, i, (int)Math.Round(_terrainMap[i]));
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
