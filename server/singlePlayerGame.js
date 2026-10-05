const GameEngine = require('./gameEngine');
const BotAI = require('./botAI');

class SinglePlayerGame {
  constructor(playerName) {
    const players = [
      { id: 'human', name: playerName, lives: 3, isBot: false },
      { id: 'bot1', name: 'Bot Alice', lives: 3, isBot: true },
      { id: 'bot2', name: 'Bot Bob', lives: 3, isBot: true },
      { id: 'bot3', name: 'Bot Charlie', lives: 3, isBot: true }
    ];
    this.engine = new GameEngine(players);
    this.engine.startNewHand();
    this.processingBotTurn = false;
    this.updateCallback = null;
  }

  setUpdateCallback(callback) {
    this.updateCallback = callback;
  }

  notifyUpdate(action, data) {
    if (this.updateCallback) {
      this.updateCallback(action, data);
    }
  }

  getState() {
    return this.engine.getStateForPlayer('human');
  }

  playCard(cardIndex) {
    const result = this.engine.playCard('human', cardIndex);
    if (result.error || result.handLost) {
      return result;
    }

    const drawResult = this.engine.drawCard('human');
    if (drawResult.error || drawResult.gameDraw) {
      return drawResult;
    }

    return { 
      success: true, 
      canDiscardFourOno99: drawResult.canDiscardFourOno99 
    };
  }

  drawCard() {
    return { error: 'Drawing happens automatically after playing a card' };
  }

  discardFourOno99() {
    return this.engine.discardFourOno99('human');
  }

  async checkAndProcessBots() {
    if (this.processingBotTurn) return { success: true };
    
    const state = this.engine.getStateForPlayer('human');
    const currentPlayer = state.players[state.currentPlayerIndex];
    
    if (!currentPlayer || currentPlayer.id === 'human') {
      return { success: true };
    }

    return await this.processBotTurns();
  }

  async processBotTurns() {
    if (this.processingBotTurn) return { success: true };
    this.processingBotTurn = true;

    while (true) {
      const state = this.engine.getStateForPlayer('human');
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      if (!currentPlayer || currentPlayer.id === 'human') {
        break;
      }

      this.notifyUpdate('botThinking', { 
        botName: currentPlayer.name,
        botId: currentPlayer.id
      });

      await this.delay(1200);

      const botState = this.engine.getStateForPlayer(currentPlayer.id);
      const bot = new BotAI(botState, currentPlayer.id);
      const decision = bot.chooseCard();

      if (decision.action === 'discardFourOno99') {
        this.engine.discardFourOno99(currentPlayer.id);
        this.notifyUpdate('botAction', {
          botName: currentPlayer.name,
          action: 'discarded 4 ONO 99 cards',
          gameState: this.engine.getStateForPlayer('human')
        });
        continue;
      }

      if (decision.action === 'playCard') {
        const cardPlayed = botState.yourHand[decision.cardIndex];
        
        const result = this.engine.playCard(currentPlayer.id, decision.cardIndex);
        
        this.notifyUpdate('botAction', {
          botName: currentPlayer.name,
          action: 'played a card',
          card: cardPlayed,
          gameState: this.engine.getStateForPlayer('human')
        });

        if (result.handLost) {
          this.processingBotTurn = false;
          return { handLost: true, ...result };
        }

        await this.delay(800);
        
        const drawResult = this.engine.drawCard(currentPlayer.id);
        
        if (drawResult.gameDraw) {
          this.processingBotTurn = false;
          return { gameDraw: true, message: drawResult.message };
        }
        
        this.notifyUpdate('botAction', {
          botName: currentPlayer.name,
          action: 'drew a card',
          gameState: this.engine.getStateForPlayer('human')
        });

        if (drawResult.canDiscardFourOno99) {
          this.engine.discardFourOno99(currentPlayer.id);
          this.notifyUpdate('botAction', {
            botName: currentPlayer.name,
            action: 'discarded 4 ONO 99 cards',
            gameState: this.engine.getStateForPlayer('human')
          });
        }
      }
    }

    this.processingBotTurn = false;
    return { success: true };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startNewHand() {
    this.engine.startNewHand();
  }
}

module.exports = SinglePlayerGame;
