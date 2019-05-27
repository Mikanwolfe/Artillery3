using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface ICommand
    {
        void Execute(A3RData a3RData);
        string Name { get; }
    }
    public abstract class Command : ICommand
    {
        private string _name;
        Player _player;

        public Command(Player p, string name)
        {
            _player = p;
            _name = name;
        }

        public string Name { get => _name; set => _name = value; }
        public Player Player { get => _player; set => _player = value; }

        public abstract void Execute(A3RData a3RData);
    }
}
