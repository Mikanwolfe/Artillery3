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
        private bool _queueRefresh;

        public delegate void PlayerSellEvent();

        PlayerSellEvent _onPlayerSell;


        private List<UI_WeaponEquipBox> _weaponBoxes;
        public UI_EquipBox(A3RData a3RData, int width, int height, Vector pos, PlayerSellEvent onPlayerSell)
            : base(a3RData, width, height, pos)
        {
            _onPlayerSell = onPlayerSell;
            RefreshUIBox();
        }
        public void RefreshEquipBox()
        {
            _queueRefresh = true;
        }

        void RefreshUIBox()
        {
            _queueRefresh = false;
            UIElements.Clear();
            int cursor = 0;
            _weaponBoxes = new List<UI_WeaponEquipBox>();

            int _index = 0;

            foreach (Weapon w in A3RData.SelectedPlayer.Character.WeaponList)
            {

                UI_WeaponEquipBox _weaponBox = new UI_WeaponEquipBox(Camera, A3RData,
                    new Vector(Pos.X + 20, Pos.Y + cursor * (50 + 15) + 20), OnInventoryEvent);
                _weaponBox.HeldWeapon = w;
                _weaponBox.IsActive = true;
                _weaponBox.IsInventory = false;
                _weaponBox.WeaponIndex = _index;

                cursor++;
                _weaponBoxes.Add(_weaponBox);
                AddElement(_weaponBox);
                _index++;
            }
            AddElement(new UI_Line(Camera, new Vector(Pos.X + 20, Pos.Y + cursor * 65 + 20),
                new Vector(Pos.X + _width - 20, Pos.Y + cursor * 65 + 20)));
            AddElement(new UI_Text(Camera, Pos.X + 30, Pos.Y + cursor * 65 + 35, Color.White, SwinGame.FontNamed("winnerFont"),
                "Inventory"));
            cursor++;

            _index = 0;
            foreach (Weapon w in A3RData.SelectedPlayer.Character.Inventory)
            {

                UI_WeaponEquipBox _weaponBox = new UI_WeaponEquipBox(Camera, A3RData,
                    new Vector(Pos.X + 20, Pos.Y + cursor * (50 + 15) + 20), OnInventoryEvent);
                _weaponBox.HeldWeapon = w;
                _weaponBox.IsActive = false;
                _weaponBox.IsInventory = true;
                _weaponBox.WeaponIndex = _index;

                cursor++;

                _weaponBoxes.Add(_weaponBox);
                AddElement(_weaponBox);
                _index++;
            }
            cursor++;

            UI_WeaponEquipBox _sellBox = new UI_WeaponEquipBox(Camera, A3RData,
                    new Vector(Pos.X + 20, Pos.Y + cursor * (50 + 15) + 20), OnInventoryEvent);
            _sellBox.WeaponIndex = -1;
            _sellBox.IsSellBox = true;
            AddElement(_sellBox);

        }

        public void DeselectAllBoxes()
        {
            foreach (UI_WeaponEquipBox w in _weaponBoxes)
            {
                w.MoveSelected = false;
            }
            _firstIndex = null;
            _secondIndex = null;
        }
        UI_WeaponEquipBox _firstIndex = null;
        UI_WeaponEquipBox _secondIndex = null;

        

        public void Swap<T>(ref T left, ref T right)
        {
            T temp = left;
            left = right;
            right = temp;
        }
        public void OnInventoryEvent(UI_WeaponEquipBox sender)
        {
            
            if (sender.MoveSelected)
            {
                if (_selectedBoxes == 0)
                    _firstIndex = sender;

                if (_selectedBoxes == 1)
                    _secondIndex = sender;


                _selectedBoxes++;
            } else
            {
                _selectedBoxes--;
                if (_selectedBoxes == 0)
                    _firstIndex = null;
            }

            Console.WriteLine("Boxes selected: " + _selectedBoxes);
            if (_selectedBoxes > 1)
            {
                SwinGame.PlaySoundEffect(SwinGame.SoundEffectNamed("mechConfirm"));
                Weapon temp;
                if (_firstIndex.IsInventory)
                {
                    if (_secondIndex.IsSellBox)
                    {
                        //second selected is sell box
                        A3RData.SelectedPlayer.Money += (int)(A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex].Cost * 0.7f);

                        A3RData.ShopWeapons.Add(A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex]);
                        A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex] = null;
                        _onPlayerSell?.Invoke();

                    }
                    else
                    {
                        // NOT a sell box
                        if (_secondIndex.IsInventory)
                        {
                            //inventory to inventory
                            temp = A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex] =
                                 A3RData.SelectedPlayer.Character.Inventory[_secondIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.Inventory[_secondIndex.WeaponIndex] = temp;
                        }
                        else
                        {
                            //inventory to weapon
                            temp = A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.Inventory[_firstIndex.WeaponIndex] =
                                 A3RData.SelectedPlayer.Character.WeaponList[_secondIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.WeaponList[_secondIndex.WeaponIndex] = temp;
                        }
                    }
                        
                }
                else
                {
                    if (_firstIndex.IsSellBox)
                    {
                        //second selected is sell box
                        A3RData.SelectedPlayer.Money += (int)(A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex].Cost * 0.7f);

                        A3RData.ShopWeapons.Add(A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex]);
                        A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex] = null;
                        _onPlayerSell?.Invoke();
                    }
                    else
                    {
                        if (_secondIndex.IsInventory)
                        {
                            //weapon to inventory
                            temp = A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex] =
                                 A3RData.SelectedPlayer.Character.Inventory[_secondIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.Inventory[_secondIndex.WeaponIndex] = temp;
                        }
                        else
                        {
                            //weapon to weapon
                            temp = A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.WeaponList[_firstIndex.WeaponIndex] =
                                 A3RData.SelectedPlayer.Character.WeaponList[_secondIndex.WeaponIndex];
                            A3RData.SelectedPlayer.Character.WeaponList[_secondIndex.WeaponIndex] = temp;
                        }
                    }
                }



                    Console.WriteLine("Clearing boxes");
                DeselectAllBoxes();
                _selectedBoxes = 0;

                RefreshEquipBox();


            }
        }

        public override void Update()
        {
            if (_queueRefresh)
                RefreshUIBox();
            base.Update();
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
