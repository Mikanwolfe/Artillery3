using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public abstract class TerrainFactory
    {
        Rectangle _windowRect;
        Rectangle _terrainBox;
        Camera _camera;
        Random _random = new Random();
        float _reductionCoef = Constants.TerrainReductionCoefficient;

        public TerrainFactory(Rectangle windowRect, Rectangle terrainBox)
        {
            _windowRect = windowRect;
            _terrainBox = terrainBox;
        }

        public TerrainFactory(Rectangle windowRect, Rectangle terrainBox, Camera camera)
            : this(windowRect, terrainBox)
        {
            _camera = camera;
        }

        public Rectangle WindowRect { get => _windowRect; }
        public Random Random { get => _random; set => _random = value; }
        public float ReductionCoef { get => _reductionCoef; set => _reductionCoef = value; }

        public Rectangle TerrainBox { get => _terrainBox; }

        public Camera CameraInstance { get => _camera; set => value = _camera; }
        protected int PowerCeiling( float baseValue, float exp)
        {
            return (int)Math.Ceiling(Math.Log(exp, baseValue));
        }


        public abstract Terrain Generate(Color color);
        public abstract Terrain Generate(Color color, int averageTerrainHeight);

    }
}
