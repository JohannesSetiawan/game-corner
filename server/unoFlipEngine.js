const SIDE_LIGHT = 'LIGHT';
const SIDE_DARK = 'DARK';

const LIGHT_COLORS = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
const DARK_COLORS = ['TEAL', 'ORANGE', 'PINK', 'PURPLE'];

const WILD = 'WILD';
const WILD_DRAW_TWO = 'WILD_DRAW_TWO';
const WILD_DRAW_COLOR = 'WILD_DRAW_COLOR';
const DRAW_ONE = 'DRAW_ONE';
const DRAW_FIVE = 'DRAW_FIVE';
const SKIP = 'SKIP';
const SKIP_EVERYONE = 'SKIP_EVERYONE';
const REVERSE = 'REVERSE';
const FLIP = 'FLIP';

const WILD_SYMBOLS = [WILD, WILD_DRAW_TWO, WILD_DRAW_COLOR];

const CARD_VALUES = {
  DRAW_ONE: 10,
  DRAW_FIVE: 20,
  REVERSE: 20,
  SKIP: 20,
  FLIP: 20,
  SKIP_EVERYONE: 30,
  WILD: 40,
  WILD_DRAW_TWO: 50,
  WILD_DRAW_COLOR: 60
};

class UnoFlipEngine {
  constructor(players) {
    this.players = players.map(p => ({
      id: p.id,
      name: p.name,
      isBot: !!p.isBot,
      hand: [],
      totalScore: 0,
      unoCalled: false,
      hasDrawnThisTurn: false,
      drawnCardIndex: -1
    }));
    this.targetScore = 500;
    this.activeSide = SIDE_LIGHT;
    this.direction = 1;
    this.currentPlayerIndex = 0;
    this.activeColor = null;
    this.activeSymbol = null;
    this.stockpile = [];
    this.discardPile = [];
    this.pendingWild = null;
    this.startNewRound();
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  numberFaces(color) {
    const faces = [];
    faces.push({ color, symbol: '1' });
    for (let n = 2; n <= 9; n++) {
      faces.push({ color, symbol: String(n) });
      faces.push({ color, symbol: String(n) });
    }
    return faces;
  }

  buildLightFaces() {
    const faces = [];
    for (const color of LIGHT_COLORS) {
      faces.push(...this.numberFaces(color));
      for (const symbol of [DRAW_ONE, SKIP, REVERSE, FLIP]) {
        faces.push({ color, symbol });
        faces.push({ color, symbol });
      }
    }
    for (let i = 0; i < 4; i++) faces.push({ color: 'NONE', symbol: WILD });
    for (let i = 0; i < 4; i++) faces.push({ color: 'NONE', symbol: WILD_DRAW_TWO });
    return faces;
  }

  buildDarkFaces() {
    const faces = [];
    for (const color of DARK_COLORS) {
      faces.push(...this.numberFaces(color));
      for (const symbol of [DRAW_FIVE, SKIP_EVERYONE, REVERSE, FLIP]) {
        faces.push({ color, symbol });
        faces.push({ color, symbol });
      }
    }
    for (let i = 0; i < 4; i++) faces.push({ color: 'NONE', symbol: WILD });
    for (let i = 0; i < 4; i++) faces.push({ color: 'NONE', symbol: WILD_DRAW_COLOR });
    return faces;
  }

  buildDeck() {
    const light = this.shuffle(this.buildLightFaces());
    const dark = this.shuffle(this.buildDarkFaces());
    return light.map((l, i) => ({ light: l, dark: dark[i] }));
  }

  getActiveFace(card) {
    return this.activeSide === SIDE_LIGHT ? card.light : card.dark;
  }

  isWild(symbol) {
    return WILD_SYMBOLS.includes(symbol);
  }

  getRelativeIndex(from, steps) {
    const n = this.players.length;
    let idx = (from + steps * this.direction) % n;
    if (idx < 0) idx += n;
    return idx;
  }

  reshuffleDiscard() {
    if (this.discardPile.length <= 1) return;
    const top = this.discardPile.pop();
    this.stockpile = this.shuffle(this.discardPile);
    this.discardPile = [top];
  }

  drawFromStockpile() {
    if (this.stockpile.length === 0) {
      this.reshuffleDiscard();
    }
    if (this.stockpile.length === 0) return null;
    return this.stockpile.pop();
  }

  drawCardsForPlayer(player, count) {
    for (let i = 0; i < count; i++) {
      const card = this.drawFromStockpile();
      if (card) player.hand.push(card);
    }
  }

  drawUntilColor(player, color) {
    let guard = 0;
    while (guard < 1000) {
      guard++;
      const card = this.drawFromStockpile();
      if (!card) break;
      player.hand.push(card);
      if (this.getActiveFace(card).color === color) break;
    }
  }

  startNewRound() {
    this.activeSide = SIDE_LIGHT;
    this.direction = 1;
    this.currentPlayerIndex = 0;
    this.activeColor = null;
    this.activeSymbol = null;
    this.pendingWild = null;
    this.discardPile = [];
    this.stockpile = this.buildDeck();

    this.players.forEach(p => {
      p.hand = [];
      p.unoCalled = false;
      p.hasDrawnThisTurn = false;
      p.drawnCardIndex = -1;
      for (let i = 0; i < 7; i++) {
        const card = this.drawFromStockpile();
        if (card) p.hand.push(card);
      }
    });

    const top = this.drawFromStockpile();
    if (top) {
      this.discardPile.push(top);
      const face = this.getActiveFace(top);
      this.activeSymbol = face.symbol;
      if (this.isWild(face.symbol)) {
        this.activeColor = null;
        this.pendingWild = { playerIndex: 0, symbol: face.symbol, isRoundStart: true };
      } else {
        this.activeColor = face.color;
        this.applyRoundStartAction(face.symbol);
      }
    }
  }

  applyRoundStartAction(symbol) {
    if (symbol === SKIP) {
      this.currentPlayerIndex = this.getRelativeIndex(0, 1);
    } else if (symbol === DRAW_ONE) {
      this.drawCardsForPlayer(this.players[0], 1);
      this.currentPlayerIndex = this.getRelativeIndex(0, 1);
    } else if (symbol === REVERSE) {
      this.direction = -1;
      this.currentPlayerIndex = this.players.length === 2 ? 0 : this.getRelativeIndex(0, 1);
    } else if (symbol === FLIP) {
      this.doFlip();
    }
  }

  doFlip() {
    this.activeSide = this.activeSide === SIDE_LIGHT ? SIDE_DARK : SIDE_LIGHT;
    this.stockpile.reverse();
    this.discardPile.reverse();
    const top = this.discardPile[this.discardPile.length - 1];
    if (top) {
      const face = this.getActiveFace(top);
      this.activeSymbol = face.symbol;
      this.activeColor = this.isWild(face.symbol) ? null : face.color;
    }
  }

  isCardPlayable(card, player) {
    const face = this.getActiveFace(card);
    if (this.isWild(face.symbol)) {
      if (face.symbol === WILD) return true;
      if (this.activeColor == null) return true;
      return !player.hand.some(c => c !== card && this.getActiveFace(c).color === this.activeColor);
    }
    return face.color === this.activeColor || face.symbol === this.activeSymbol;
  }

  playCard(playerId, cardIndex) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!player || player.id !== currentPlayer.id) {
      return { error: 'Not your turn' };
    }
    if (this.pendingWild && this.pendingWild.playerIndex === this.currentPlayerIndex) {
      return { error: 'Choose a color first' };
    }
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { error: 'Invalid card' };
    }
    if (player.hasDrawnThisTurn && cardIndex !== player.drawnCardIndex) {
      return { error: 'You may only play the card you drew' };
    }

    const card = player.hand[cardIndex];
    if (!this.isCardPlayable(card, player)) {
      return { error: 'Card is not playable' };
    }

    const face = this.getActiveFace(card);
    player.hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.activeSymbol = face.symbol;

    if (this.isWild(face.symbol)) {
      this.activeColor = null;
      this.pendingWild = { playerIndex: this.currentPlayerIndex, symbol: face.symbol, isRoundStart: false };
      return { awaitingColor: true };
    }

    this.activeColor = face.color;
    const wentOut = player.hand.length === 0;

    if (!wentOut && player.hand.length === 1) {
      if (!player.unoCalled) {
        this.drawCardsForPlayer(player, 2);
      }
      player.unoCalled = false;
    }

    const steps = this.applyEffect(face, player);
    if (wentOut) {
      return this.resolveRoundEnd(player);
    }

    this.advanceTurn(steps);
    return { success: true };
  }

  applyEffect(face, player) {
    switch (face.symbol) {
      case SKIP:
        return 2;
      case SKIP_EVERYONE:
        return 0;
      case REVERSE: {
        this.direction *= -1;
        return this.players.length === 2 ? 0 : 1;
      }
      case FLIP: {
        this.doFlip();
        return 1;
      }
      case DRAW_ONE: {
        this.drawCardsForPlayer(this.players[this.getRelativeIndex(this.currentPlayerIndex, 1)], 1);
        return 2;
      }
      case DRAW_FIVE: {
        this.drawCardsForPlayer(this.players[this.getRelativeIndex(this.currentPlayerIndex, 1)], 5);
        return 2;
      }
      default:
        return 1;
    }
  }

  chooseColor(playerId, color) {
    if (!this.pendingWild) {
      return { error: 'No color choice pending' };
    }
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.id !== this.players[this.pendingWild.playerIndex].id) {
      return { error: 'Not your color choice' };
    }
    const validColors = this.activeSide === SIDE_LIGHT ? LIGHT_COLORS : DARK_COLORS;
    if (!validColors.includes(color)) {
      return { error: 'Invalid color' };
    }

    this.activeColor = color;
    const pending = this.pendingWild;
    this.pendingWild = null;

    if (pending.isRoundStart) {
      return { success: true };
    }

    const playerIndex = pending.playerIndex;
    const playerObj = this.players[playerIndex];
    const wentOut = playerObj.hand.length === 0;

    if (pending.symbol === WILD) {
      if (wentOut) return this.resolveRoundEnd(playerObj);
      this.advanceTurn(1);
      return { success: true };
    }

    const target = this.players[this.getRelativeIndex(playerIndex, 1)];
    if (pending.symbol === WILD_DRAW_TWO) {
      this.drawCardsForPlayer(target, 2);
    } else {
      this.drawUntilColor(target, color);
    }

    if (wentOut) return this.resolveRoundEnd(playerObj);

    this.advanceTurn(2);
    return { success: true };
  }

  drawCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!player || player.id !== currentPlayer.id) {
      return { error: 'Not your turn' };
    }
    if (this.pendingWild && this.pendingWild.playerIndex === this.currentPlayerIndex) {
      return { error: 'Choose a color first' };
    }
    if (player.hasDrawnThisTurn) {
      return { error: 'Already drew this turn' };
    }

    const card = this.drawFromStockpile();
    if (!card) {
      return { gameDraw: true, message: 'No cards left to draw' };
    }

    player.hand.push(card);
    player.hasDrawnThisTurn = true;
    player.drawnCardIndex = player.hand.length - 1;

    return {
      success: true,
      canPlayDrawnCard: this.isCardPlayable(card, player),
      drawnCard: card,
      drawnCardIndex: player.drawnCardIndex
    };
  }

  passTurn(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!player || player.id !== currentPlayer.id) {
      return { error: 'Not your turn' };
    }
    if (!player.hasDrawnThisTurn) {
      return { error: 'Draw a card first before passing' };
    }

    this.advanceTurn(1);
    return { success: true };
  }

  callUno(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!player || player.id !== currentPlayer.id) {
      return { error: 'Not your turn' };
    }
    player.unoCalled = true;
    return { success: true };
  }

  advanceTurn(steps) {
    const current = this.players[this.currentPlayerIndex];
    current.hasDrawnThisTurn = false;
    current.drawnCardIndex = -1;
    this.currentPlayerIndex = this.getRelativeIndex(this.currentPlayerIndex, steps);
    this.players[this.currentPlayerIndex].unoCalled = false;
  }

  cardValue(face) {
    if (CARD_VALUES[face.symbol] != null) return CARD_VALUES[face.symbol];
    const n = parseInt(face.symbol, 10);
    return Number.isNaN(n) ? 0 : n;
  }

  resolveRoundEnd(winner) {
    let points = 0;
    this.players.forEach(p => {
      if (p.id !== winner.id) {
        p.hand.forEach(card => {
          points += this.cardValue(this.getActiveFace(card));
        });
      }
    });
    winner.totalScore += points;
    return {
      roundEnd: true,
      winnerId: winner.id,
      winnerName: winner.name,
      points,
      winnerScore: winner.totalScore,
      gameOver: winner.totalScore >= this.targetScore
    };
  }

  getStateForPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];
    return {
      activeSide: this.activeSide,
      direction: this.direction === 1 ? 'clockwise' : 'counterclockwise',
      currentPlayerIndex: this.currentPlayerIndex,
      activeColor: this.activeColor,
      activeSymbol: this.activeSymbol,
      awaitingColorPlayerIndex: this.pendingWild ? this.pendingWild.playerIndex : -1,
      discardTop: this.discardPile.length ? this.discardPile[this.discardPile.length - 1] : null,
      stockpileCount: this.stockpile.length,
      targetScore: this.targetScore,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        cardCount: p.hand.length,
        totalScore: p.totalScore,
        unoCalled: p.unoCalled,
        isCurrentPlayer: p.id === currentPlayer.id
      })),
      yourHand: player ? player.hand : [],
      yourId: playerId,
      hasDrawnThisTurn: player ? player.hasDrawnThisTurn : false,
      drawnCardIndex: player ? player.drawnCardIndex : -1,
      canPlayDrawnCard: player && player.hasDrawnThisTurn && player.drawnCardIndex >= 0 && player.hand[player.drawnCardIndex]
        ? this.isCardPlayable(player.hand[player.drawnCardIndex], player)
        : false
    };
  }
}

module.exports = UnoFlipEngine;
