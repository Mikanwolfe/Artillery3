using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace ArtillerySeries.src
{
    public class Logger
    {
        private static Logger _instance;
        private static StreamWriter _writer;

        private Logger()
        {
            _writer = new StreamWriter("hatsuyuki.log");
        }
        public static Logger Instance
        {
            get
            {
                if (_instance == null)
                    _instance = new Logger();
                return _instance;
            }
        }

        public void Log(string theText)
        {
            _writer.Write(theText);
        }
    }
}
