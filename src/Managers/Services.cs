using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface IServices
    {

    }
    public class Services : IServices
    {

        #region Fields
        private static Services _instance;
        private IEntityManager _entityManager;

        #endregion

        #region Constructor
        private Services()
        {
            _instance = this;
            _entityManager = new EntityManager();
        }
        public static Services Instance
        {
            get
            {
                if (_instance == null)
                    _instance = new Services();
                return _instance;
            }
        }

        public IEntityManager EntityManager { get => _entityManager; set => _entityManager = value; }
        #endregion

        #region Methods
        #endregion

        #region Properties
        #endregion
    }
}
