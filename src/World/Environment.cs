using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

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
        CelestialBody _moon;

        List<Entity> _backgroundObjects; //Aesthetic

        Random _random = new Random();

        int _weatherParticlesDelay = 5;
        int _weatherDelayCount;
        

        EnvironmentPreset _preset;

        public Environment(Rectangle windowRect, Camera camera)
        {
            _windowRect = windowRect;
            _backgroundTerrain = new List<Terrain>();
            _camera = camera;

            _backgroundObjects = new List<Entity>();
            _moon = new CelestialBody("Moon", SwinGame.RGBAFloatColor(0.85f,0.85f,0.85f,1f), 20, 1000, -1000);
        }

        public void Initialise(EnvironmentPreset preset)
        {
            _backgroundObjects.Add(_moon);

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

            _weatherDelayCount = 0;
        }

        public Terrain Generate()
        {
            Terrain _terrain = _terrainFactory.Generate(SwinGame.RGBAFloatColor(0.4f, 0.6f, 0.4f, 1f));
            return _terrain;
        }

        public void CreateDustEffect()
        {
            _weatherDelayCount++;
            if (_weatherDelayCount > _weatherParticlesDelay)
            {
                _weatherDelayCount = 0;
                int _particlePos = _random.Next(0, (int)(_windowRect.Width + _windowRect.Height * 2));
                float _particleX;
                float _particleY;

                //fix. Also, wind mult for tracers = 0.
                if (_particlePos < _windowRect.Height)
                {
                    _particleX = Clamp(_camera.Pos.X - 10, 0, Artillery3R.Services.PhysicsEngine.Terrain.Map.Length - 1);
                    _particleY = _camera.Pos.Y + _windowRect.Height - _particlePos;
                }
                else if (_particlePos < (_windowRect.Height + _windowRect.Width))
                {
                    _particleX = _camera.Pos.X + _particlePos - _windowRect.Height;
                    _particleY = _camera.Pos.Y - 10;
                }
                else
                {
                    _particleX = Clamp(_camera.Pos.X + _windowRect.Width + 10, 0, Artillery3R.Services.PhysicsEngine.Terrain.Map.Length - 1);
                    _particleY = _camera.Pos.Y + _particlePos - _windowRect.Height - _windowRect.Width;
                }

                Vector _particleSpawnPoint = new Vector(_particleX, _particleY);

                Artillery3R.Services.ParticleEngine.CreateNonCollideParticle(_particleSpawnPoint, Color.Black,
                0f, 10f, 0.2f, 1);
            }
        }

        public void Update()
        {
            foreach (Terrain t in _backgroundTerrain)
            {
                t.Update();
            }

            foreach(Entity e in _backgroundObjects)
            {
                e.Update();
            }

            CreateDustEffect();
           

        }

        public void Draw()
        {
            foreach (Terrain t in _backgroundTerrain)
            {
                t.Draw();
            }

            foreach (Entity e in _backgroundObjects)
            {
                e.Draw();
            }
        }

        public Color SkyColor { get => _preset.BgColor; }
        public EnvironmentPreset Preset { get => _preset; set => _preset = value; }
    }
}
