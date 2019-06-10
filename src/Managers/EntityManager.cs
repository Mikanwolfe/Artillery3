using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;
using static ArtillerySeries.src.Utilities;

namespace ArtillerySeries.src
{
    /*
     * A singleton for the purpose of keeping track of and being the topmost node
     *  in the entity composite tree.
    */
    public class EntityManager
    {

        A3RData _a3RData;

        private static List<Entity> _entities;
        private static List<Entity> _entitiesToRemove;
        private static List<Entity> _entitiesToAdd;

        public EntityManager(A3RData a3RData)
        {
            _a3RData = a3RData;

            _entities = new List<Entity>();
            _entitiesToRemove = new List<Entity>();
            _entitiesToAdd = new List<Entity>();
        }

        public List<Entity> Entities { get => _entities; }

        public void AddEntity(Entity e)
        {
            _entitiesToAdd.Add(e);
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
            Artillery3R.Services.Achievements.Damage += (int)damage;
            foreach(Entity e in _entities)
            {
               
                if (SwinGame.PointInCircle(e.Pos, pt.X, pt.Y, radius))
                {
                    if (e != parent && e.Damageable)
                    {
                        float dealtDamage = DamageFromDistance(damage, pt, e.Pos, radius);
                        if (dealtDamage > 3)
                        {
                            int roundedDamage = (int)dealtDamage;
                            Artillery3R.Services.ParticleEngine.CreateDamageText(AddPoint2D(e.Pos, RandomPoint2D(10)), Color.White, 6f, roundedDamage.ToString(), 0);
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

            foreach (Entity e in _entitiesToAdd)
            {
                Entities.Add(e);

            }
            _entitiesToAdd.Clear();

        }
    }
}
