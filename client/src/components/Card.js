import React from 'react';

const Card = ({ card, onClick, disabled, isDiscard, selected }) => {
  const getCardDisplay = () => {
    switch (card.type) {
      case 'number':
        return { value: card.value, label: '' };
      case 'zero':
        return { value: '0', label: '' };
      case 'minus10':
        return { value: '-10', label: '' };
      case 'reverse':
        return { value: '⟲', label: 'REVERSE' };
      case 'play2':
        return { value: '×2', label: 'PLAY 2' };
      case 'ono99':
        return { value: 'ONO', label: '99' };
      default:
        return { value: '?', label: '' };
    }
  };

  const display = getCardDisplay();
  const cornerText = card.type === 'ono99' ? '99' : display.value;

  return (
    <div
      className={`card ${card.color} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={selected ? { transform: 'translateY(-15px)', boxShadow: '0 8px 20px rgba(255, 215, 0, 0.6)' } : {}}
    >
      <div className="card-corner top-left">{cornerText}</div>
      <div className="card-value">{display.value}</div>
      {display.label && <div className="card-label">{display.label}</div>}
      <div className="card-corner bottom-right">{cornerText}</div>
    </div>
  );
};

export default Card;
