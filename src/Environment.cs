using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    enum WeatherType
    {
        Normal,
        Raining,
        Snowing,
        Thunder
    }
    public class Environment
    {
        /*
         * Environment is the **background**. Since the logical terrain is also drawn,
         *  it shouldn't be included here. This is for uncollideable stuff...
         *  
         * Terrain Factory was used as a transient thing previously. 
         * Now it should be persistent.
         * 
         */
        Rectangle _windowRect;
        List<Terrain> _backgroundTerrain;
        TerrainFactory _terrainFactory;
        Camera _camera;

        Random _random = new Random();

        

        EnvironmentPreset _preset;

        public Environment(Rectangle windowRect, Camera camera)
        {
            _windowRect = windowRect;
            _backgroundTerrain = new List<Terrain>();
            _camera = camera;
        }

        public void Initialise(EnvironmentPreset preset)
        {

            _preset = preset;

            _terrainFactory = new TerrainFactoryMidpoint(
                _windowRect, Constants.TerrainWidth,
                Constants.TerrainDepth, _camera);

            for (int i = 0; i < Constants.NumberParallaxBackgrounds; i++)
            {
                Terrain _generatedTerrain = _terrainFactory.Generate(_preset.ParallaxBgColor[i],
                    Constants.AverageTerrainHeight + i * 50 - 400, _preset.ParallaxBgCoef[i]);

                _generatedTerrain.TerrainDistance = Constants.DistFromInfinity / Constants.NumberParallaxBackgrounds * (Constants.NumberParallaxBackgrounds - i);
                
                _backgroundTerrain.Add(_generatedTerrain);
            }
        }

        public Terrain Generate()
        {
            Terrain _terrain = _terrainFactory.Generate(SwinGame.RGBAFloatColor(0.4f, 0.6f, 0.4f, 1f));
            return _terrain;
        }

        public void Update()
        {
            foreach (Terrain t in _backgroundTerrain)
            {
                t.Update();
            }


            int _particlePos = _random.Next(0, (int)(_windowRect.Width + _windowRect.Height * 2));
            float _particleX;
            float _particleY;

            //fix. Also, wind mult for tracers = 0.
            if (_particlePos > _windowRect.Height)
            {
                _particleX = _camera.Pos.X;
                _particleY = _camera.Pos.Y + _windowRect.Height - _particlePos;
            } else if (_particlePos > (_windowRect.Height + _windowRect.Width))
            {
                _particleX = _camera.Pos.X + _particlePos - _windowRect.Height;
                _particleY = _camera.Pos.Y;
            } else
            {
                _particleX = _camera.Pos.X + _windowRect.Width;
                _particleY = _camera.Pos.Y + _particlePos - _windowRect.Height - _windowRect.Width;
            }

            //Console.WriteLine("particle pos: " + _particlePos);
            Point2D _particleSpawnPoint = new Point2D()
            {
                X = _particleX,
                Y = _particleY
            };

            ParticleEngine.Instance.CreateSimpleParticle(_particleSpawnPoint, Color.DarkGray,
                0f, 2f, 0.2f);




        }

        public void Draw()
        {
            foreach (Terrain t in _backgroundTerrain)
            {
                t.Draw();
            }
        }

        public Color SkyColor { get => _preset.BgColor; }
        public EnvironmentPreset Preset { get => _preset; set => _preset = value; }
    }
}
