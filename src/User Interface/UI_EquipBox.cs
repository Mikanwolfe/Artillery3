using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_EquipBox : UI_Box
    {
        int cursor = 0;

        int _selectedBoxes = 0;

        private bool _weaponHasBeenSelected;

        public UI_EquipBox(A3RData a3RData, int width, int height, Vector pos)
            : base(a3RData, width, height, pos)
        {


            foreach (Weapon w in A3RData.SelectedPlayer.Character.WeaponList)
            {

                UI_WeaponEquipBox _weaponBox = new UI_WeaponEquipBox(Camera, A3RData,
                    new Vector(Pos.X + 20, Pos.Y + cursor * (50 + 15) + 20), OnInventoryEvent);
                _weaponBox.HeldWeapon = w;
                _weaponBox.IsActive = true;

                cursor++;

                AddElement(_weaponBox);
            }
            AddElement(new UI_Line(Camera, new Vector(Pos.X + 20, Pos.Y + cursor * 65 + 20),
                new Vector(Pos.X + _width - 20, Pos.Y + cursor * 65 + 20)));
            AddElement(new UI_Text(Camera, Pos.X + 30, Pos.Y + cursor * 65 + 35, Color.White, SwinGame.FontNamed("winnerFont"),
                "Inventory"));
            cursor++;
            

            foreach (Weapon w in A3RData.SelectedPlayer.Character.Inventory)
            {

                UI_WeaponEquipBox _weaponBox = new UI_WeaponEquipBox(Camera, A3RData,
                    new Vector(Pos.X + 20, Pos.Y + cursor * (50 + 15) + 20), OnInventoryEvent);
                _weaponBox.HeldWeapon = w;
                _weaponBox.IsActive = false;

                cursor++;

                AddElement(_weaponBox);
            }

            

        }

        public void DeselectAllBoxes()
        {
            foreach (UIElement e in UIElements)
            {
                (e as UI_WeaponEquipBox).MainSelected = false;
            }
        }

        public void OnInventoryEvent(UI_WeaponEquipBox sender)
        {
            _selectedBoxes++;

            if (_selectedBoxes > 1)
            {
                DeselectAllBoxes();
            }
        }

        public override void Draw()
        {


            base.Draw();
        }


        /*
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
 
         */

    }
}
