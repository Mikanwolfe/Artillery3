using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    public class UI_HealthUpgradeButton : UI_SelectableTextBox
    {
        Camera _camera;

        int _currentHealth, _nextHealth;
        int _cost;
        public UI_HealthUpgradeButton(A3RData a3RData, int width, int height, Vector pos) 
            : base(a3RData, width, height, pos)
        {
            _camera = A3RData.Camera;
        }

        public override void Draw()
        {
            base.Draw();
            SwinGame.DrawText("Health++ ", Color.DarkRed, SwinGame.FontNamed("shopFont"),
                _camera.Pos.X + Pos.X + 60, _camera.Pos.Y + Pos.Y + 10);

            SwinGame.DrawText(_currentHealth + ">>" + _nextHealth, Color.White, SwinGame.FontNamed("winnerFont"),
                _camera.Pos.X + Pos.X + 175, _camera.Pos.Y + Pos.Y + 17);

            SwinGame.DrawText("$" + _cost.ToString("N0"), SwinGame.RGBAColor(220, 220, 220, 255),
                SwinGame.FontNamed("shopFont"),
                _camera.Pos.X + Pos.X + 60, _camera.Pos.Y + Pos.Y + 30);

            SwinGame.DrawText("H", Color.DarkRed, SwinGame.FontNamed("winnerFont"),
                _camera.Pos.X + Pos.X + 23, _camera.Pos.Y + Pos.Y + 16);

            SwinGame.DrawRectangle(Color.DarkRed, _camera.Pos.X + Pos.X + 10, _camera.Pos.Y + Pos.Y + 10,
                40, 40);
        }

        public override void Update()
        {
            _currentHealth = (int)A3RData.SelectedPlayer.Character.MaxHealth;
            _nextHealth = (int)(_currentHealth * 1.3f);

            int _numUpgrades = A3RData.SelectedPlayer.Character.NumHealthUpgrades;
            _cost = (int)(Math.Pow(1.9, _numUpgrades*1.1) * 90) + 300;

            if (Selected)
            {
                Selected = false;
                Console.WriteLine("Upgrading Health!");



                if (A3RData.SelectedPlayer.Money >= _cost)
                {
                    A3RData.SelectedPlayer.Money -= _cost;
                    A3RData.SelectedPlayer.Character.MaxHealth = _nextHealth;
                    A3RData.SelectedPlayer.Character.NumHealthUpgrades++;
                    SwinGame.PlaySoundEffect(SwinGame.SoundEffectNamed("mechTurnOn"));
                }
                else
                {
                    SwinGame.PlaySoundEffect(SwinGame.SoundEffectNamed("mechFail"));
                }
                    

            }
            base.Update();
        }

    }

    public class UI_ArmourUpgradeButton : UI_SelectableTextBox
    {
        Camera _camera;

        int _currentHealth, _nextHealth;
        int _cost;
        public UI_ArmourUpgradeButton(A3RData a3RData, int width, int height, Vector pos)
            : base(a3RData, width, height, pos)
        {
            _camera = A3RData.Camera;
        }

        public override void Draw()
        {
            base.Draw();
            SwinGame.DrawText("Armour++ ", Color.White, SwinGame.FontNamed("shopFont"),
                _camera.Pos.X + Pos.X + 60, _camera.Pos.Y + Pos.Y + 10);

            SwinGame.DrawText(_currentHealth + ">>" + _nextHealth, Color.White, SwinGame.FontNamed("winnerFont"),
                _camera.Pos.X + Pos.X + 175, _camera.Pos.Y + Pos.Y + 17);

            SwinGame.DrawText("$" + _cost.ToString("N0"), SwinGame.RGBAColor(220, 220, 220, 255),
                SwinGame.FontNamed("shopFont"),
                _camera.Pos.X + Pos.X + 60, _camera.Pos.Y + Pos.Y + 30);

            SwinGame.DrawText("A", Color.White, SwinGame.FontNamed("winnerFont"),
                _camera.Pos.X + Pos.X + 23, _camera.Pos.Y + Pos.Y + 16);

            SwinGame.DrawRectangle(Color.White, _camera.Pos.X + Pos.X + 10, _camera.Pos.Y + Pos.Y + 10,
                40, 40);
        }

        public override void Update()
        {
            _currentHealth = (int)A3RData.SelectedPlayer.Character.MaxArmour;
            _nextHealth = (int)(_currentHealth * 1.3f);

            int _numUpgrades = A3RData.SelectedPlayer.Character.NumArmourUpgrades;
            _cost = (int)(Math.Pow(1.9, _numUpgrades * 1.1) * 90) + 300;

            if (Selected)
            {
                Selected = false;
                Console.WriteLine("Upgrading Armour!");



                if (A3RData.SelectedPlayer.Money >= _cost)
                {
                    A3RData.SelectedPlayer.Money -= _cost;
                    A3RData.SelectedPlayer.Character.MaxArmour = _nextHealth;
                    A3RData.SelectedPlayer.Character.NumArmourUpgrades++;
                    SwinGame.PlaySoundEffect(SwinGame.SoundEffectNamed("mechTurnOn"));
                }
                else
                {
                    SwinGame.PlaySoundEffect(SwinGame.SoundEffectNamed("mechFail"));
                }


            }
            base.Update();
        }

    }
}
