import React, { useState } from 'react';

const Menu = ({ onStartSinglePlayer, onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showJoinRoom, setShowJoinRoom] = useState(false);

  const handleSinglePlayer = () => {
    if (playerName.trim()) {
      onStartSinglePlayer(playerName);
    }
  };

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(roomCode.toUpperCase(), playerName);
    }
  };

  return (
    <div className="menu">
      <h1>ONO 99</h1>
      <h2>2022 Edition</h2>
      
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
            Single Player (vs 3 Bots)
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
    </div>
  );
};

export default Menu;
