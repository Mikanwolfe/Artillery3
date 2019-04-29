using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{
    /*
     * A singleton for the purpose of keeping track of and being the topmost node
     *  in the entity composite tree.
    */
    public class EntityManager
    {
        private static EntityManager instance;
        private static List<Entity> _entities;
        private static List<Entity> _entitiesToRemove;
        private EntityManager()
        {
            instance = this;
            _entities = new List<Entity>();
            _entitiesToRemove = new List<Entity>();
        }

        public static EntityManager Instance
        {
            get
            {
                if (instance == null)
                    instance = new EntityManager();
                return instance;
            }
        }

        public List<Entity> Entities { get => _entities; }

        public void AddEntity(Entity e)
        {
            Entities.Add(e);
        }

        public void RemoveEntity(Entity e)
        {
            _entitiesToRemove.Add(e);
        }
        public int Count
        {
            get => Entities.Count();
        }

        public void Draw()
        {
            foreach(Entity e in Entities)
            {
                e.Draw();
            }
        }

        float DamageFromDistance(float damage, float damageDistance, float maxDistance)
        {
            return damage * (1 - damageDistance / maxDistance);
        }

        float DamageFromDistance(float damage, Point2D pt1, Point2D pt2, float maxDistance)
        {
            float dX = Math.Abs(pt1.X - pt2.X);
            float dY = Math.Abs(pt1.Y - pt2.Y);
            float distance = (float)Math.Sqrt(Math.Pow(dX, 2) + Math.Pow(dY, 2));

            return DamageFromDistance(damage, distance, maxDistance);
        }

        public void DamageEntities(Entity parent, float damage, int radius, Point2D pt)
        {
            foreach(Entity e in _entities)
            {
               
                if (SwinGame.PointInCircle(e.Pos, pt.X, pt.Y, radius))
                {
                    if (e != parent)
                    {
                        float dealtDamage = DamageFromDistance(damage, pt, e.Pos, radius);
                        if (dealtDamage > 1)
                        {
                            int roundedDamage = (int)dealtDamage;
                            ParticleEngine.Instance.CreateDamageText(e.Pos, Color.White, 6f, roundedDamage.ToString(), 0);
                        }
                        e.Damage(dealtDamage);
                    }
                }
            }
        }

        public void Clear()
        {
            _entities.Clear();
        }

        public void Update()
        {
            foreach(Entity e in Entities)
            {
                e.Update();
            }

            foreach (Entity e in _entitiesToRemove)
            {
                Entities.Remove(e);
                
            }
            _entitiesToRemove.Clear();

        }
    }
}
