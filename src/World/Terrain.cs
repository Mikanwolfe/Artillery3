using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static Artillery.Utilities;

namespace Artillery
{
    public class Terrain : IDrawableComponent
    {

        #region Fields

        float[] _terrainMap;
        Rectangle _windowRect;
        Vector _pos; //The terrain moves!
        private Color _color; //assigned by factory based on gamedata
        private Camera _camera = null;
        private int _cameraMinLimitX, _cameraMaxLimitX;
        private int _terrainDistance = 0; //used for parallax

        #endregion

        #region Constructor
        public Terrain(Rectangle windowRect, Camera camera)
        {
            _windowRect = windowRect;
            _pos = new Vector();
            _camera = camera;
        }
        #endregion

        #region Methods
        public void Draw()
        {
            int xPos = 0;

            _cameraMinLimitX = Clamp((int)_camera.Pos.X, 0, _terrainMap.Length);
            _cameraMaxLimitX = Clamp((int)(_camera.WindowRect.Width + _camera.Pos.X + 1), 0, _terrainMap.Length);

            for (int i = 0; i < _terrainMap.Length; i++)
            {
                xPos = Clamp(i + (int)_pos.X, 0, _terrainMap.Length);
                if (xPos >= _cameraMinLimitX && xPos < _cameraMaxLimitX)
                    SwinGame.DrawLine(_color, xPos, _camera.Pos.Y + _windowRect.Height, xPos, (int)Math.Round(_terrainMap[i]));
            }
        }
        #endregion

        #region Properties
        public float[] Map { get => _terrainMap; set => _terrainMap = value; }
        public Color Color { get => _color; set => _color = value; }
        public Camera CameraInstance { get => _camera; set => _camera = value; }
        public Vector Pos { get => _pos; }
        public int TerrainDistance { get => _terrainDistance; set => _terrainDistance = value; }
        #endregion

    }
}
