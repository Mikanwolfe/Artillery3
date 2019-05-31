using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_TextBox : UI_Box
    {
        List<string> _textStrings;
        int _padding;

        int cursor = 0;

        public delegate void SpecialCharacter();

        Dictionary<string, SpecialCharacter> _specialCharacters;

        public UI_TextBox(A3RData a3RData, int width, int height, Vector pos) 
            : base(a3RData, width, height, pos)
        {
            _textStrings = new List<string>();
            _padding = 10;

            _specialCharacters = new Dictionary<string, SpecialCharacter>();

            _specialCharacters.Add("---", HorizontalRule);
        }

        public override void Draw()
        {
            cursor = 0;

            
            foreach (string s in _textStrings)
            {
                if (_specialCharacters.ContainsKey(s))
                {
                    _specialCharacters[s]();
                }
                else
                {
                    //SwinGame pix font characters are about 7px wide.
                    if (s.Length * 7 > _width - 2 * _padding)
                    {

                    }
                    else
                    {
                        SwinGame.DrawText(s, _targetColor, A3RData.Camera.Pos.X + Pos.X + _padding,
                            A3RData.Camera.Pos.Y + Pos.Y + _padding + cursor * 15);
                    }

                }

                cursor++;
            }

            base.Draw();
        }

        public void HorizontalRule()
        {

            float x1 = A3RData.Camera.Pos.X + Pos.X + _padding;
            float x2 = A3RData.Camera.Pos.X + Pos.X  + _width - _padding;
            float y = A3RData.Camera.Pos.Y + Pos.Y + _padding + cursor * 15 + 3;
            cursor++;
            SwinGame.DrawLine(_targetColor, x1, y, x2, y);
        }

        public void AddText(string text)
        {
            _textStrings.Add(text);
        }


        public void Clear()
        {
            _textStrings.Clear();
        }

        public int Padding { get => _padding; set => _padding = value; }


    }
}
