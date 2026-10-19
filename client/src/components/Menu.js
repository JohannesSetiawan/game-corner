import React, { useState } from 'react';

const Menu = ({ onStartSinglePlayer, onCreateRoom, onJoinRoom }) => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showJoinRoom, setShowJoinRoom] = useState(false);

  const gameTitle = selectedGame === 'unoFlip' ? 'UNO Flip!' : 'ONO 99';
  const gameSubtitle = selectedGame === 'unoFlip' ? 'Flip Edition' : '2022 Edition';

  const handleSinglePlayer = () => {
    if (playerName.trim()) {
      onStartSinglePlayer(selectedGame, playerName.trim());
    }
  };

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      onCreateRoom(selectedGame, playerName.trim());
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(selectedGame, roomCode.toUpperCase(), playerName.trim());
    }
  };

  if (!selectedGame) {
    return (
      <div className="menu">
        <h1>Card Games</h1>
        <h2>Choose a game to play</h2>
        <button className="primary game-select" onClick={() => setSelectedGame('ono99')}>
          ONO 99
          <span className="game-select-sub">Reach 99 without going over</span>
        </button>
        <button className="primary game-select unoflip-select" onClick={() => setSelectedGame('unoFlip')}>
          UNO Flip!
          <span className="game-select-sub">Match colors &amp; symbols, flip the deck</span>
        </button>
      </div>
    );
  }

  return (
    <div className="menu">
      <h1>{gameTitle}</h1>
      <h2>{gameSubtitle}</h2>

      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        maxLength={20}
      />

      {!showJoinRoom ? (
        <>
          <button className="primary" onClick={handleSinglePlayer} disabled={!playerName.trim()}>
            Single Player (vs Bots)
          </button>
          <button className="primary" onClick={handleCreateRoom} disabled={!playerName.trim()}>
            Create Multiplayer Room
          </button>
          <button className="secondary" onClick={() => setShowJoinRoom(true)}>
            Join Multiplayer Room
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter room code (4 chars)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <button className="primary" onClick={handleJoinRoom} disabled={!playerName.trim() || !roomCode.trim()}>
            Join Room
          </button>
          <button className="secondary" onClick={() => setShowJoinRoom(false)}>
            Back
          </button>
        </>
      )}

      <button className="secondary" onClick={() => { setSelectedGame(null); setShowJoinRoom(false); }}>
        Change Game
      </button>
    </div>
  );
};

export default Menu;
