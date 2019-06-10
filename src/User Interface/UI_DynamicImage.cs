using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    public enum DynamicImageState
    {
        TransitionIn,
        Idle,
        TransitionOut
    }
    public class UI_DynamicImage : UI_StaticImage, IStateComponent<DynamicImageState>
    {

        float _targetX = 0;
        float _targetY = 0;
        int _easeSpeed = 10;
        float _animationCount = 0;
        StateComponent<DynamicImageState> _stateComponent;

        public UI_DynamicImage(Camera camera, float x, float y, float startX, float startY, int easeSpeed, Bitmap bitmap) 
            : base(camera, startX, startY, bitmap)
        {
            _targetX = x;
            _targetY = y;
            _easeSpeed = easeSpeed;
            _stateComponent = new StateComponent<DynamicImageState>(DynamicImageState.TransitionIn);
        }

        public override void Draw()
        {
            base.Draw();
        }

        public void SwitchState(DynamicImageState nextState)
        {
            //State machine goes here



            _stateComponent.Switch(nextState);
        }

        public DynamicImageState PeekState()
        {
            return _stateComponent.Peek();
        }

        public DynamicImageState PopState()
        {
            return _stateComponent.Pop();
        }

        public void PushState(DynamicImageState state)
        {
            _stateComponent.Push(state);
        }

        public override void Update()
        {
            _animationCount += 0.005f;
            if (_animationCount > 1f)
            {
                _animationCount = 0f;
            }
            X += (_targetX - X) / _easeSpeed;
            X += 0.5f * (float)Math.Sin(_animationCount * Math.PI * 2);

            Y += (_targetY - Y) / _easeSpeed;
        }
    }
}
