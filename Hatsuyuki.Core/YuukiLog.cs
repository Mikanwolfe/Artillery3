using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace Hatsuyuki.Core
{
    public class YuukiLog
    {
        private static YuukiLog _instance;
        private static StreamWriter _writer;

        private YuukiLog()
        {
            _writer = new StreamWriter("hatsuyuki.log");
        }
        public static YuukiLog Instance
        {
            get
            {
                if (_instance == null)
                    _instance = new YuukiLog();
                return _instance;
            }
        }

        public void Log(string theText)
        {
            _writer.Write(theText);
        }
    }
}
