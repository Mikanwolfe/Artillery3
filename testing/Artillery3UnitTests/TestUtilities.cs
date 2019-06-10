using System;
using System.Collections.Generic;
using System.Text;
using ArtillerySeries.src;
using static ArtillerySeries.src.Utilities;
using NUnit.Framework;

namespace Artillery3UnitTests
{
    [TestFixture]
    public class TestUtilities
    {
        [Test]
        public void TestVectorConstructor()
        {
            string actual = new Vector().ToString();

            string expected = new Vector(0, 0).ToString();

            Assert.AreEqual(expected, actual,
                "Testing if a new vector has (0,0) for it's default");
        }

        [Test]
        public void TestVectorAdd()
        {
            Vector a = new Vector(1, 1);
            Vector b = new Vector(1, 1);

            Vector actual = a + b;

            Vector expected = new Vector(2, 2);

            Assert.AreEqual(expected.ToString(), actual.ToString(),
                "Tests if vectors add correctly");
        }

        [Test]
        public void TestVectorSubtract()
        {
            Vector a = new Vector(1, 1);
            Vector b = new Vector(1, 1);

            Vector actual = a - b;

            Vector expected = new Vector(0, 0);

            Assert.AreEqual(expected.ToString(), actual.ToString(),
                "Tests if vectors subtract correctly");
        }

        [Test]
        public void TestVectorNormalise()
        {
            Vector actual = new Vector(0, 5);
            actual.Normalise();

            Vector expected = new Vector(0, 1);

            Assert.AreEqual(expected.ToString(), actual.ToString(),
                "Tests if vectors normalise correctly (in the y-axis)");
        }

        [Test]
        public void TestClampMin()
        {
            int actual = 1;
            actual = Clamp(actual, 3, 10);
            int expected = 3;

            Assert.AreEqual(expected, actual,
                "Test that the clamping function can clamp the lower end");
        }

        [Test]
        public void TestClampMax()
        {
            int actual = 15;
            actual = Clamp(actual, 3, 10);
            int expected = 10;

            Assert.AreEqual(expected, actual,
                "Test that the clamping function can clamp the higher end");
        }

        [Test]
        public void TestClampNoEffectInRange()
        {
            int actual = 5;
            actual = Clamp(actual, 3, 10);
            int expected = 5;

            Assert.AreEqual(expected, actual,
                "Test that the clamping function has no effect on anything within range");
        }

    }
}
