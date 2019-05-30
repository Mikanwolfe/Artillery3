using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{

    public interface ICameraCanFocus
    {
        Point2D Pos { get; }
    }
    public class Camera : UpdatableObject
    {
        Rectangle _windowRect;
        Vector _pos;
        double _easeSpeed;
        ICameraCanFocus _focus;

        bool _focusLock;


        float OffsetX, OffsetY;

        
        public Camera(Rectangle windowRect)
        {
            _windowRect = windowRect;
            _pos = new Vector();
            _easeSpeed = Constants.CameraEaseSpeed;

            _focusLock = false;

            OffsetX = -1 * _windowRect.Width / 2;
            OffsetY = -1 * _windowRect.Height / 2;

        }

        public double EaseSpeed { get => _easeSpeed; set => _easeSpeed = value; }
        public Vector Pos { get => _pos; }
        public Rectangle WindowRect { get => _windowRect; set => _windowRect = value; }
        public ICameraCanFocus Focus { get => _focus; }
        public bool FocusLock { get => _focusLock; set => _focusLock = value; }

        public void CenterCameraAtFocus()
        {
            float destinationX = _focus.Pos.X + OffsetX;
            destinationX = Clamp(destinationX, Constants.CameraPadding, Constants.TerrainWidth - _windowRect.Width - Constants.CameraPadding);

            float destinationY = _focus.Pos.Y + OffsetY;
            destinationY = Clamp(destinationY, -Constants.CameraMaxHeight, _windowRect.Height + Constants.TerrainDepth);

            _pos.X += (destinationX - _pos.X) / Constants.CameraEaseSpeed;
            _pos.Y += (destinationY - _pos.Y) / Constants.CameraEaseSpeed;

        }

        public void FocusCamera(ICameraCanFocus focusPoint)
        {
            if (!_focusLock)
                _focus = focusPoint;
        }

        public void Zero()
        {
            _focus = new CameraFocusPoint()
            {
                Pos = new Point2D()
                {
                    X = _windowRect.Width / 2,
                    Y = _windowRect.Height / 2
                }
            };
        }


        public override void Update()
        {
            CenterCameraAtFocus();
            SwinGame.MoveCameraTo(Pos.ToPoint2D);
        }
    }
}
