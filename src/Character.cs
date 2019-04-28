using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryFunctions;

namespace ArtillerySeries.src
{

    public enum CharacterState // Out of fuel state?
    {
        NotSelected,
        Idle,
        Walking,
        Firing,
        EndTurn
    }
    // Players use a single Character per game and they are pre-defined in the system (e.g. Innocentia/Object 261)
    //  but they can also be added to and customized on the fly.
    //  I don't know if this will work well but hey, let's hope for the best!


    public class Character : EntityAssembly, 
        IPhysicsComponent, IStateComponent<CharacterState>
    {

        float _health, _armour;
        float _maxHealth = 100, _maxArmour = 100;

        Vehicle _vehicle;  //throw this away
        //Point2D _pos;
        Bitmap _charBitmap; // use sprites
        PhysicsComponent _physics;
        StateComponent<CharacterState> _state;
        bool _selected;
        

        //Weapons should be seperate list.
        //they are treated seperately as base.draw() will draw all the sights, which isn't required...
        // OR, they can be in the same list with a known selected weaopn who's sight will be drawn.
        // Weapons are selected by iterating through known weapons by iterating through the list
        // and checking if the entity implements the IWeapon interface, or having a seperate list that
        // is updated every time a new entity is added to the list.

        Weapon _selectedWeapon;
        Weapon _weapon;
        Weapon _weapon2;
        List<Weapon> _weaponList;

        public delegate void NotifyFiring(Projectile projectile, Character parent);

        NotifyFiring notifyFiring;

       
        public Character(string name, int health, int armour)
            : base(name)
        {

            _physics = new PhysicsComponent(this);
            _vehicle = new Vehicle(name);
            _selected = false;
            _weapon = new Weapon("Base Weapon 1 -- Remove asap.", 0f, 50f);
            _weapon2 = new WeaponAcidCannon(30f, 70f);
            //_weapon2.SetProjectile();
            _weaponList = new List<Weapon>();

            _maxArmour = armour;
            _maxHealth = health;            

            EntityManager.Instance.AddEntity(this);

            _state = new StateComponent<CharacterState>(CharacterState.Idle);


            _selectedWeapon = _weapon;
            _physics.WindFrictionMult = 0.01f;


            _weaponList.Add(_weapon);
            _weaponList.Add(_weapon2);

        }

        public void Initialise()
        {
            _armour = _maxArmour;
            _health = _maxHealth;
        }

        public void SetFiringNotif(NotifyFiring parentFunction)
        {
            notifyFiring = new NotifyFiring(parentFunction);
        }

        public void MoveLeft()
        {
            Move(Constants.PlayerSpeed * -1);
        }
        public void MoveRight()
        {
            Move(Constants.PlayerSpeed);
        }

        public void ChargeWeapon()
        {
            if (PeekState() == CharacterState.Idle)
            {
                _selectedWeapon.Charge();
                SwitchState(CharacterState.Firing);
            } else if (PeekState() == CharacterState.Firing)
                _selectedWeapon.Charge();
        }

        public void FireWeapon()
        {
            if (PeekState() == CharacterState.Firing)
            {
                _selectedWeapon.Fire();
                notifyFiring(_selectedWeapon.MainProjectile, this);

                if (_selectedWeapon.AutoloaderFinishedFiring || !_selectedWeapon.IsAutoloader)
                    SwitchState(CharacterState.EndTurn);
                else
                    SwitchState(CharacterState.Idle);
            }
        }

        void Move(float acc)
        {
            if ((PeekState() == CharacterState.Idle) || (PeekState() == CharacterState.Walking))
            if (_physics.OnGround)
                _physics.AccX = acc;
        }

        public bool Selected { get => _selected; set => _selected = value; }

        PhysicsComponent IPhysicsComponent.Physics { get => _physics; set => _physics = value; }

        public void NewTurn()
        {
            foreach (Weapon w in _weaponList)
            {
                w.Reload();
            }
            _state.Switch(CharacterState.Idle);
        }

        public void ElevateWeapon()
        {
            _selectedWeapon.ElevateWeapon();
        }

        public void DepressWeapon()
        {
            _selectedWeapon.DepressWeapon();
        }

        public void SwitchWeapon()
        {
            if (_weaponList.Count != 1)
            {
                if(!_selectedWeapon.AutoloaderFired)
                    _selectedWeapon = _weaponList[(_weaponList.IndexOf(_selectedWeapon) + 1) % _weaponList.Count];
            }
        }

        public void AddEntity(Entity entity)
        {
            Entities.Add(entity);
        }

        public void RemoveEntity(Entity entity)
        {
            Entities.Remove(entity);
        }

        public void DrawSight()
        {
            _selectedWeapon.DrawSight();
        }

        public override void Draw()
        {

            if (_charBitmap == null)
            {
                if (_physics.OnGround)
                    SwinGame.FillCircle(Color.IndianRed, Pos.X, Pos.Y, Constants.InvalidPlayerCircleRadius);
                else
                    SwinGame.FillCircle(Color.Purple, Pos.X, Pos.Y, Constants.InvalidPlayerCircleRadius);

                if (_physics.Facing == FacingDirection.Left)
                    SwinGame.FillCircle(Color.Aquamarine, Pos.X - 3, Pos.Y, Constants.InvalidPlayerCircleRadius);
                else
                    SwinGame.FillCircle(Color.Aquamarine, Pos.X + 3, Pos.Y, Constants.InvalidPlayerCircleRadius);

                DrawTextCentre("Health: " + (int)_health, Color.DarkGray, Pos.X, Pos.Y - 50);
                DrawTextCentre("Armour: " + (int)_armour, Color.DarkGray, Pos.X, Pos.Y - 40);


            }

            DrawTextCentre(Name, Color.DarkGray, Pos.X, Pos.Y - 30);


            float angle = (float)(_physics.AbsAngleToGround * 180 / Math.PI);
            //SwinGame.DrawText("Absolute Angle: " + angle.ToString(), Color.Black, 50, 50);
            angle = (float)(_physics.RelAngleToGround * 180 / Math.PI);
            //SwinGame.DrawText("Relative Angle: " + angle.ToString(), Color.Black, 50, 70);

            

            base.Draw(); // Draws the sub-entities
        }

        public override void Update()
        {

            Direction = _physics.Facing;
            Pos = _physics.Position;
            AbsoluteAngle = _physics.AbsAngleToGround;

            foreach (Weapon w in _weaponList)
            {
                w.Update();
                w.UpdatePosition(Pos, Direction, AbsoluteAngle);
            }

            base.Update(); // Updates the sub-entities
        }

        public void SwitchState(CharacterState state)
        {
            // State machine transition code goes here

            switch (PeekState())
            {
                case CharacterState.Idle:
                    if (state == CharacterState.Firing)
                    {

                    }
                    //Play firing animation

                    break;
                default:
                    break;
            }
            _state.Switch(state);
            
        }

        public Projectile MainProjectile
        {
            get => _selectedWeapon.MainProjectile;
        }

        public bool UsesSatellite
        {
            get => _selectedWeapon.UsesSatellite;
        }

        public void SetXPosition(int x)
        {
            _physics.X = x;
        }

        public void PushState(CharacterState state)
        {
            _state.Push(state);
        }

        public CharacterState PeekState()
        {
            return _state.Peek();
        }

        public CharacterState PopState()
        {
            return _state.Pop();
        }

        public Point2D LastProjectilePosition
        {
            get => _selectedWeapon.LastProjPos;
        }

        public float WeaponChargePercentage
        {
            get => _selectedWeapon.WeaponChargePercentage;
        }

        public float PreviousWeaponChargePercentage
        {
            get => _selectedWeapon.PreviousWeaponChargePercentage;
        }

        public override void Damage(float damage)
        {
            if (_armour > 0)
            {
                _armour -= damage;
                _armour = Clamp(_armour, 0, _maxArmour);
            } else
            {
                _health -= damage;
                _health = Clamp(_health, 0, _maxHealth);
            }
        }
    }
}
