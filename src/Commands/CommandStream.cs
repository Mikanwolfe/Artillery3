﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Artillery
{
    public interface ICommandStream: ICommand
    {
        void AddCommand(ICommand c);
        void FlushCommands();
        bool Finished { get; }

    }
    public class CommandStream : ICommandStream
    {
        private Stack<ICommand> _commands;
        public bool Finished => (_commands.Count == 0);

        public CommandStream()
        {
            _commands = new Stack<ICommand>();
        }

        public void Execute(ICharacter c)
        {
            if (_commands.Count != 0)
            {
                ICommand _currentCommand = _commands.Pop();
                _currentCommand.Execute(c);
            }
        }

        public void AddCommand(ICommand c)
        {
            _commands.Push(c);
        }
       
        public void FlushCommands()
        {
            _commands.Clear();
        }
    }
}
