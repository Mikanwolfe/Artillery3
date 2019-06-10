using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using ArtillerySeries.src;

namespace Artillery3.Tests
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            Artillery3R _artillery = new Artillery3R();

            string expected = "A3s Final Iteration";
            string actual = _artillery.Version;
            Assert.AreEqual(expected, actual,
                "Test if the unit testing module can connect to A3 and collect version.");
        }
    }
}
