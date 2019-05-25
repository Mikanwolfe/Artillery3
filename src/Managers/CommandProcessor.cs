using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    public interface ICommandProcessor
    {
        void Update(A3RData a3RData);
    }
    public class CommandProcessor : ICommandProcessor
    {
        public void Update(A3RData a3RData)
        {
            while (!a3RData.CommandStream.Finished)
            {
                a3RData.CommandStream.Execute(a3RData);
            }
        }
    }
}
