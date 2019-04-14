using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    interface ICameraCanFocus
    {
        Point2D Pos { get; }
    }
    class Camera : UpdatableObject
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

        public int Clamp(int value, int min, int max)
        {
            return PhysicsEngine.Instance.Clamp(value, min, max);
        }

        public void CenterCameraAtFocus()
        {


            int destinationX = (int)_focus.Pos.X + OffsetX;
            destinationX = Clamp(destinationX, 0, 10000);

            int destinationY = (int)_focus.Pos.Y + OffsetY;
            destinationY = Clamp(destinationY, 0, 10000);

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
