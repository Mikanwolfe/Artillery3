using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class Timer
    {

        private int _count;
        private int _countTo;

        public Timer(int countTo)
        {
            _countTo = countTo;
            _count = 0;
        }

        public void Tick()
        {   
            if (!Finished)
                _count++;
        }

        public void Reset()
        {
            _count = 0;
        }


        public bool Finished => (_count >= _countTo);
        public int Count => _count; 
        public int CountTo => _countTo; 
    }
}
