using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public interface IWeapon
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

    public class Weapon : Entity, IWeapon
    {
        //Entity has position and direction, however
        // it needs to know the relative angle for drawing itself and the sight.
        // No wait, entities need to know about relative direction anyway. e.g. shields.


        Bitmap _bitmap;
        List<Projectile> _ammunition;

        Projectile _mainProjectile;

        WeaponState _state;
        WeaponState _previousState;

        /*
         * Concept of Offset Position:
         * 
         * <-  O    X <-- Weapon drawn behind character.
         *    /I/           Relative is calculated using offset, changes depending on Physics.Facing
         *    / \           Need to define base position for offset.
         */
        Point2D _offsetPosition;    //Used to calculate relative position to character.
        Point2D _relativePosition;

        float _weaponAngle = 0;
        float _minWepAngleRad = 0;
        float _maxWepAngleRad = 0;
        float _relativeAngle = 0 ;
        float _weaponCharge = 0;

        public Weapon(string name) : base(name)
        {
            _ammunition = new List<Projectile>();
            _weaponCharge = 0;
            _state = WeaponState.IdleState;
        }

        public Weapon (string name, float minWepAngleDeg, float maxWepAngleDeg)
            :this(name)
        {
            _minWepAngleRad = Rad(minWepAngleDeg);
            _maxWepAngleRad = Rad(maxWepAngleDeg);
            _weaponAngle = _minWepAngleRad;
        }
        
        public Projectile MainProjectile
        {
            get => _mainProjectile;
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

            Point2D projectilePos = new Point2D()
            {
                X = Pos.X,
                Y = Pos.Y-5
            };
            Point2D projectileVel = new Point2D()
            {
                X = (float)(_weaponCharge * Math.Cos(_weaponAngle + _relativeAngle)),
                Y = -1 * (float)(_weaponCharge * Math.Sin(_weaponAngle + _relativeAngle)),
            };
            if (Direction == FacingDirection.Left)
                projectileVel.X *= -1;


            Projectile projectile = new Projectile(Name + " Projectile", this, projectilePos, projectileVel);
            _mainProjectile = projectile;


            _weaponCharge = 0;

            _state = WeaponState.IdleState;
        }

        

        public override void Draw()
        {
            
        }

        public void DrawSight()
        {
            //SwinGame.DrawText("  Weapon State: " + _state, Color.Black, 320, 50);
            //SwinGame.DrawText("  Weapon Angle: " + Deg(_weaponAngle + _relativeAngle), Color.Black, 320, 70);
            //SwinGame.DrawText(" Weapon Charge: " + _weaponCharge, Color.Black, 320, 90);

            if (Direction == FacingDirection.Right)
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
