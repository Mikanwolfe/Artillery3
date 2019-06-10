using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    class UserInterfaceObserver : Observer
    {

        UserInterface _ui;
        public UserInterfaceObserver()
        {
            _ui = UserInterface.Instance;
        }

        public override void OnNotify(Entity entity, ObserverEvent observerEvent)
        {
            switch (observerEvent)
            {
                case ObserverEvent.PlayerIsChargingWeapon:
                    _ui.UpdateChargeBar();
                    break;

                case ObserverEvent.PlayerFiredProjectile:
                    _ui.ClearChargeBar();
                    _ui.UpdatePreviousWeaponCharge();
                    break;


            }
        }
    }
}
