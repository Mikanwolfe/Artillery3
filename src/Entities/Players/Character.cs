using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{

    public enum CharacterState // Out of fuel state?
    {
        NotSelected,
        Idle,
        Walking,
        Firing,
        Dead,
        EndTurn
    }


    public class Character : EntityAssembly, 
        IPhysicsComponent, IStateComponent<CharacterState>
    {

        Timer _switchWeaponTimer;

        float _health, _armour;
        float _maxHealth = 100, _maxArmour = 100;

        Bitmap _charBitmap; // use sprites
        PhysicsComponent _physics;
        StateComponent<CharacterState> _state;
        bool _selected;
        bool _isChargingWeapon, _wasChargingWeapon;

        Weapon _selectedWeapon;
        Weapon _weapon;
        Weapon _weapon2;
        List<Weapon> _weaponList;

        public delegate void NotifyFiring(Projectile projectile, Character parent);

        NotifyFiring notifyFiring;
        int _smokeCount;
       
        public Character(string name, int health, int armour)
            : base(name)
        {
            _weaponList = new List<Weapon>();

            _physics = new PhysicsComponent(this);
            _selected = false;


            _weapon = new Weapon("Base Weapon 1 -- Remove asap.", 0f, 50f, ProjectileType.Shell);
            _weapon.UsesSatellite = true;
            _weaponList.Add(_weapon);

            _weapon = new Weapon("Base Weapon 2 -- Remove asap.", 0f, 50f, ProjectileType.Shell);
            _weapon.ProjectilesFiredPerTurn = 3;
            _weapon.AutoloaderClip = 3;
            _weapon.UsesSatellite = false;
            _weaponList.Add(_weapon);

            _maxArmour = armour;
            _maxHealth = health;            

            Artillery3R.Services.EntityManager.AddEntity(this);

            _state = new StateComponent<CharacterState>(CharacterState.Idle);


            _selectedWeapon = _weapon;
            _physics.WindFrictionMult = 0.01f;

            _switchWeaponTimer = new Timer(20);
            

            _smokeCount = 0;

        }

        public void Initialise()
        {
            _armour = _maxArmour;
            _health = _maxHealth;
        }

        public void AddWeapon(Weapon w)
        {
            _weaponList.Add(w);
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
            _isChargingWeapon = true;
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
            _wasChargingWeapon = false;
            _isChargingWeapon = false;
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

            if (_switchWeaponTimer.Finished)
            {
                if (_weaponList.Count != 1)
                {
                    if (!_selectedWeapon.AutoloaderFired)
                        _selectedWeapon = _weaponList[(_weaponList.IndexOf(_selectedWeapon) + 1) % _weaponList.Count];
                }

                _switchWeaponTimer.Reset();
            }
        }

        public bool isAlive
        {
            get
            {
                if (_health <= 1)
                    return false;

                return true;
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

                if (_physics.Facing == FacingDirection.Left)
                    SwinGame.FillCircle(Color.Aquamarine, Pos.X - 3, Pos.Y, Constants.InvalidPlayerCircleRadius);
                else
                    SwinGame.FillCircle(Color.Aquamarine, Pos.X + 3, Pos.Y, Constants.InvalidPlayerCircleRadius);


                if (isAlive)
                    SwinGame.FillCircle(Color.IndianRed, Pos.X, Pos.Y, Constants.InvalidPlayerCircleRadius);
                else
                    SwinGame.FillCircle(Color.Black, Pos.X, Pos.Y, Constants.InvalidPlayerCircleRadius);

                DrawTextCentre("Health: " + (int)_health, Color.DarkGray, Pos.X, Pos.Y - 50);
                DrawTextCentre("Armour: " + (int)_armour, Color.DarkGray, Pos.X, Pos.Y - 40);


            }

            DrawTextCentre(Name, Color.DarkGray, Pos.X, Pos.Y - 30);


            float angle = (float)(_physics.AbsAngleToGround * 180 / Math.PI);
            angle = (float)(_physics.RelAngleToGround * 180 / Math.PI);

            

            base.Draw(); // Draws the sub-entities
        }

        public override void Update()
        {
            _switchWeaponTimer.Tick();

            if (_isChargingWeapon)
                _wasChargingWeapon = true;

            if (_wasChargingWeapon && !_isChargingWeapon)
                FireWeapon();

            _isChargingWeapon = false;


            Direction = _physics.Facing;
            Pos = _physics.Position;
            AbsoluteAngle = _physics.AbsAngleToGround;

            if (PeekState() != CharacterState.Dead)
            {
                if (!isAlive)
                    SwitchState(CharacterState.Dead);
            }

            _smokeCount++;
            if (_smokeCount > 10)
            {
                if (_health / _maxHealth < 0.8)
                    Artillery3R.Services.ParticleEngine.CreateSmokeParticle(Pos, Color.Grey, 4f, 0.6f);

                if (_health / _maxHealth < 0.5)
                    Artillery3R.Services.ParticleEngine.CreateSmokeParticle(Pos, Color.Black, 3f, 0.5f);

                if (_health / _maxHealth < 0.3)
                {
                    Artillery3R.Services.ParticleEngine.CreateSmokeParticle(Pos, Color.Orange, 3f, 0.5f);
                    Artillery3R.Services.ParticleEngine.CreateSmokeParticle(Pos, Color.Yellow, 3f, 0.5f);
                }


                _smokeCount = 0;
            }

            foreach (Weapon w in _weaponList)
            {
                w.Update();
                w.UpdatePosition(Pos, Direction, AbsoluteAngle);
            }


            base.Update(); // Updates the sub-entities
        }

        public void SwitchState(CharacterState nextState)
        {
            // State machine transition code goes here

            switch (PeekState())
            {
                case CharacterState.Idle:
                    if (nextState == CharacterState.Firing)
                    {

                    }
                    //Play firing animation

                    break;

                default:
                    if (nextState == CharacterState.Dead)
                    {
                        Artillery3R.Services.ParticleEngine.CreateFastExplosion(Pos, 100);
                        //DO more die stuff

                    }
                    break;
            }
            _state.Switch(nextState);
            
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

        public Vector LastProjectilePosition
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
        public float MaxHealth { get => _maxHealth; set => _maxHealth = value; }
        public float MaxArmour { get => _maxArmour; set => _maxArmour = value; }
        public float Health { get => _health; set => _health = value; }
        public float Armour { get => _armour; set => _armour = value; }

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
