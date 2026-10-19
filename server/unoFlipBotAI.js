const WILD_SYMBOLS = ['WILD', 'WILD_DRAW_TWO', 'WILD_DRAW_COLOR'];
const LIGHT_COLORS = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
const DARK_COLORS = ['TEAL', 'ORANGE', 'PINK', 'PURPLE'];

class UnoFlipBotAI {
  constructor(gameState, playerId) {
    this.gameState = gameState;
    this.playerId = playerId;
    this.hand = gameState.yourHand || [];
    this.activeSide = gameState.activeSide;
    this.activeColor = gameState.activeColor;
    this.activeSymbol = gameState.activeSymbol;
  }

  getFace(card) {
    return this.activeSide === 'LIGHT' ? card.light : card.dark;
  }

  isWild(symbol) {
    return WILD_SYMBOLS.includes(symbol);
  }

  isPlayable(card) {
    const face = this.getFace(card);
    if (this.isWild(face.symbol)) {
      if (face.symbol === 'WILD') return true;
      if (this.activeColor == null) return true;
      return !this.hand.some(c => c !== card && this.getFace(c).color === this.activeColor);
    }
    return face.color === this.activeColor || face.symbol === this.activeSymbol;
  }

  chooseCard() {
    const playable = this.hand
      .map((card, i) => ({ card, i, face: this.getFace(card) }))
      .filter(x => this.isPlayable(x.card));

    if (playable.length === 0) {
      return { action: 'draw' };
    }

    const nonWild = playable.find(x => !this.isWild(x.face.symbol));
    if (this.hand.length === 1) {
      return { action: 'playCard', cardIndex: (nonWild || playable[0]).i };
    }

    const rank = (face) => {
      if (this.isWild(face.symbol)) return 5;
      const isNumber = /^[1-9]$/.test(face.symbol);
      const colorMatch = face.color === this.activeColor;
      const symbolMatch = face.symbol === this.activeSymbol;
      if (isNumber && colorMatch) return 0;
      if (isNumber && symbolMatch) return 1;
      if (!isNumber && colorMatch) return 2;
      if (!isNumber && symbolMatch) return 3;
      return 4;
    };

    playable.sort((a, b) => {
      const diff = rank(a.face) - rank(b.face);
      if (diff !== 0) return diff;
      const av = this.cardValue(a.face);
      const bv = this.cardValue(b.face);
      return av - bv;
    });

    return { action: 'playCard', cardIndex: playable[0].i };
  }

  chooseColor() {
    const colors = this.activeSide === 'LIGHT' ? LIGHT_COLORS : DARK_COLORS;
    const counts = {};
    this.hand.forEach(card => {
      const face = this.getFace(card);
      if (!this.isWild(face.symbol) && face.color && face.color !== 'NONE') {
        counts[face.color] = (counts[face.color] || 0) + 1;
      }
    });
    let best = colors[0];
    let bestCount = -1;
    colors.forEach(c => {
      if ((counts[c] || 0) > bestCount) {
        bestCount = counts[c] || 0;
        best = c;
      }
    });
    return best;
  }

  cardValue(face) {
    const values = {
      DRAW_ONE: 10, DRAW_FIVE: 20, REVERSE: 20, SKIP: 20, FLIP: 20,
      SKIP_EVERYONE: 30, WILD: 40, WILD_DRAW_TWO: 50, WILD_DRAW_COLOR: 60
    };
    if (values[face.symbol] != null) return values[face.symbol];
    const n = parseInt(face.symbol, 10);
    return Number.isNaN(n) ? 0 : n;
  }
}

module.exports = UnoFlipBotAI;
