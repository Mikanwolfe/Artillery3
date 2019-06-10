using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public enum AchievementEvent
    {
        Damage,
        WeaponFired
    }
    public class AchievementEventArgs : EventArgs
    {
        object _sender;
        AchievementEvent _achievementEvent;
        public AchievementEventArgs(object sender, AchievementEvent aEvent)
        {
            _sender = sender;
            _achievementEvent = aEvent;
        }

        private int _damage;

        public int Damage { get => _damage; set => _damage = value; }
        public AchievementEvent AchievementEvent { get => _achievementEvent; set => _achievementEvent = value; }
    }


    public class Achievements : ServicesModule
    {

        private int _damage;
        public int Damage { get => _damage; set => _damage = value; }

        /* The stuff below goes into classes so they can call this */
        public delegate void achievementEvent(object sender, AchievementEventArgs _eventArgs);
        public event achievementEvent EventOccured;


        public void onAchievementEvent(object sender, AchievementEventArgs eventArgs)
        {
            switch (eventArgs.AchievementEvent)
            {
                case AchievementEvent.WeaponFired:
                    if ((sender as Weapon).Name == "220mm/80 CLS-T 'Doki-Doki'")
                        A3RData.EasterEggTriggered = true;
                    break;

                case AchievementEvent.Damage:
                    _damage += eventArgs.Damage;
                    break;

            }
        }

        public Achievements(A3RData a3RData) 
            : base(a3RData)
        {


        }

    }
}
