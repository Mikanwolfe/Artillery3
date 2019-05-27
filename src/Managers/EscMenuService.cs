using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src.Managers
{
    public class EscMenuService : ServicesModule
    {
        //but servicecs can't modify the game state?
        //should services be more powerful then?
        public EscMenuService(A3RData a3RData) 
            : base(a3RData)
        {

        }

        public void Draw()
        {
            throw new NotImplementedException();
        }

        public void Update()
        {
            throw new NotImplementedException();
        }
    }
}
