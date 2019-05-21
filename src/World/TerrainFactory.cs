using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace Artillery
{

    public class TerrainOptions
    {

    }

    public abstract class TerrainFactory
    {
        #region Fields
        Rectangle _windowRect;
        Rectangle _terrainBox;
        Camera _camera;
        Random _random = new Random();
        float _reductionCoef = Artillery.Constants.TerrainReductionCoef;
        #endregion

        #region Constructor
        public TerrainFactory(Rectangle windowRect, Rectangle terrainBox, Camera camera)
        {
            _windowRect = windowRect;
            _terrainBox = terrainBox;
            Camera = camera;
        }
        #endregion

        #region Methods
        protected int PowerCeiling(float baseValue, float exp)
        {
            return (int)Math.Ceiling(Math.Log(exp, baseValue));
        }

        public abstract Terrain Generate(Color color);
        public abstract Terrain Generate(Color color, TerrainOptions options);
        #endregion

        #region Properties

        public Rectangle WindowRect { get => _windowRect; }
        public Random Random { get => _random; set => _random = value; }
        public float ReductionCoef { get => _reductionCoef; set => _reductionCoef = value; }
        public Rectangle TerrainBox { get => _terrainBox; }
        public Camera Camera { get => _camera; set => _camera = value; }

        //public Camera CameraInstance { get => _camera; set => value = _camera; }
        #endregion

    }
}
