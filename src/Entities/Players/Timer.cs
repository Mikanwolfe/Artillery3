using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public delegate void OnTimeUp();
    public class Timer
    {

        private int _count;
        private int _countTo;
        private bool _enabled = true;

        OnTimeUp _onTimeUp;

        public Timer(int countTo)
        {
            _countTo = countTo;
            _count = 0;
        }

        public Timer(int countTo, OnTimeUp onTimeUp)
            : this(countTo)
        {
            _onTimeUp = onTimeUp;
        }

        public void Tick()
        {
            if (Enabled)
            {
                if (!Finished)
                    _count++;
                else
                    _onTimeUp?.Invoke();
            }
        }

        public void Reset()
        {
            _count = 0;
        }


        public bool Finished => (_count >= _countTo);
        public int Count => _count;
        public int CountTo => _countTo;

        public bool Enabled { get => _enabled; set => _enabled = value; }
    }
}
