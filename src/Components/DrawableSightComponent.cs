using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static Artillery.Utilities;

namespace Artillery
{
    public class DrawableSightComponent : IDrawable
    {
        #region Fields
        Weapon _parent;
        #endregion

        #region Constructor
        public DrawableSightComponent(Weapon parent)
        {
            _parent = parent;
        }

        #endregion

        #region Methods
        public void Draw()
        {
            Point2D Pos = _parent.Pos.ToPoint2D;
            float _minWepAngleRad = _parent.MinWepAngleRad;
            float _maxWepAngleRad = _parent.MaxWepAngleRad;
            float _relativeAngle = _parent.RelativeAngle;
            float _weaponAngle = _parent.WeaponAngle;
            if (_parent.Direction == Direction.Right)
            {
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_minWepAngleRad + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_minWepAngleRad + _relativeAngle));
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle));

                SwinGame.DrawLine(Color.Red, Pos.X + 10 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_weaponAngle + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_weaponAngle + _relativeAngle));
            }
            else
            {
                SwinGame.DrawLine(Color.Black, Pos.X - 10 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_minWepAngleRad + _relativeAngle), Pos.X - 30 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_minWepAngleRad + _relativeAngle));
                SwinGame.DrawLine(Color.Black, Pos.X - 10 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle), Pos.X - 30 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle));

                SwinGame.DrawLine(Color.Red, Pos.X - 10 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_weaponAngle + _relativeAngle), Pos.X - 30 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_weaponAngle + _relativeAngle));
            }

            DrawAutoloaderClip();
        }

        public void DrawAutoloaderClip()
        {
            if (_isAutoloader)
            {
                if (_sprite == null)
                {
                    int xOffset = -30;
                    if (Direction == FacingDirection.Left)
                        xOffset *= -1;

                    int yOffset = -10;

                    for (int i = 0; i < _autoloaderClip; i++)
                    {
                        SwinGame.FillCircle(Color.Black, Pos.X + xOffset, Pos.Y + yOffset + 12 * i, 4);
                    }

                    for (int i = 0; i < _autoloaderAmmoLeft; i++)
                    {
                        SwinGame.FillCircle(Color.LightSkyBlue, Pos.X + xOffset, Pos.Y + yOffset + 12 * i, 3);
                    }
                }
            }
        }

        #endregion

        #region Properties
        #endregion
    }
}
