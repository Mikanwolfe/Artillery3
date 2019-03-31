using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    class Player
    {
        string _name;
        Character _character;

        public Player(string name)
        {
            _name = name;
        }

        public Player(string name, Character character)
            :this(name)
        {
            _character = character;
        }

        public Character Character { get => _character; set => _character = value; }
    }
}
