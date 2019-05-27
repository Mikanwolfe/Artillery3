using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public class CombatStateObserver : Observer
    {
        CombatGameState _combatGameState;
        public CombatStateObserver(CombatGameState combatGameState)
        {
            _combatGameState = combatGameState;
        }
        public override void OnNotify(Entity entity, ObserverEvent observerEvent)
        {

            //we might be able to do a dict with method pointers/
            // ceebs tho

            switch (observerEvent)
            {
                case ObserverEvent.PlayerEndedTurn:
                    _combatGameState.EndPlayerTurn();
                    break;

                case ObserverEvent.PlayerFiredProjectile:
                    _combatGameState.CharacterFiredProjectile(entity);
                    break;

                case ObserverEvent.FocusOnPlayer:
                    _combatGameState.FocusOnPlayer();
                    break;

                case ObserverEvent.FocusOnSatellite:
                    _combatGameState.FocusOnSatellite();
                    break;

                case ObserverEvent.FocusOnSatelliteStrike:
                    _combatGameState.FocusOnSatelliteStrike();
                    break;

                case ObserverEvent.FireSatellite:
                    _combatGameState.FireSatellite();
                    break;

            }
        }
    }
}
