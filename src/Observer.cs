using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public enum ObserverEvent
    {
        //No idea for now so this will do
        PlayerEndedTurn,
        PlayerFiredProjectile,
        FocusOnPlayer,
        FocusOnSatellite,
        FocusOnSatelliteStrike,
        FireSatellite
    }

    public abstract class Observer
    {

        public Observer()
        {

        }
        public abstract void OnNotify(Entity entity, ObserverEvent obvsEvent);


    }
}
