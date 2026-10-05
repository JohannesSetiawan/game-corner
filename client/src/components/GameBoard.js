import React from 'react';
import Card from './Card';
import CardCounter from './CardCounter';

const GameBoard = ({ gameState, onPlayCard, onDrawCard, onDiscardFourOno99, selectedCard, onSelectCard, botAction }) => {
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return <div className="message">Loading game...</div>;
  }

  const { total, players, yourHand, currentPlayerIndex, discardPileTop, direction, yourId, canDiscardFourOno99, deckCardsRemaining, deckCardCounts, discardCardCounts } = gameState;
  
  const currentPlayer = players[currentPlayerIndex];
  const isYourTurn = currentPlayer && currentPlayer.id === yourId;

  const isCardPlayable = (card, index) => {
    if (!isYourTurn) return true;

    const newTotal = calculateNewTotal(card);
    if (newTotal >= 99 && card.type !== 'ono99') {
      const hasOtherValidCards = yourHand.some((c, idx) => {
        if (idx === index) return false;
        const testTotal = calculateNewTotal(c);
        return testTotal < 99 || c.type === 'ono99';
      });
      return !hasOtherValidCards;
    }
    return true;
  };

  const calculateNewTotal = (card) => {
    if (card.type === 'number') return total + card.value;
    if (card.type === 'minus10') return Math.max(0, total - 10);
    if (card.type === 'ono99') return 99;
    return total;
  };

  return (
    <div className="game-container">
      {discardCardCounts && (
        <CardCounter 
          title="Cards Played" 
          counts={discardCardCounts} 
          position="left"
        />
      )}
      
      {deckCardCounts && (
        <CardCounter 
          title={`Deck (${deckCardsRemaining})`}
          counts={deckCardCounts} 
          position="right"
        />
      )}

      <div className="game-header">
        <div className="player-info">
          {players.map((player, idx) => (
            <div key={player.id} className={`player-badge ${player.isCurrentPlayer ? 'current' : ''}`}>
              <span>{player.name}</span>
              <div className="lives">
                {Array.from({ length: player.lives }).map((_, i) => (
                  <div key={i} className="life" />
                ))}
              </div>
              <span>({player.cardCount} cards)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="game-center">
        <div className="total-display">{total}</div>
        {discardPileTop && (
          <div className="discard-pile">
            <Card card={discardPileTop} disabled isDiscard />
          </div>
        )}
        <div className="direction-indicator">
          {direction === 'clockwise' ? '↻ Clockwise' : '↺ Counter-clockwise'}
        </div>
        {botAction && botAction.type === 'thinking' && (
          <div className="message" style={{ background: 'rgba(255, 165, 0, 0.3)' }}>
            {botAction.botName} is thinking...
          </div>
        )}
        {botAction && botAction.type === 'action' && botAction.card && (
          <div className="message success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <span>{botAction.botName} played:</span>
            <Card card={botAction.card} disabled isDiscard />
          </div>
        )}
        {botAction && botAction.type === 'action' && !botAction.card && (
          <div className="message success">
            {botAction.botName} {botAction.action}
          </div>
        )}
        {!botAction && isYourTurn && (
          <div className="message success">Your turn! Select and play a card</div>
        )}
        {!botAction && !isYourTurn && (
          <div className="message">Waiting for {currentPlayer?.name}...</div>
        )}
      </div>

      <div className="player-hand">
        <h3>Your Hand</h3>
        <div className="cards-container">
          {yourHand.map((card, index) => (
            <Card
              key={index}
              card={card}
              onClick={() => onSelectCard(index)}
              disabled={!isCardPlayable(card, index)}
              selected={selectedCard === index}
            />
          ))}
        </div>

        {isYourTurn && selectedCard === null && (
          <p style={{ textAlign: 'center', marginTop: '10px', opacity: 0.8 }}>
            Click a card to select it, then click "Play Card"
          </p>
        )}

        <div className="action-buttons">
          <button
            className="btn-play"
            onClick={onPlayCard}
            disabled={selectedCard === null || !isYourTurn}
            title={selectedCard === null ? 'Select a card first' : (!isYourTurn ? 'Not your turn' : 'Play the selected card')}
          >
            Play Card (Auto-Draw)
          </button>
          {canDiscardFourOno99 && (
            <button
              className="btn-discard-ono"
              onClick={onDiscardFourOno99}
            >
              Discard 4 ONO 99
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
