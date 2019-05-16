using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using SwinGameSDK;
using Newtonsoft.Json;
using static Artillery.Utilities;
using Newtonsoft.Json.Linq;

namespace Artillery
{
    public class Artillery
    {
        Rectangle _windowRect;


        

        public void Run()
        {

            




        }

        /* ----------------------------------- Constants ----------------------------------- */

        static string SettingsFile = "settings.json";
        private static Constants _constants;
        public static Constants Constants
        {
            get
            {
                if (_constants == null)
                {
                    string jsonString = new StreamReader(SettingsFile).ReadToEnd();
                    _constants = JsonConvert.DeserializeObject<Constants>(jsonString);
                }
                return _constants;
            }
        }

    }
    public class Constants
    {
        public string InitString;
        public int WindowWidth;
        public int WindowHeight;
    }

}
