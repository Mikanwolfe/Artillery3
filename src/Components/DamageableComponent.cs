using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Artillery.Utilities;

namespace Artillery
{

    public interface IDamageableComponent
    {
        void Damage(float damage); // Damage me
        void Die();
    }
    public class DamageableComponent : IDamageableComponent
    {
        #region Fields
        IDamageableComponent _parent;
        float _health, _maxHealth;
        float _armour, _maxArmour;
        #endregion

        #region Constructor
        public DamageableComponent(IDamageableComponent parent)
        {
            _parent = parent;
        }
        #endregion

        #region Methods
        public void Damage(float damage)
        {
            if (_armour > 0)
            {
                _armour -= damage;
                _armour = Clamp(_armour, 0, _maxArmour);
            }
            else
            {
                _health -= damage;
                _health = Clamp(_health, -1, _maxHealth); // neg 1 just in case of rounding errors
            }

            if (_health <= 0)
            {
                _parent.Die();
            }
        }

        public void Die()
        {
            _health = 0;
            // Parent must implement this class
        }
        #endregion

        #region Properties
        #endregion

    }
}
