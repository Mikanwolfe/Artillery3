﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtillerySeries.src
{

    interface IUpdatable
    {
        void Update();
    }


    abstract class UpdatableObject : IUpdatable
    {
        public UpdatableObject()
        {
        }
        public abstract void Update();


    }
}
