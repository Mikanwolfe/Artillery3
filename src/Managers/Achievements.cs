using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class AchievementEventArgs : EventArgs
    {
        private int _damage;

        public int Damage { get => _damage; set => _damage = value; }
    }

    public class Achievements : ServicesModule
    {

        private int _damage;

        public int Damage { get => _damage; set => _damage = value; }

        public delegate void achievementEvent(object sender, AchievementEventArgs _eventArgs);

        public event achievementEvent EventOccured;

        public Achievements(A3RData a3RData) 
            : base(a3RData)
        {


        }

    }
}
