using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public interface IHull
    {
        void Damage(float Damage);
    }

    public class Hull : Entity, IHull
    {

        private float _health, _armour;
        public Hull(string name, float health, float armour)
            :base(name)
        {
            _health = health;
            _armour = armour;
        }

        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }
        public float Health { get => _health; }
        public float Armour { get => _armour; }

        public void Damage(float Damage)
        {
            // Make sure to include types of damage later. 
            //  You know, for the Arc en Ciel later.
        }

        public override void Draw()
        {
        }

        public override void Update()
        {
        }
    }
}
