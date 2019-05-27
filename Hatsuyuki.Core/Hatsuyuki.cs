using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hatsuyuki.Core
{
    public interface IComputerPlayer
    {
        YuukiOutput Process();
    }
    public class Hatsuyuki: IComputerPlayer
    {
        YuukiData _yuukiData;
        public Hatsuyuki(YuukiData yuukiData)
        {
            _yuukiData = yuukiData;
        }
        public YuukiOutput Process()
        {
            return null;
        }



        public string Version => "Iteration 1: Built-in Logic";
        public string Greeting => "This is Hatsuyuki.Core!";
    }
}
