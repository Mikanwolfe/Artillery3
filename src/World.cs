using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SwinGameSDK;

namespace ArtillerySeries.src
{

    class World
    {

        /*
         * Does the world need a player manager? I don't think so.
         * All the functions should be built here i reckon.
         * 
         * 
         * 
         */
        Rectangle _windowRect;
        Terrain _terrain;
        Command _playerCommand;
        InputHandler _inputHandler;

        List<Player> _players;
        Player _selectedPlayer;

        public World(Rectangle windowRect, InputHandler inputHandler)
        {
            _windowRect = windowRect;
            _terrain = new Terrain(_windowRect);
            _inputHandler = inputHandler;
            _players = new List<Player>();
            _selectedPlayer = null;

        }

        public void AddPlayer(Player p)
        {
            _players.Add(p);
        }

        public void NewSession()
        {
            TerrainGenerator _terrainFactory = new TerrainGeneratorMidpoint(_windowRect);
            _terrain = _terrainFactory.Generate();
            PhysicsEngine.Instance.Terrain = _terrain;

            //Character Innocentia = new Character("Innocentia");
        }

        public void CyclePlayers() //When do you cycle players? When is one round over?? Multiple weapons?
        {
            if (_players.Count == 1)
            {
                _selectedPlayer = _players[0];
            }
            else
            {
                int nextPlayer = _players.IndexOf(_selectedPlayer) + 1;
                nextPlayer = PhysicsEngine.Instance.Clamp(nextPlayer, 0, _players.Count - 1);
                _selectedPlayer = _players[nextPlayer];
            }
        }

        public void HandleInput()
        {
            _playerCommand = _inputHandler.HandleInput();
            if (_playerCommand != null)
                _playerCommand.Execute(_selectedPlayer.Character);

        }


        public void Update()
        {

        }

        public void Draw()
        {
            _terrain.Draw();
        }


    }
}
