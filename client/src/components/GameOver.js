import React from 'react';

const GameOver = ({ winner, onBackToMenu }) => {
  return (
    <div className="game-over">
      <div className="game-over-content">
        {winner.isDraw ? (
          <>
            <h1>🤝 Game Draw! 🤝</h1>
            <h2>Deck ran out of cards!</h2>
          </>
        ) : (
          <>
            <h1>🎉 Game Over! 🎉</h1>
            <h2>{winner.name} Wins!</h2>
          </>
        )}
        <button onClick={onBackToMenu}>Back to Menu</button>
      </div>
    </div>
  );
};

export default GameOver;
