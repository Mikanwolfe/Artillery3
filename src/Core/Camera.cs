using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static Artillery.Utilities;

namespace Artillery
{
    public interface ICameraCanFocus
    {
        Vector Pos { get; }
    }
    public class CameraFocusPoint
        : ICameraCanFocus
    {
        Vector _pos = new Vector();
        public CameraFocusPoint(Vector pos)
        {
            _pos = pos;
        }
        public CameraFocusPoint()
            : this(new ZeroVector())
        {

        }
        public Vector Pos
        {
            get => _pos;
        }
    }
    public class Camera : UpdatableObject
    {
        #region Fields
        Rectangle _windowRect;
        Vector _pos;
        float _easeSpeed = Artillery.Constants.CameraEaseSpeed;
        ICameraCanFocus _focus;

        float OffsetX, OffsetY;
        #endregion

        #region Constructor
        public Camera(Rectangle windowRect)
        {
            _windowRect = windowRect;
            _pos = new Vector();
            

            OffsetX = -1 * _windowRect.Width / 2;
            OffsetY = -1 * _windowRect.Height / 2;

        }
        #endregion
        public void CenterCameraAtFocus()
        {
            float destinationX = _focus.Pos.X + OffsetX;
            destinationX = Clamp(destinationX, Artillery.Constants.CameraPadding, Artillery.Constants.TerrainWidth
                - _windowRect.Width - Artillery.Constants.CameraPadding);

            float destinationY = _focus.Pos.Y + OffsetY;
            destinationY = Clamp(destinationY, -Artillery.Constants.CameraMaxHeight, _windowRect.Height);

            _pos.X += (destinationX - _pos.X) / _easeSpeed;
            _pos.Y += (destinationY - _pos.Y) / _easeSpeed;

        }

        public void FocusCamera(ICameraCanFocus focusPoint)
        {
            _focus = focusPoint;
        }

        public void Zero()
        {
            _focus = new CameraFocusPoint();
        }

        #region Methods


        public override void Update()
        {
            CenterCameraAtFocus();
            SwinGame.MoveCameraTo(Pos.ToPoint2D);
        }
        #endregion

        #region Properties
        public float EaseSpeed { get => _easeSpeed; set => _easeSpeed = value; }
        public Vector Pos { get => _pos; }
        public Rectangle WindowRect { get => _windowRect; set => _windowRect = value; }
        #endregion
    }
}
