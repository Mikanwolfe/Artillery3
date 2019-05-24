using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{

    public interface ICommandProcessor
    {
        void Update(A3Data a3Data);
    }
    public class CommandProcessor : ICommandProcessor
    {
        public void Update(A3Data a3Data)
        {
            while (!a3Data.CommandStream.Finished)
            {
                a3Data.CommandStream.Execute(a3Data.SelectedPlayer.Character);
            }
        }
    }
}
