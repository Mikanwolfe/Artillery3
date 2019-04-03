using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.ArtilleryGame; // Constants

namespace ArtillerySeries.src
{
    // Players use a single Character per game and they are pre-defined in the system (e.g. Innocentia/Object 261)
    //  but they can also be added to and customized on the fly.
    //  I don't know if this will work well but hey, let's hope for the best!
    class Character : EntityAssembly, IPhysicsComponent
    {
        Vehicle _vehicle;
        //Point2D _pos;
        Bitmap _charBitmap;
        PhysicsComponent _physics;
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
        List<Weapon> _weapons;


        public Character(string name) 
            : base(name)
        {
            _physics = new PhysicsComponent(this);
            _vehicle = new Vehicle(name);
            _selected = false;
            _weapon = new Weapon("Base Weapon 1 -- Remove asap.", 0f, 50f);
            _weapon2 = new Weapon("Base Weapon 2 -- Remove asap.", 50f, 120f);
            _weapons = new List<Weapon>();

            Entities.Add(_vehicle);
            Entities.Add(_weapon);
            Entities.Add(_weapon2);
            EntityManager.Instance.AddEntity(this);

            
            _selectedWeapon = _weapon;

            
            UpdateWeaponList();

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
            _selectedWeapon.Charge();
        }

        public void FireWeapon()
        {
            _selectedWeapon.Fire();
        }

        void Move(float acc)
        {
            _physics.AccX = acc;
        }

        public bool Selected { get => _selected; set => _selected = value; }
        
        PhysicsComponent IPhysicsComponent.Physics { get => _physics; set => _physics = value; }

        void UpdateWeaponList()
        {
            _weapons = new List<Weapon>();
            foreach (Entity e in Entities)
            {
                if (e is Weapon)
                {
                    _weapons.Add(e as Weapon);
                }
            }
        }

        void SwitchWeapon()
        {
            if (_weapons.Count != 1)
            {
                _selectedWeapon = _weapons[(_weapons.IndexOf(_selectedWeapon) + 1)  % _weapons.Count];
            }
        }

        public void AddEntity(Entity entity)
        {
            Entities.Add(entity);
            UpdateWeaponList();
        }

        public void RemoveEntity(Entity entity)
        {
            Entities.Remove(entity);
            UpdateWeaponList();
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

            }



            float angle = (float)(_physics.AbsAngleToGround * 180 / Math.PI);
            SwinGame.DrawText("Absolute Angle: " + angle.ToString(), Color.Black, 50, 50);
            angle = (float)(_physics.RelAngleToGround * 180 / Math.PI);
            SwinGame.DrawText("Relative Angle: " + angle.ToString(), Color.Black, 50, 70);

            _selectedWeapon.DrawSight();

            base.Draw(); // Draws the sub-entities
        }




        public override void Update()
        {

            if (SwinGame.KeyTyped(KeyCode.SKey))
            {
                SwitchWeapon();
            }
            if (SwinGame.KeyDown(KeyCode.UpKey))
            {
                _selectedWeapon.ElevateWeapon();

            }
            if (SwinGame.KeyDown(KeyCode.DownKey))
            {
                _selectedWeapon.DepressWeapon();
            }


            Direction = _physics.Facing;
            Pos = _physics.Position;
            AbsoluteAngle = _physics.AbsAngleToGround;
            
            base.Update(); // Updates the sub-entities
        }
    }
}
