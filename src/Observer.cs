using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    enum ObserverEvent
    {
        //No idea for now so this will do
        PlayerEndedTurn,
        PlayerFiredProjectile
    }

    abstract class Observer
    {

        public Observer()
        {

        }
        public abstract void OnNotify(Entity entity, ObserverEvent obvsEvent);


    }
}
