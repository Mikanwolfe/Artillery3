using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using ArtillerySeries.src;

namespace Artillery3UnitTests
{
    enum TestStates
    {
        s1,
        s2,
        s3,
        s4
    }

    [TestFixture]
    public class TestStateComponent
    {
        [Test]
        public void TestStateComponentInitialisation()
        {
            StateComponent<TestStates> actual = new StateComponent<TestStates>(TestStates.s1);

            TestStates expected = TestStates.s1;

            Assert.AreEqual(expected, actual.Peek(),
                "Test that the initialising state is the one passed in the constructor");

        }

        [Test]
        public void TestStateComponentPush()
        {
            StateComponent<TestStates> actual = new StateComponent<TestStates>(TestStates.s1);
            actual.Push(TestStates.s2);

            TestStates expected = TestStates.s2;

            Assert.AreEqual(expected, actual.Peek(),
                "Test that the peeked state after a push is the topmost state");

        }

        [Test]
        public void TestStateComponentPop()
        {
            StateComponent<TestStates> actual = new StateComponent<TestStates>(TestStates.s1);
            actual.Push(TestStates.s2);
            actual.Pop();

            TestStates expected = TestStates.s1;

            Assert.AreEqual(expected, actual.Peek(),
                "Test that the peeked state is the same after a push and pop");

        }

        [Test]
        public void TestStateSwitch()
        {
            StateComponent<TestStates> actual = new StateComponent<TestStates>(TestStates.s1);
            actual.Switch(TestStates.s3);

            TestStates expected = TestStates.s3;

            Assert.AreEqual(expected, actual.Peek(),
                "Test that the state has changed once the stateis asked to switch");

        }

    }
}
