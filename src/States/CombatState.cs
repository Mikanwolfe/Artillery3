using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public class CombatState : GameState
    {
        #region Fields


        #endregion

        #region Constructor
        public CombatState(A3Data a3Data) 
            : base(a3Data)
        {
        }
        #endregion

        #region Methods
        public override void Draw()
        {
            _a3Data.LogicalTerrain.Draw();
            Console.WriteLine("Drawing terrain...");
        }

        public override void Exit()
        {

        }

        public override void Initialise()
        {
            Console.WriteLine("Look, we're in the combat state. You happy?");

            _a3Data.GenerateTerrain();

        }

        public override void Update()
        {

        }
        #endregion

        #region Properties

        #endregion

    }
}
