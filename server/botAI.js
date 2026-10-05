class BotAI {
  constructor(gameState, playerId) {
    this.gameState = gameState;
    this.playerId = playerId;
    this.hand = gameState.yourHand || [];
  }

  chooseCard() {
    const total = this.gameState.total;

    // Check for four ONO 99 cards
    const ono99Count = this.hand.filter(c => c.type === 'ono99').length;
    if (ono99Count === 4) {
      return { action: 'discardFourOno99' };
    }

    // If total is low (< 50), play highest number cards
    if (total < 50) {
      const numberCards = this.hand
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card.type === 'number')
        .sort((a, b) => b.card.value - a.card.value);
      
      if (numberCards.length > 0) {
        const chosen = numberCards[0];
        if (total + chosen.card.value < 99) {
          return { action: 'playCard', cardIndex: chosen.index };
        }
      }
    }

    // If total is high (70-98), prioritize safe cards
    if (total >= 70) {
      // Try Minus 10
      const minus10 = this.hand.findIndex(c => c.type === 'minus10');
      if (minus10 !== -1) {
        return { action: 'playCard', cardIndex: minus10 };
      }

      // Try 0 card
      const zeroCard = this.hand.findIndex(c => c.type === 'zero');
      if (zeroCard !== -1) {
        return { action: 'playCard', cardIndex: zeroCard };
      }

      // Try Reverse
      const reverse = this.hand.findIndex(c => c.type === 'reverse');
      if (reverse !== -1) {
        return { action: 'playCard', cardIndex: reverse };
      }

      // Try Play 2 defensively
      const play2 = this.hand.findIndex(c => c.type === 'play2');
      if (play2 !== -1) {
        return { action: 'playCard', cardIndex: play2 };
      }

      // Play smallest number card that doesn't cause loss
      const safeNumbers = this.hand
        .map((card, index) => ({ card, index, newTotal: this.calculateNewTotal(card) }))
        .filter(({ card, newTotal }) => card.type === 'number' && newTotal < 99)
        .sort((a, b) => a.card.value - b.card.value);
      
      if (safeNumbers.length > 0) {
        return { action: 'playCard', cardIndex: safeNumbers[0].index };
      }
    }

    // Mid-range strategy: play any safe card
    const safeCards = this.hand
      .map((card, index) => ({ card, index, newTotal: this.calculateNewTotal(card) }))
      .filter(({ card, newTotal }) => newTotal < 99 && card.type !== 'ono99');

    if (safeCards.length > 0) {
      // Prefer special cards in mid-range
      const specialCard = safeCards.find(({ card }) => 
        card.type === 'minus10' || card.type === 'reverse' || card.type === 'play2'
      );
      if (specialCard) {
        return { action: 'playCard', cardIndex: specialCard.index };
      }
      // Otherwise play lowest number
      const lowest = safeCards.sort((a, b) => {
        if (a.card.type === 'number' && b.card.type === 'number') {
          return a.card.value - b.card.value;
        }
        return 0;
      })[0];
      return { action: 'playCard', cardIndex: lowest.index };
    }

    // No safe cards - must play something (will lose)
    const nonOno99 = this.hand.findIndex(c => c.type !== 'ono99');
    if (nonOno99 !== -1) {
      return { action: 'playCard', cardIndex: nonOno99 };
    }

    // Only ONO 99 cards left
    return { action: 'playCard', cardIndex: 0 };
  }

  calculateNewTotal(card) {
    if (card.type === 'number') {
      return this.gameState.total + card.value;
    }
    if (card.type === 'minus10') {
      return Math.max(0, this.gameState.total - 10);
    }
    if (card.type === 'ono99') {
      return 99;
    }
    return this.gameState.total;
  }
}

module.exports = BotAI;
