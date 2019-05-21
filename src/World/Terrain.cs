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
        //private Camera _camera = null; <-- this will be stored in the game data
        private int _cameraMinLimitX, _cameraMaxLimitX;
        private int _terrainDistance = 0; //used for parallax

        #endregion

        #region Constructor
        #endregion

        #region Methods
        public void Draw()
        {
            throw new NotImplementedException();
        }
        #endregion

        #region Properties
        #endregion

    }
}
