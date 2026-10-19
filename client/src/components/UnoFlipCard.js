import React from 'react';

const getFaceDisplay = (face) => {
  switch (face.symbol) {
    case 'DRAW_ONE':
      return { value: '+1', label: 'Draw 1' };
    case 'DRAW_FIVE':
      return { value: '+5', label: 'Draw 5' };
    case 'SKIP':
      return { value: '⊘', label: 'Skip' };
    case 'SKIP_EVERYONE':
      return { value: '⊘⊘', label: 'Skip All' };
    case 'REVERSE':
      return { value: '⇄', label: 'Reverse' };
    case 'FLIP':
      return { value: '⇅', label: 'Flip' };
    case 'WILD':
      return { value: '★', label: 'Wild' };
    case 'WILD_DRAW_TWO':
      return { value: '+2', label: 'Wild Draw 2' };
    case 'WILD_DRAW_COLOR':
      return { value: '★', label: 'Wild Draw Color' };
    default:
      return { value: face.symbol, label: '' };
  }
};

const UnoFlipCard = ({ card, side, onClick, disabled, selected, small }) => {
  const face = side === 'DARK' ? card.dark : card.light;
  const display = getFaceDisplay(face);
  const colorClass = face.color === 'NONE' ? 'wild' : face.color.toLowerCase();
  const sideClass = side === 'DARK' ? 'dark-side' : 'light-side';

  return (
    <div
      className={`unoflip-card ${colorClass} ${sideClass} ${small ? 'small' : ''} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="unoflip-corner top-left">{display.value}</div>
      <div className="unoflip-value">{display.value}</div>
      {display.label && <div className="unoflip-label">{display.label}</div>}
      <div className="unoflip-corner bottom-right">{display.value}</div>
    </div>
  );
};

export default UnoFlipCard;
