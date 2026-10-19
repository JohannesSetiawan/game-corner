const UnoFlipEngine = require('./unoFlipEngine');
const UnoFlipBotAI = require('./unoFlipBotAI');

class UnoFlipSinglePlayer {
  constructor(playerName) {
    const players = [
      { id: 'human', name: playerName, isBot: false },
      { id: 'bot1', name: 'Bot Alice', isBot: true },
      { id: 'bot2', name: 'Bot Bob', isBot: true },
      { id: 'bot3', name: 'Bot Charlie', isBot: true }
    ];
    this.engine = new UnoFlipEngine(players);
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
    return this.engine.playCard('human', cardIndex);
  }

  chooseColor(color) {
    return this.engine.chooseColor('human', color);
  }

  drawCard() {
    return this.engine.drawCard('human');
  }

  passTurn() {
    return this.engine.passTurn('human');
  }

  callUno() {
    return this.engine.callUno('human');
  }

  startNewRound() {
    this.engine.startNewRound();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processBots() {
    if (this.processingBotTurn) return { success: true };
    const state = this.engine.getStateForPlayer('human');
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id === 'human') return { success: true };
    return await this.processBotTurns();
  }

  async processBotTurns() {
    if (this.processingBotTurn) return { success: true };
    this.processingBotTurn = true;

    let guard = 0;
    while (guard < 200) {
      guard++;
      const state = this.engine.getStateForPlayer('human');
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id === 'human') break;

      const botId = currentPlayer.id;

      if (state.awaitingColorPlayerIndex === state.currentPlayerIndex) {
        this.notifyUpdate('botThinking', { botName: currentPlayer.name });
        await this.delay(800);
        const bot = new UnoFlipBotAI(this.engine.getStateForPlayer(botId), botId);
        const color = bot.chooseColor();
        const result = this.engine.chooseColor(botId, color);
        this.notifyUpdate('botAction', {
          botName: currentPlayer.name,
          action: `chose ${color}`,
          gameState: this.engine.getStateForPlayer('human')
        });
        await this.delay(800);
        const outcome = this.handleRoundEnd(result);
        if (outcome) {
          this.processingBotTurn = false;
          return outcome;
        }
        continue;
      }

      this.notifyUpdate('botThinking', { botName: currentPlayer.name });
      await this.delay(1000);

      const botState = this.engine.getStateForPlayer(botId);
      const bot = new UnoFlipBotAI(botState, botId);

      if (botState.yourHand.length === 2) {
        this.engine.callUno(botId);
      }

      const decision = bot.chooseCard();
      let result;

      if (decision.action === 'draw') {
        result = this.engine.drawCard(botId);
        if (result.canPlayDrawnCard) {
          await this.delay(600);
          result = this.engine.playCard(botId, result.drawnCardIndex);
          if (result.awaitingColor) {
            const color = new UnoFlipBotAI(this.engine.getStateForPlayer(botId), botId).chooseColor();
            await this.delay(600);
            result = this.engine.chooseColor(botId, color);
          }
          this.notifyUpdate('botAction', {
            botName: currentPlayer.name,
            action: 'drew and played a card',
            gameState: this.engine.getStateForPlayer('human')
          });
        } else {
          this.engine.passTurn(botId);
          this.notifyUpdate('botAction', {
            botName: currentPlayer.name,
            action: 'drew a card',
            gameState: this.engine.getStateForPlayer('human')
          });
        }
      } else {
        const cardPlayed = botState.yourHand[decision.cardIndex];
        result = this.engine.playCard(botId, decision.cardIndex);
        if (result.awaitingColor) {
          const color = new UnoFlipBotAI(this.engine.getStateForPlayer(botId), botId).chooseColor();
          await this.delay(600);
          result = this.engine.chooseColor(botId, color);
        }
        this.notifyUpdate('botAction', {
          botName: currentPlayer.name,
          action: 'played a card',
          card: cardPlayed,
          gameState: this.engine.getStateForPlayer('human')
        });
      }

      const outcome = this.handleRoundEnd(result);
      if (outcome) {
        this.processingBotTurn = false;
        return outcome;
      }

      await this.delay(800);
    }

    this.processingBotTurn = false;
    return { success: true };
  }

  handleRoundEnd(result) {
    if (!result || !result.roundEnd) return null;

    this.notifyUpdate('roundEnd', {
      winnerName: result.winnerName,
      points: result.points,
      winnerScore: result.winnerScore
    });

    if (result.gameOver) {
      this.notifyUpdate('gameOver', {
        winnerName: result.winnerName,
        winnerScore: result.winnerScore
      });
      return { gameOver: true, ...result };
    }

    return { roundEnd: true, ...result };
  }
}

module.exports = UnoFlipSinglePlayer;
