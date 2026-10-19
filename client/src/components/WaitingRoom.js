import React from 'react';

const WaitingRoom = ({ roomCode, players, isHost, canStart, onStartGame, minPlayers = 3, maxPlayers = 6 }) => {
  return (
    <div className="waiting-room">
      <h2>Multiplayer Room</h2>
      <div className="room-code">{roomCode}</div>
      <p>Share this code with your friends!</p>

      <div className="player-list">
        <h3>Players ({players.length}/{maxPlayers})</h3>
        {players.map((player, idx) => (
          <div key={idx} className="player-list-item">
            {player.name} {idx === 0 && '(Host)'}
          </div>
        ))}
      </div>

      <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
        {canStart ? 'Ready to start!' : `Waiting for at least ${minPlayers} players...`}
      </p>

      {isHost && (
        <button
          className="primary"
          onClick={onStartGame}
          disabled={!canStart}
          style={{ marginTop: '20px' }}
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default WaitingRoom;
