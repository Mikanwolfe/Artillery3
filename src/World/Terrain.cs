using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

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
            throw new NotImplementedException();
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
