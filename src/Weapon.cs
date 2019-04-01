using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    interface IWeapon
    {
        SightComponent Sight { get; set; }
        void Fire(float power, float relativeAngle, FacingDirection direction);
    }


    class Weapon
    {
    }
}
