import React from 'react';

const CardCounter = ({ title, counts, position }) => {
  const getCardLabel = (type, value) => {
    if (type === 'number') return value;
    if (type === 'zero') return '0';
    if (type === 'minus10') return '-10';
    if (type === 'reverse') return 'Reverse';
    if (type === 'play2') return 'Play 2';
    if (type === 'ono99') return 'ONO 99';
    return type;
  };

  return (
    <div className={`card-counter ${position}`}>
      <h4>{title}</h4>
      <div className="counter-list">
        {counts.number && Object.keys(counts.number).sort((a, b) => a - b).map(num => (
          <div key={`num-${num}`} className="counter-item">
            <span className="counter-label">{num}:</span>
            <span className="counter-value">{counts.number[num]}</span>
          </div>
        ))}
        {counts.zero > 0 && (
          <div className="counter-item">
            <span className="counter-label">0:</span>
            <span className="counter-value">{counts.zero}</span>
          </div>
        )}
        {counts.minus10 > 0 && (
          <div className="counter-item">
            <span className="counter-label">-10:</span>
            <span className="counter-value">{counts.minus10}</span>
          </div>
        )}
        {counts.reverse > 0 && (
          <div className="counter-item">
            <span className="counter-label">⟲:</span>
            <span className="counter-value">{counts.reverse}</span>
          </div>
        )}
        {counts.play2 > 0 && (
          <div className="counter-item">
            <span className="counter-label">×2:</span>
            <span className="counter-value">{counts.play2}</span>
          </div>
        )}
        {counts.ono99 > 0 && (
          <div className="counter-item">
            <span className="counter-label">ONO:</span>
            <span className="counter-value">{counts.ono99}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardCounter;
