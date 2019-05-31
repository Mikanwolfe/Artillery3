using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{
    public class UI_EquipBox : UI_Box
    {
        int cursor = 0;

        private bool _weaponHasBeenSelected;
        Dictionary<UI_SelectableTextBox, Weapon> _uiToWeapon;

        public UI_EquipBox(A3RData a3RData, int width, int height, Vector pos)
            : base(a3RData, width, height, pos)
        {
            _weaponHasBeenSelected = false;
            _uiToWeapon = new Dictionary<UI_SelectableTextBox, Weapon>();

            foreach (Weapon w in A3RData.SelectedPlayer.Character.WeaponList)
            {

                UI_SelectableTextBox _weaponBox = new UI_SelectableTextBox(A3RData, 260, 80,
                    new Vector(Pos.X + 20, Pos.Y + cursor * (80 + 20) + 20));
                _weaponBox.AddText(w.Name);
                _weaponBox.AddText("Damage: " + w.BaseDamage);
                _weaponBox.AddText("Type: " + w.ProjectileType);
                _weaponBox.OnPlayerSelectWeapon = PlayerSwapWeapon;

                _uiToWeapon.Add(_weaponBox, w);

                if (w.IsAutoloader)
                    _weaponBox.AddText("Clip: " + w.AutoloaderClip);

                cursor++;

                AddElement(_weaponBox);
            }



        }

        public void SwapSelectedWeapons()
        {
            int _selectedWeaponsCount = 0;

            UI_SelectableTextBox _firstSelection = null;
            UI_SelectableTextBox _secondSelection = null;

            foreach (UIElement e in UIElements)
            {
                if ((e as UI_SelectableTextBox).Selected)
                {
                    _selectedWeaponsCount++;
                    if (_firstSelection == null)
                        _firstSelection = e as UI_SelectableTextBox;
                    else
                        _secondSelection = e as UI_SelectableTextBox;
                }

            }

            Console.WriteLine("Number of weapons selected:" + _selectedWeaponsCount);

            if (_selectedWeaponsCount == 2)
            {
                Weapon _temp = _uiToWeapon[_firstSelection];

                _uiToWeapon[_firstSelection] = _uiToWeapon[_secondSelection];
                _uiToWeapon[_secondSelection] = _temp;

                foreach (UIElement e in UIElements)
                {
                    (e as UI_SelectableTextBox).Selected = false;
                }

            }
        }


        public void PlayerSwapWeapon()
        {
            if (_weaponHasBeenSelected)
            {
                SwapSelectedWeapons();
            }
            else
            {
                _weaponHasBeenSelected = true;
            }
        }
    }
}
