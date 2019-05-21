using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{

    public enum ChararacterState
    {
        NotSelected,
        Idle,
        Walking,
        Firing,
        Dead,
        EndTurn
    }
    public class Character : Entity
    {

        #region Fields
        #endregion

        #region Constructor
        public Character(string name) : base(name)
        {
        }
        #endregion

        #region Methods
        public override void Draw()
        {
            base.Draw();
        }


        public override void Update()
        {
            base.Update();
        }
        #endregion

        #region Properties
        #endregion

    }
}
