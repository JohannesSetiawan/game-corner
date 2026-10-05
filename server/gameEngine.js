class GameEngine {
  constructor(players) {
    this.players = players.map(p => ({
      ...p,
      hand: [],
      hasDrawnThisTurn: false,
      play2TurnsRemaining: 0
    }));
    this.deck = [];
    this.discardPile = [];
    this.total = 0;
    this.direction = 1;
    this.currentPlayerIndex = 0;
    this.initializeDeck();
  }

  initializeDeck() {
    const colors = ['blue', 'green', 'red', 'yellow'];
    const deck = [];

    const numbersPerColor = {
      1: 2, 2: 2, 3: 2, 4: 2, 5: 2,
      6: 2, 7: 2, 8: 2, 9: 2, 10: 2
    };

    for (let num = 1; num <= 10; num++) {
      const count = numbersPerColor[num];
      for (let i = 0; i < count; i++) {
        const colorIndex = i % colors.length;
        deck.push({ type: 'number', value: num, color: colors[colorIndex] });
      }
    }

    for (let i = 0; i < 4; i++) {
      deck.push({ type: 'zero', value: 0, color: 'orange' });
    }

    for (let i = 0; i < 10; i++) {
      deck.push({ type: 'minus10', value: -10, color: 'purple' });
    }

    for (let i = 0; i < 8; i++) {
      deck.push({ type: 'reverse', value: 0, color: 'teal' });
    }

    for (let i = 0; i < 10; i++) {
      deck.push({ type: 'play2', value: 0, color: 'purple' });
    }

    for (let i = 0; i < 10; i++) {
      deck.push({ type: 'ono99', value: 99, color: 'black' });
    }

    this.deck = this.shuffleDeck(deck);
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  startNewHand() {
    if (this.deck.length < this.players.length * 4 + 10) {
      this.initializeDeck();
    }

    this.players.forEach(player => {
      player.hand = [];
      player.hasDrawnThisTurn = false;
      player.play2TurnsRemaining = 0;
      for (let i = 0; i < 4; i++) {
        player.hand.push(this.deck.pop());
      }
    });

    this.discardPile = [this.deck.pop()];
    this.total = 0;
    this.direction = 1;
    this.currentPlayerIndex = 0;
  }

  playCard(playerId, cardIndex) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];

    if (!player || player.id !== currentPlayer.id) {
      return { error: 'Not your turn' };
    }

    if (player.hasDrawnThisTurn) {
      return { error: 'You must wait for next turn after drawing' };
    }

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { error: 'Invalid card index' };
    }

    const card = player.hand[cardIndex];
    const newTotal = this.calculateNewTotal(card);

    if (newTotal >= 99 && card.type !== 'ono99') {
      const hasOtherValidCards = player.hand.some((c, idx) => {
        if (idx === cardIndex) return false;
        const testTotal = this.calculateNewTotal(c);
        return testTotal < 99 || c.type === 'ono99';
      });
      if (hasOtherValidCards) {
        return { error: 'This card would make you lose. Play another card.' };
      }
    }

    player.hand.splice(cardIndex, 1);
    this.discardPile.push(card);

    if (card.type === 'ono99') {
      this.total = 99;
      return this.handleHandLoss(player);
    }

    this.total = Math.max(0, newTotal);

    if (this.total >= 99) {
      return this.handleHandLoss(player);
    }

    if (card.type === 'reverse') {
      this.direction *= -1;
    }

    if (card.type === 'play2') {
      const nextPlayerIndex = this.getNextPlayerIndex();
      this.players[nextPlayerIndex].play2TurnsRemaining = 2;
    }

    if (this.deck.length === 0) {
      if (this.discardPile.length <= 1) {
        return {
          gameDraw: true,
          message: 'Deck is empty! Game ends in a draw.'
        };
      }
      const topCard = this.discardPile.pop();
      this.deck = this.shuffleDeck([...this.discardPile]);
      this.discardPile = [topCard];
    }

    if (this.deck.length === 0) {
      return {
        gameDraw: true,
        message: 'Deck is empty! Game ends in a draw.'
      };
    }

    const drawnCard = this.deck.pop();
    player.hand.push(drawnCard);

    const ono99Count = player.hand.filter(c => c.type === 'ono99').length;
    const canDiscardFourOno99 = ono99Count === 4;

    if (player.play2TurnsRemaining > 0) {
      player.play2TurnsRemaining--;
      if (player.play2TurnsRemaining > 0) {
        return { success: true, canDiscardFourOno99 };
      }
    }

    this.currentPlayerIndex = this.getNextPlayerIndex();
    this.players[this.currentPlayerIndex].hasDrawnThisTurn = false;

    return { success: true, canDiscardFourOno99 };
  }

  calculateNewTotal(card) {
    if (card.type === 'number') {
      return this.total + card.value;
    }
    if (card.type === 'minus10') {
      return this.total - 10;
    }
    if (card.type === 'ono99') {
      return 99;
    }
    return this.total;
  }

  drawCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const currentPlayer = this.players[this.currentPlayerIndex];

    if (!player || player.id !== currentPlayer.id) {
      return { error: 'Not your turn' };
    }

    if (player.hasDrawnThisTurn) {
      return { error: 'Already drawn this turn' };
    }

    if (this.deck.length === 0) {
      if (this.discardPile.length <= 1) {
        return { 
          gameDraw: true,
          message: 'Deck is empty! Game ends in a draw.'
        };
      }
      const topCard = this.discardPile.pop();
      this.deck = this.shuffleDeck([...this.discardPile]);
      this.discardPile = [topCard];
    }

    if (this.deck.length === 0) {
      return { 
        gameDraw: true,
        message: 'Deck is empty! Game ends in a draw.'
      };
    }

    const drawnCard = this.deck.pop();
    player.hand.push(drawnCard);
    player.hasDrawnThisTurn = true;

    const ono99Count = player.hand.filter(c => c.type === 'ono99').length;
    const canDiscardFourOno99 = ono99Count === 4;

    if (player.play2TurnsRemaining > 0) {
      player.play2TurnsRemaining--;
      if (player.play2TurnsRemaining > 0) {
        player.hasDrawnThisTurn = false;
        return { success: true, canDiscardFourOno99 };
      }
    }

    this.currentPlayerIndex = this.getNextPlayerIndex();
    this.players[this.currentPlayerIndex].hasDrawnThisTurn = false;

    return { success: true, canDiscardFourOno99 };
  }

  discardFourOno99(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { error: 'Player not found' };
    }

    const ono99Cards = player.hand.filter(c => c.type === 'ono99');
    if (ono99Cards.length !== 4) {
      return { error: 'You need exactly 4 ONO 99 cards' };
    }

    player.hand = player.hand.filter(c => c.type !== 'ono99');
    
    for (let i = 0; i < 4; i++) {
      if (this.deck.length === 0) {
        const topCard = this.discardPile.pop();
        this.deck = this.shuffleDeck([...this.discardPile]);
        this.discardPile = [topCard];
      }
      player.hand.push(this.deck.pop());
    }

    return { success: true };
  }

  handleHandLoss(player) {
    player.lives--;
    const alivePlayers = this.players.filter(p => p.lives > 0);
    
    if (alivePlayers.length === 1) {
      return {
        handLost: true,
        loserId: player.id,
        loserName: player.name,
        gameOver: true,
        winner: alivePlayers[0]
      };
    }

    return {
      handLost: true,
      loserId: player.id,
      loserName: player.name,
      gameOver: false
    };
  }

  getNextPlayerIndex() {
    let nextIndex = this.currentPlayerIndex + this.direction;
    if (nextIndex >= this.players.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = this.players.length - 1;
    return nextIndex;
  }

  getStateForPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    
    const deckCounts = this.getDeckCardCounts();
    const discardCounts = this.getDiscardCardCounts();
    
    return {
      total: this.total,
      direction: this.direction === 1 ? 'clockwise' : 'counterclockwise',
      currentPlayerIndex: this.currentPlayerIndex,
      discardPileTop: this.discardPile[this.discardPile.length - 1],
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        lives: p.lives,
        cardCount: p.hand.length,
        hasDrawnThisTurn: p.hasDrawnThisTurn,
        play2TurnsRemaining: p.play2TurnsRemaining,
        isCurrentPlayer: p.id === this.players[this.currentPlayerIndex].id
      })),
      yourHand: player ? player.hand : [],
      yourId: playerId,
      canDiscardFourOno99: player ? player.hand.filter(c => c.type === 'ono99').length === 4 : false,
      deckCardsRemaining: this.deck.length,
      deckCardCounts: deckCounts,
      discardCardCounts: discardCounts
    };
  }

  getDeckCardCounts() {
    const counts = {
      number: {},
      zero: 0,
      minus10: 0,
      reverse: 0,
      play2: 0,
      ono99: 0
    };

    this.deck.forEach(card => {
      if (card.type === 'number') {
        counts.number[card.value] = (counts.number[card.value] || 0) + 1;
      } else {
        counts[card.type] = (counts[card.type] || 0) + 1;
      }
    });

    return counts;
  }

  getDiscardCardCounts() {
    const counts = {
      number: {},
      zero: 0,
      minus10: 0,
      reverse: 0,
      play2: 0,
      ono99: 0
    };

    this.discardPile.forEach(card => {
      if (card.type === 'number') {
        counts.number[card.value] = (counts.number[card.value] || 0) + 1;
      } else {
        counts[card.type] = (counts[card.type] || 0) + 1;
      }
    });

    return counts;
  }
}

module.exports = GameEngine;
