using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    interface IWeapon
    {
        List<Projectile> Ammunition { get; set; }
        void Fire();
        void Charge();
        void DrawSight();
        void ElevateWeapon();
        void DepressWeapon();
    }

    enum WeaponState
    {
        IdleState,
        ChargingState,
        FireState,
    }

    /*
     * Normally Weapon should be an EntityAssembly since it contains
     * entities but here, it contains only one entity. It *must* contain one SightComponent entity.
     * Hence, a special kind of entity called Weapon contains only one SightComponent entity with
     *  manaual implementation to update the position and direction of sight.
     * 
     */

    class Weapon : Entity, IWeapon
    {
        //Entity has position and direction, however
        // it needs to know the relative angle for drawing itself and the sight.
        // No wait, entities need to know about relative direction anyway. e.g. shields.


        Bitmap _bitmap;
        List<Projectile> _ammunition;

        WeaponState _state;
        WeaponState _previousState;

        float _weaponAngle;
        float _minWepAngleRad = 0;
        float _maxWepAngleRad = 0;
        float _relativeAngle = 0 ;
        float _weaponCharge = 0;

        public Weapon(string name) : base(name)
        {
            _ammunition = new List<Projectile>();
            _weaponAngle = _minWepAngleRad;
            _weaponCharge = 0;
            _state = WeaponState.IdleState;
        }

        public Weapon (string name, float minWepAngleDeg, float maxWepAngleDeg)
            :this(name)
        {
            _minWepAngleRad = Rad(minWepAngleDeg);
            _maxWepAngleRad = Rad(maxWepAngleDeg);
        }
        
        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }
        List<Projectile> IWeapon.Ammunition { get => _ammunition; set => _ammunition = value; }

        public void DepressWeapon()
        {
            _weaponAngle = PhysicsEngine.Instance.Clamp(_weaponAngle - Rad(1f), _minWepAngleRad, _maxWepAngleRad);
        }
        public void ElevateWeapon()
        {
            _weaponAngle = PhysicsEngine.Instance.Clamp(_weaponAngle + Rad(1f), _minWepAngleRad, _maxWepAngleRad);
        }

        public void Charge()
        {
            //Observation: void ChangeState(State state) could be used to change state + add a transition state/commands 
            _state = WeaponState.ChargingState;
        }

        public void Fire()
        {
            _state = WeaponState.FireState;
            Console.WriteLine("FIIIIRIIINNNG!!!! "+Name+" -- *boom*");
            _weaponCharge = 0;

            _state = WeaponState.IdleState;
        }



        public override void Draw()
        {
            
        }

        public void DrawSight()
        {
            SwinGame.DrawText("  Weapon State: " + _state, Color.Black, 320, 50);
            SwinGame.DrawText("Prev. W. State: " + _previousState, Color.Black, 320, 70);
            SwinGame.DrawText(" Weapon Charge: " + _weaponCharge, Color.Black, 320, 90);

            if (Direction == FacingDirection.Right)
            {
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_minWepAngleRad + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_minWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_minWepAngleRad + _relativeAngle));
                SwinGame.DrawLine(Color.Black, Pos.X + 10 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_maxWepAngleRad + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_maxWepAngleRad + _relativeAngle));
            }
            else
            {
                SwinGame.DrawLine(Color.Black, Pos.X - 10 * (float)Math.Cos(_relativeAngle), Pos.Y - 10 * (float)Math.Sin(_relativeAngle), Pos.X - 30 * (float)Math.Cos(_relativeAngle), Pos.Y - 30 * (float)Math.Sin(_relativeAngle));
                //SwinGame.DrawLine(Color.Black, Pos.X + 10, Pos.Y, Pos.X - 10, Pos.Y);
            }

            SwinGame.DrawLine(Color.Red, Pos.X + 10 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 10 * (float)Math.Sin(_weaponAngle + _relativeAngle), Pos.X + 30 * (float)Math.Cos(_weaponAngle + _relativeAngle), Pos.Y - 30 * (float)Math.Sin(_weaponAngle + _relativeAngle));

            SwinGame.DrawText("Weapon direction: " + Deg(_relativeAngle), Color.Black, 50, 90);
        }




        public override void Update()
        {

            

            _previousState = _state;


            switch (_state)
            {
                case WeaponState.IdleState:
                    break;

                case WeaponState.ChargingState:
                    _weaponCharge++;
                    break;

                case WeaponState.FireState:
                    break;
            }


            if (Direction == FacingDirection.Right)
                _relativeAngle = AbsoluteAngle;
            else
                _relativeAngle = AbsoluteAngle * -1;

        }


    }
}
