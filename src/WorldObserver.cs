using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class WorldObserver : Observer
    {
        World _world;
        public WorldObserver(World world)
        {
            _world = world;
        }
        public override void OnNotify(Entity entity, ObserverEvent observerEvent)
        {
            Console.WriteLine("WorldObserver has been called!");

            switch (observerEvent)
            {
                case ObserverEvent.PlayerEndedTurn:
                    _world.EndPlayerTurn();
                    break;

                case ObserverEvent.PlayerFiredProjectile:
                    _world.CharacterFiredProjectile(entity);
                    break;

            }
        }
    }
}
