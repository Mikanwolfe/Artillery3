using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    class ObserverComponent
    {
        // The subject in a observer pattern
        List<Observer> _observers;

        public ObserverComponent()
        {
            _observers = new List<Observer>();
        }

        public void Notify(Entity entity, ObserverEvent observerEvent)
        {
            foreach(Observer observer in _observers)
            {
                observer.OnNotify(entity, observerEvent);
            }
        }

        public void AddObserver(Observer observer)
        {
            _observers.Add(observer);
        }

        public void removeObserver(Observer observer)
        {
            _observers.Remove(observer);
        }

    }
}
