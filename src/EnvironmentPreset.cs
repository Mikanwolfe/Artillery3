using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class EnvironmentPreset
    {
        string _name;
        int _numParallaxBg;
        float[] _parallaxBgCoef;
        Color[] _parallaxBgColor;
        Color _bgColor;
        Color _cloudColor;


        public EnvironmentPreset(string name)
        {
            _name = name;
        }

        public EnvironmentPreset(string name, int numParallaxBg)
            : this(name)
        {
            _numParallaxBg = numParallaxBg;
            _parallaxBgCoef = new float[numParallaxBg];
            _parallaxBgColor = new Color[numParallaxBg];
        }

        public float[] ParallaxBgCoef { get => _parallaxBgCoef; set => _parallaxBgCoef = value; }
        public Color[] ParallaxBgColor { get => _parallaxBgColor; set => _parallaxBgColor = value; }
        public Color BgColor { get => _bgColor; set => _bgColor = value; }
        public Color CloudColor { get => _cloudColor; set => _cloudColor = value; }
    }
}
