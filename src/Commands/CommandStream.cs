using System;
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

    }
    public class CommandStream : ICommandStream
    {
        private Stack<ICommand> _commands;

        public CommandStream()
        {
            _commands = new Stack<ICommand>();
        }

        public void Execute(ICharacter c)
        {
            if (_commands.Peek() != null)
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
