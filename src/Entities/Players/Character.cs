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

        #region Fields

        Timer _switchWeaponTimer;

        Player _parent;

        Rectangle _targetBox;
        Rectangle _rearGlassBox;
        Rectangle _armourBox;
        Rectangle _healthBox;

        Rectangle _nameBox;
        Rectangle _nameBoxTarget;

        Color _glassColor;
        Color _glassColorTarget;

        Color _healthColor;
        Color _healthColorTarget;

        Color _armourColor;
        Color _armourColorTarget;

        Color _textColor;
        Color _textColorTarget;

        float _health, _armour;
        float _maxHealth = 100, _maxArmour = 100;

        int _weaponCapacity = 4;
        int _inventoryCapacity = 4;

        int _offsetText = 0;

        Bitmap _charBitmap; // use sprites
        PhysicsComponent _physics;
        StateComponent<CharacterState> _state;
        bool _selected;
        bool _isChargingWeapon, _wasChargingWeapon;

        Weapon _selectedWeapon;
        Weapon _weapon;
        Weapon _weapon2;
        private List<Weapon> _weaponList;
        private List<Weapon> _inventory;

        public delegate void NotifyFiring(Projectile projectile, Character parent);

        NotifyFiring notifyFiring;
        int _smokeCount;
        #endregion

        #region Constructor

        public Character(string name, int health, int armour, Player parent)
            : base(name)
        {
            _parent = parent;
            _weaponList = new List<Weapon>(_weaponCapacity);
            _inventory = new List<Weapon>(_inventoryCapacity);

            for (int i = 0; i < _weaponCapacity; i++)
            {
                _weaponList.Add(null);
            }

            for (int i = 0; i < _inventoryCapacity; i++)
            {
                _inventory.Add(null);
            }

            _physics = new PhysicsComponent(this);
            _selected = false;


            _targetBox = new Rectangle()
            {
                Width = 100,
                Height = 15,
                Y = -50
            };
            _targetBox.X = - _targetBox.Width / 2;


            _rearGlassBox = new Rectangle();
            _armourBox = new Rectangle();
            _healthBox = new Rectangle();

            _nameBox = new Rectangle();
            _nameBoxTarget = new Rectangle()
            {
                Width = 70,
                Height = 15,
                Y = -70
            };
            _nameBoxTarget.X = -_nameBoxTarget.Width / 2;

            _glassColor = SwinGame.RGBAColor(0, 0, 0, 0);
            _glassColorTarget = SwinGame.RGBAColor(250, 250, 255, 160);

            _healthColor = SwinGame.RGBAColor(0, 0, 0, 0);
            _healthColorTarget = SwinGame.RGBAColor(87, 128, 109, 200);

            _armourColor = SwinGame.RGBAColor(0, 0, 0, 0);
            _armourColorTarget = SwinGame.RGBAColor(124, 123, 127, 240);

            _textColor = SwinGame.RGBAColor(0, 0, 0, 0);
            _textColorTarget = SwinGame.RGBAColor(20, 20, 50, 140);



            _maxArmour = armour;
            _maxHealth = health;

            Artillery3R.Services.EntityManager.AddEntity(this);

            _state = new StateComponent<CharacterState>(CharacterState.Idle);


            _selectedWeapon = _weapon;
            _physics.WindFrictionMult = 0.01f;

            _switchWeaponTimer = new Timer(20);


            _smokeCount = 0;

        }
        #endregion

        #region Methods
        public override void Damage(float damage)
        {
            if (_armour > 0)
            {
                _armour -= damage;
                _armour = Clamp(_armour, 0, _maxArmour);
            }
            else
            {
                _health -= damage;
                _health = Clamp(_health, 0, _maxHealth);
            }
        }
        public void Initialise()
        {
            bool weaponFound = false;
            _armour = _maxArmour;
            _health = _maxHealth;
            foreach (Weapon w in _weaponList)
            {
                if (w != null)
                {
                    _selectedWeapon = w;
                    weaponFound = true; ;
                }
                if (weaponFound)
                    break;

            }

            foreach (Weapon w in _inventory)
            {
                if (weaponFound)
                    break;
                if (w != null)
                {
                    _selectedWeapon = w;
                    break;
                }
            }

        }

        public void AddWeapon(Weapon w)
        {
            bool _foundEmptySlot = false;

            for (int i = 0; i < WeaponList.Capacity; i++)
            {
                if (_weaponList[i] == null)
                {
                    _foundEmptySlot = true;
                    _weaponList[i] = w;
                    break;
                }
                if (_foundEmptySlot)
                    break;
            }
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
            }
            else if (PeekState() == CharacterState.Firing)
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

        public void NewTurn()
        {
            foreach (Weapon w in _weaponList)
            {
                w?.Reload();
            }

            _textColor = Color.LightPink;

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
                    int index = _weaponList.IndexOf(_selectedWeapon);
                    if (!_selectedWeapon.AutoloaderFired)
                    {
                        do
                        {
                            index++;
                            _selectedWeapon = _weaponList[(index) % _weaponList.Count];
                        } while (_selectedWeapon == null);
                    }
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


        void UpdateBoxes()
        {
            _offsetText = (_parent.Name + " | " + Name).ToString().Length * 4;

            _rearGlassBox.Width = _targetBox.Width;
            _rearGlassBox.Height = _targetBox.Height;
            _rearGlassBox.X = Pos.X - _targetBox.Width / 2;
            _rearGlassBox.Y = Pos.Y + _targetBox.Y;

            _nameBox.Width += (_nameBoxTarget.Width - _nameBox.Width) / 20;
            _nameBox.Height = _nameBoxTarget.Height;
            _nameBox.X = Pos.X - _nameBox.Width/2;
            _nameBox.Y = Pos.Y + _nameBoxTarget.Y;

            if (_selected)
            {
                _nameBoxTarget.Width = _offsetText * 2.4f;
                _textColorTarget = SwinGame.RGBAColor(42, 55, 115, 190);
            }
            else
            {
                _nameBoxTarget.Width = 0;
                _textColorTarget = SwinGame.RGBAColor(0, 0, 0, 0);
            }

            float _armourPercentage = _armour / _maxArmour;

            _armourBox.Width += ((_armourPercentage * (_targetBox.Width - 20)) - _armourBox.Width) / 20;
            _armourBox.Height = _targetBox.Height;
            _armourBox.X = Pos.X - _targetBox.Width / 2 + 10;
            _armourBox.Y = Pos.Y + _targetBox.Y;

            float _healthPercentage = _health / _maxHealth;

            _healthBox.Width += ((_healthPercentage * (_targetBox.Width - 20)) - _healthBox.Width) / 20;
            _healthBox.Height = _targetBox.Height - 8;
            _healthBox.X = Pos.X - _targetBox.Width / 2 + 10;
            _healthBox.Y = Pos.Y + _targetBox.Y + 4;

            _glassColor = FadeColorTo(_glassColor, _glassColorTarget);
            _armourColor = FadeColorTo(_armourColor, _armourColorTarget);
            _healthColor = FadeColorTo(_healthColor, _healthColorTarget);
            _textColor = FadeColorTo(_textColor, _textColorTarget);

            if (_healthPercentage < 1.1f)
                _healthColorTarget = SwinGame.RGBAColor(87, 128, 109, 200);
            if (_healthPercentage < 0.7f)
                _healthColorTarget = SwinGame.RGBAColor(198, 162, 106, 240);
            if (_healthPercentage < 0.4f)
                _healthColorTarget = SwinGame.RGBAColor(181, 12, 12, 240);
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




            }

            //This is next


            SwinGame.FillRectangle(_glassColor, _rearGlassBox);
            SwinGame.FillRectangle(_armourColor, _armourBox);
            SwinGame.FillRectangle(_healthColor, _healthBox);
            SwinGame.FillRectangle(SwinGame.RGBAColor(250, 250, 255, 160), _nameBox);

            if (_selected)
            {
                SwinGame.DrawText(((int)_health).ToString(), _healthColor, SwinGame.FontNamed("smallFont"), Pos.X + 55, Pos.Y - 50);
                SwinGame.DrawText(((int)_armour).ToString(), Color.White, SwinGame.FontNamed("smallFont"), Pos.X - 85, Pos.Y - 50);
            }

            

            SwinGame.DrawText(_parent.Name + " | " + Name, _textColor, SwinGame.FontNamed("smallFont"), Pos.X - _offsetText*0.9f, Pos.Y + _nameBoxTarget.Y);
            //DrawTextCentre("Health: " + (int)_health, Color.Black, Pos.X, Pos.Y - 50);
            //DrawTextCentre("Armour: " + (int)_armour, Color.Black, Pos.X, Pos.Y - 40);
            //DrawTextCentre(Name, Color.DarkGray, Pos.X, Pos.Y - 30);


            float angle = (float)(_physics.AbsAngleToGround * 180 / Math.PI);
            angle = (float)(_physics.RelAngleToGround * 180 / Math.PI);



            base.Draw(); // Draws the sub-entities
        }

        public override void Update()
        {
            UpdateBoxes();
            

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
                w?.Update();
                w?.UpdatePosition(Pos, Direction, AbsoluteAngle);
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
        #endregion

        #region Properties

        public bool Selected { get => _selected; set => _selected = value; }

        PhysicsComponent IPhysicsComponent.Physics { get => _physics; set => _physics = value; }


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
        public float MaxHealth { get => _maxHealth; set => _maxHealth = value; }
        public float MaxArmour { get => _maxArmour; set => _maxArmour = value; }
        public float Health { get => _health; set => _health = value; }
        public float Armour { get => _armour; set => _armour = value; }
        public int WeaponCapacity { get => _weaponCapacity; set => _weaponCapacity = value; }
        public List<Weapon> Inventory { get => _inventory; set => _inventory = value; }
        public List<Weapon> WeaponList { get => _weaponList; set => _weaponList = value; }


        #endregion



    }
}
