using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public interface ICameraCanFocus
    {
        Point2D Pos { get; }
    }
    public class Camera : UpdatableObject
    {
        Rectangle _windowRect;
        Point2D _pos;
        double _easeSpeed;
        ICameraCanFocus _focus;

        int OffsetX, OffsetY;

        
        public Camera(Rectangle windowRect)
        {
            _windowRect = windowRect;
            _pos = new Point2D();
            _easeSpeed = Constants.CameraEaseSpeed;

            OffsetX = -1 * (int)_windowRect.Width / 2;
            OffsetY = -1 * (int)_windowRect.Height / 2;

        }

        public double EaseSpeed { get => _easeSpeed; set => _easeSpeed = value; }
        public Point2D Pos { get => _pos; }
        public Rectangle WindowRect { get => _windowRect; set => _windowRect = value; }

        public void CenterCameraAtFocus()
        {
            int destinationX = (int)_focus.Pos.X + OffsetX;
            destinationX = Clamp(destinationX, Constants.CameraPadding, Constants.TerrainWidth - (int)_windowRect.Width - Constants.CameraPadding);

            int destinationY = (int)_focus.Pos.Y + OffsetY;
            destinationY = Clamp(destinationY, -Constants.CameraMaxHeight, (int)_windowRect.Height + Constants.TerrainDepth);

            _pos.X += (destinationX - _pos.X) / Constants.CameraEaseSpeed;
            _pos.Y += (destinationY - _pos.Y) / Constants.CameraEaseSpeed;

        }

        public void FocusCamera(ICameraCanFocus focusPoint)
        {
            _focus = focusPoint;
        }


        public override void Update()
        {
            CenterCameraAtFocus();

            SwinGame.MoveCameraTo(Pos);
        }
    }
}
