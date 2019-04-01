﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    class SightComponent : Entity
    {
        public SightComponent(string name) 
            : base(name)
        {

        }

        public override string ShortDesc { get => base.ShortDesc; set => base.ShortDesc = value; }
        public override string LongDesc { get => base.LongDesc; set => base.LongDesc = value; }

        public override void Draw()
        {
            // Draw angles!
        }

        public override void Update()
        {
            throw new NotImplementedException();
        }
    }
}
