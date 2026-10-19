import React from 'react';
import UnoFlipCard from './UnoFlipCard';

const WILD_SYMBOLS = ['WILD', 'WILD_DRAW_TWO', 'WILD_DRAW_COLOR'];
const LIGHT_COLORS = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
const DARK_COLORS = ['TEAL', 'ORANGE', 'PINK', 'PURPLE'];

const UnoFlipGameBoard = ({
  gameState,
  onPlayCard,
  onDrawCard,
  onPass,
  onCallUno,
  onChooseColor,
  selectedCard,
  onSelectCard,
  botAction,
  roundEndInfo
}) => {
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return <div className="message">Loading game...</div>;
  }

  const {
    activeSide, activeColor, activeSymbol, currentPlayerIndex, direction,
    discardTop, stockpileCount, targetScore, players, yourHand, yourId,
    hasDrawnThisTurn, drawnCardIndex, canPlayDrawnCard, awaitingColorPlayerIndex
  } = gameState;

  const yourIndex = players.findIndex(p => p.id === yourId);
  const currentPlayer = players[currentPlayerIndex];
  const isYourTurn = currentPlayer && currentPlayer.id === yourId;
  const isYourColorChoice = isYourTurn && awaitingColorPlayerIndex === yourIndex;
  const pendingColor = awaitingColorPlayerIndex !== -1;

  const faceOf = (card) => (activeSide === 'DARK' ? card.dark : card.light);

  const isWild = (symbol) => WILD_SYMBOLS.includes(symbol);

  const matches = (card) => {
    const f = faceOf(card);
    if (isWild(f.symbol)) {
      if (f.symbol === 'WILD') return true;
      if (!activeColor) return true;
      return !yourHand.some(c => c !== card && faceOf(c).color === activeColor);
    }
    return f.color === activeColor || f.symbol === activeSymbol;
  };

  const isPlayableIndex = (index) => {
    if (!isYourTurn || pendingColor) return false;
    if (hasDrawnThisTurn) {
      return index === drawnCardIndex && canPlayDrawnCard;
    }
    return matches(yourHand[index]);
  };

  const canDraw = isYourTurn && !pendingColor && !hasDrawnThisTurn;
  const canPass = isYourTurn && !pendingColor && hasDrawnThisTurn;
  const yourUnoCalled = yourIndex >= 0 ? players[yourIndex].unoCalled : false;
  const canCallUno = isYourTurn && !pendingColor && yourHand.length === 2 && !yourUnoCalled;

  const validColors = activeSide === 'DARK' ? DARK_COLORS : LIGHT_COLORS;

  const colorLabel = activeColor
    ? activeColor.charAt(0) + activeColor.slice(1).toLowerCase()
    : 'Pending';

  return (
    <div className="unoflip-container">
      <div className="unoflip-header">
        <div className="unoflip-side-indicator">
          <span className={`side-badge ${activeSide === 'DARK' ? 'dark' : 'light'}`}>
            {activeSide} SIDE
          </span>
        </div>
        <div className="player-info">
          {players.map((player, idx) => (
            <div key={player.id} className={`player-badge ${player.isCurrentPlayer ? 'current' : ''}`}>
              <span>{player.name}</span>
              <span className="score">{player.totalScore} pts</span>
              <span>({player.cardCount} cards)</span>
              {player.unoCalled && <span className="uno-tag">UNO!</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="game-center">
        <div className="unoflip-meta">
          <div className="meta-item">
            <span className="meta-label">Active Color</span>
            <span className={`color-chip ${activeColor ? activeColor.toLowerCase() : 'none'}`}>
              {colorLabel}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Direction</span>
            <span>{direction === 'clockwise' ? '↻ Clockwise' : '↺ Counter-clockwise'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Target</span>
            <span>{targetScore} pts</span>
          </div>
        </div>

        <div className="unoflip-piles">
          <div
            className={`draw-pile ${canDraw ? 'clickable' : ''}`}
            onClick={canDraw ? onDrawCard : undefined}
            title={canDraw ? 'Draw a card' : ''}
          >
            <div className="draw-pile-label">DRAW</div>
            <div className="draw-pile-count">{stockpileCount}</div>
          </div>

          <div className="discard-pile">
            {discardTop ? (
              <UnoFlipCard card={discardTop} side={activeSide} small />
            ) : (
              <div className="empty-slot" />
            )}
          </div>
        </div>

        {isYourColorChoice && (
          <div className="color-picker">
            <h3>Choose a color</h3>
            <div className="color-options">
              {validColors.map(color => (
                <button
                  key={color}
                  className={`color-button ${color.toLowerCase()}`}
                  onClick={() => onChooseColor(color)}
                >
                  {color.charAt(0) + color.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {!pendingColor && isYourTurn && (
          <div className="message success">Your turn! Play, draw, or call UNO.</div>
        )}
        {!pendingColor && !isYourTurn && (
          <div className="message">Waiting for {currentPlayer?.name}...</div>
        )}
        {pendingColor && !isYourColorChoice && (
          <div className="message">Waiting for a color choice...</div>
        )}

        {roundEndInfo && (
          <div className="message success">
            Round over! {roundEndInfo.winnerName} wins the round (+{roundEndInfo.points} pts)
          </div>
        )}

        {botAction && botAction.type === 'thinking' && (
          <div className="message" style={{ background: 'rgba(255, 165, 0, 0.3)' }}>
            {botAction.botName} is thinking...
          </div>
        )}
        {botAction && botAction.type === 'action' && botAction.card && (
          <div className="message success bot-action">
            <span>{botAction.botName} {botAction.action}:</span>
            <UnoFlipCard card={botAction.card} side={activeSide} small />
          </div>
        )}
        {botAction && botAction.type === 'action' && !botAction.card && (
          <div className="message success">
            {botAction.botName} {botAction.action}
          </div>
        )}
      </div>

      <div className="player-hand">
        <h3>Your Hand</h3>
        <div className="cards-container">
          {yourHand.map((card, index) => (
            <UnoFlipCard
              key={index}
              card={card}
              side={activeSide}
              onClick={() => onSelectCard(index)}
              disabled={!isPlayableIndex(index)}
              selected={selectedCard === index}
            />
          ))}
        </div>

        <div className="action-buttons">
          <button
            className="btn-play"
            onClick={onPlayCard}
            disabled={selectedCard === null || !isYourTurn || pendingColor}
          >
            Play Card
          </button>
          <button
            className="btn-draw"
            onClick={onDrawCard}
            disabled={!canDraw}
          >
            Draw Card
          </button>
          <button
            className="btn-pass"
            onClick={onPass}
            disabled={!canPass}
          >
            Pass Turn
          </button>
          {canCallUno && (
            <button className="btn-uno" onClick={onCallUno}>
              UNO!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnoFlipGameBoard;
