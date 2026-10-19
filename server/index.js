const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const GameEngine = require('./gameEngine');
const SinglePlayerGame = require('./singlePlayerGame');
const UnoFlipEngine = require('./unoFlipEngine');
const UnoFlipSinglePlayer = require('./unoFlipSinglePlayer');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();
const singlePlayerGames = new Map();
const unoFlipGames = new Map();

function normalizeJoin(payload) {
  if (typeof payload === 'string') {
    return { playerName: payload, gameType: 'ono99' };
  }
  return {
    playerName: payload.playerName,
    gameType: payload.gameType || 'ono99'
  };
}

function minPlayersFor(gameType) {
  return gameType === 'unoFlip' ? 2 : 3;
}

function maxPlayersFor(gameType) {
  return gameType === 'unoFlip' ? 4 : 6;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', (payload) => {
    const { playerName, gameType } = normalizeJoin(payload);
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      gameType,
      host: socket.id,
      players: [{ id: socket.id, name: playerName, lives: 3 }],
      game: null,
      started: false
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, isHost: true, gameType });
    io.to(roomCode).emit('roomUpdate', {
      players: room.players,
      isHost: socket.id === room.host,
      canStart: room.players.length >= minPlayersFor(gameType)
    });
  });

  socket.on('joinRoom', (payload) => {
    const { roomCode, playerName, gameType } = {
      roomCode: payload.roomCode,
      playerName: payload.playerName,
      gameType: payload.gameType || 'ono99'
    };
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.started) {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    if (room.players.length >= maxPlayersFor(room.gameType)) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    room.players.push({ id: socket.id, name: playerName, lives: 3 });
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, isHost: false, gameType: room.gameType });
    io.to(roomCode).emit('roomUpdate', {
      players: room.players,
      isHost: socket.id === room.host,
      canStart: room.players.length >= minPlayersFor(room.gameType)
    });
  });

  socket.on('startGame', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || socket.id !== room.host) {
      socket.emit('error', { message: 'Only host can start game' });
      return;
    }
    if (room.players.length < minPlayersFor(room.gameType)) {
      socket.emit('error', { message: `Need at least ${minPlayersFor(room.gameType)} players` });
      return;
    }
    room.started = true;

    if (room.gameType === 'unoFlip') {
      room.game = new UnoFlipEngine(room.players.map(p => ({ id: p.id, name: p.name, isBot: false })));
      room.players.forEach(player => {
        const state = room.game.getStateForPlayer(player.id);
        io.to(player.id).emit('unoFlipGameStarted', state);
      });
      return;
    }

    room.game = new GameEngine(room.players.map(p => ({ ...p })));
    room.game.startNewHand();

    room.players.forEach(player => {
      const state = room.game.getStateForPlayer(player.id);
      io.to(player.id).emit('gameStarted', state);
    });
  });

  socket.on('playCard', ({ roomCode, cardIndex }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    const result = room.game.playCard(socket.id, cardIndex);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    if (result.handLost) {
      io.to(roomCode).emit('handLost', { loserId: result.loserId, loserName: result.loserName });
      setTimeout(() => {
        if (result.gameOver) {
          io.to(roomCode).emit('gameOver', { winner: result.winner });
          rooms.delete(roomCode);
        } else {
          room.game.startNewHand();
          room.players.forEach(player => {
            const state = room.game.getStateForPlayer(player.id);
            io.to(player.id).emit('gameStateUpdate', state);
          });
        }
      }, 3000);
    } else {
      room.players.forEach(player => {
        const state = room.game.getStateForPlayer(player.id);
        io.to(player.id).emit('gameStateUpdate', state);
      });
    }
  });

  socket.on('drawCard', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    const result = room.game.drawCard(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.players.forEach(player => {
      const state = room.game.getStateForPlayer(player.id);
      io.to(player.id).emit('gameStateUpdate', state);
    });
  });

  socket.on('discardFourOno99', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game) return;

    const result = room.game.discardFourOno99(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    room.players.forEach(player => {
      const state = room.game.getStateForPlayer(player.id);
      io.to(player.id).emit('gameStateUpdate', state);
    });
  });

  socket.on('unoFlipPlayCard', ({ roomCode, cardIndex }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game || room.gameType !== 'unoFlip') return;

    const result = room.game.playCard(socket.id, cardIndex);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    if (result.awaitingColor) {
      broadcastUnoFlipState(room);
      return;
    }
    if (result.roundEnd) {
      handleUnoFlipRoundEnd(room, result);
      return;
    }
    broadcastUnoFlipState(room);
  });

  socket.on('unoFlipChooseColor', ({ roomCode, color }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game || room.gameType !== 'unoFlip') return;

    const result = room.game.chooseColor(socket.id, color);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    if (result.roundEnd) {
      handleUnoFlipRoundEnd(room, result);
      return;
    }
    broadcastUnoFlipState(room);
  });

  socket.on('unoFlipDrawCard', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game || room.gameType !== 'unoFlip') return;

    const result = room.game.drawCard(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    if (result.gameDraw) {
      io.to(roomCode).emit('unoFlipGameDraw', { message: result.message });
      return;
    }
    broadcastUnoFlipState(room);
  });

  socket.on('unoFlipPass', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game || room.gameType !== 'unoFlip') return;

    const result = room.game.passTurn(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    broadcastUnoFlipState(room);
  });

  socket.on('unoFlipCallUno', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || !room.game || room.gameType !== 'unoFlip') return;

    const result = room.game.callUno(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    broadcastUnoFlipState(room);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    rooms.forEach((room, code) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          rooms.delete(code);
        } else {
          if (room.host === socket.id && room.players.length > 0) {
            room.host = room.players[0].id;
          }
          io.to(code).emit('roomUpdate', {
            players: room.players,
            isHost: room.host,
            canStart: room.players.length >= minPlayersFor(room.gameType) && !room.started
          });
          if (room.started) {
            io.to(code).emit('playerDisconnected', { playerId: socket.id });
          }
        }
      }
    });
  });
});

function broadcastUnoFlipState(room) {
  room.players.forEach(player => {
    const state = room.game.getStateForPlayer(player.id);
    io.to(player.id).emit('unoFlipStateUpdate', state);
  });
}

function handleUnoFlipRoundEnd(room, result) {
  io.to(room.code).emit('unoFlipRoundEnd', {
    winnerName: result.winnerName,
    points: result.points,
    winnerScore: result.winnerScore
  });
  if (result.gameOver) {
    io.to(room.code).emit('unoFlipGameOver', {
      winnerName: result.winnerName,
      winnerScore: result.winnerScore
    });
    rooms.delete(room.code);
  } else {
    setTimeout(() => {
      room.game.startNewRound();
      broadcastUnoFlipState(room);
    }, 3000);
  }
}

app.post('/api/singleplayer/start', (req, res) => {
  const { playerName } = req.body;
  const sessionId = Date.now().toString();
  const game = new SinglePlayerGame(playerName);
  singlePlayerGames.set(sessionId, game);
  
  res.json({ ...game.getState(), sessionId });
});

app.post('/api/singleplayer/state', (req, res) => {
  const { sessionId } = req.body;
  const game = singlePlayerGames.get(sessionId || 'default');
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  res.json(game.getState());
});

app.post('/api/singleplayer/play', async (req, res) => {
  const { cardIndex, sessionId } = req.body;
  const game = singlePlayerGames.get(sessionId || 'default');
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.playCard(cardIndex);
  if (result.error) {
    return res.json({ error: result.error });
  }

  if (result.gameDraw) {
    return res.json({
      gameState: game.getState(),
      gameDraw: true,
      message: result.message
    });
  }

  if (result.handLost) {
    setTimeout(async () => {
      if (result.gameOver) {
        return;
      }
      game.startNewHand();
      await game.delay(500);
      await game.checkAndProcessBots();
    }, 3000);

    return res.json({ 
      gameState: game.getState(),
      handLost: result.handLost,
      loserName: result.loserName,
      gameOver: result.gameOver,
      winner: result.winner
    });
  }

  res.json({ 
    gameState: game.getState(),
    canDiscardFourOno99: result.canDiscardFourOno99,
    processingBots: true
  });

  setTimeout(async () => {
    await game.delay(600);
    const botResult = await game.checkAndProcessBots();

    if (botResult.gameDraw) {
      game.notifyUpdate('gameDraw', { message: botResult.message });
    } else if (botResult.handLost) {
      setTimeout(async () => {
        if (botResult.gameOver) {
          return;
        }
        game.startNewHand();
        await game.delay(500);
        await game.checkAndProcessBots();
      }, 3000);
    }
  }, 0);
});

app.get('/api/singleplayer/events/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const game = singlePlayerGames.get(sessionId);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  game.setUpdateCallback((action, data) => {
    res.write(`data: ${JSON.stringify({ action, data })}\n\n`);
  });

  req.on('close', () => {
    game.setUpdateCallback(null);
  });
});

app.post('/api/singleplayer/draw', (req, res) => {
  const { sessionId } = req.body;
  const game = singlePlayerGames.get(sessionId || 'default');
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({ 
    error: 'Drawing happens automatically after playing a card',
    gameState: game.getState()
  });
});

app.post('/api/singleplayer/discard-ono99', (req, res) => {
  const { sessionId } = req.body;
  const game = singlePlayerGames.get(sessionId || 'default');
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.discardFourOno99();
  if (result.error) {
    return res.json({ error: result.error });
  }

  res.json(game.getState());
});

function processUnoFlipBots(game) {
  setTimeout(async () => {
    const botResult = await game.processBots();
    if (botResult.gameDraw) {
      game.notifyUpdate('gameDraw', { message: botResult.message });
    } else if (botResult.roundEnd && !botResult.gameOver) {
      setTimeout(() => {
        game.startNewRound();
        game.notifyUpdate('newRound', { gameState: game.getState() });
        processUnoFlipBots(game);
      }, 2500);
    }
  }, 0);
}

function handleUnoFlipHumanRoundEnd(game, result) {
  if (result.gameOver) {
    game.notifyUpdate('gameOver', { winnerName: result.winnerName, winnerScore: result.winnerScore });
  } else {
    setTimeout(() => {
      game.startNewRound();
      game.notifyUpdate('newRound', { gameState: game.getState() });
      processUnoFlipBots(game);
    }, 2500);
  }
}

app.post('/api/unoflip/start', (req, res) => {
  const { playerName } = req.body;
  const sessionId = Date.now().toString();
  const game = new UnoFlipSinglePlayer(playerName);
  unoFlipGames.set(sessionId, game);

  res.json({ ...game.getState(), sessionId });
});

app.post('/api/unoflip/state', (req, res) => {
  const { sessionId } = req.body;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(game.getState());
});

app.post('/api/unoflip/play', (req, res) => {
  const { cardIndex, sessionId } = req.body;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.playCard(cardIndex);
  if (result.error) {
    return res.json({ error: result.error });
  }
  if (result.awaitingColor) {
    return res.json({ gameState: game.getState(), awaitingColor: true });
  }
  if (result.roundEnd) {
    handleUnoFlipHumanRoundEnd(game, result);
    return res.json({ gameState: game.getState(), roundEnd: result });
  }

  res.json({ gameState: game.getState() });
  processUnoFlipBots(game);
});

app.post('/api/unoflip/choose-color', (req, res) => {
  const { color, sessionId } = req.body;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.chooseColor(color);
  if (result.error) {
    return res.json({ error: result.error });
  }
  if (result.roundEnd) {
    handleUnoFlipHumanRoundEnd(game, result);
    return res.json({ gameState: game.getState(), roundEnd: result });
  }

  res.json({ gameState: game.getState() });
  processUnoFlipBots(game);
});

app.post('/api/unoflip/draw', (req, res) => {
  const { sessionId } = req.body;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.drawCard();
  if (result.error) {
    return res.json({ error: result.error });
  }
  if (result.gameDraw) {
    return res.json({ gameState: game.getState(), gameDraw: true, message: result.message });
  }

  res.json({ gameState: game.getState(), canPlayDrawnCard: result.canPlayDrawnCard });
});

app.post('/api/unoflip/pass', (req, res) => {
  const { sessionId } = req.body;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.passTurn();
  if (result.error) {
    return res.json({ error: result.error });
  }

  res.json({ gameState: game.getState() });
  processUnoFlipBots(game);
});

app.post('/api/unoflip/call-uno', (req, res) => {
  const { sessionId } = req.body;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.callUno();
  if (result.error) {
    return res.json({ error: result.error });
  }

  res.json({ gameState: game.getState() });
});

app.get('/api/unoflip/events/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const game = unoFlipGames.get(sessionId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  game.setUpdateCallback((action, data) => {
    res.write(`data: ${JSON.stringify({ action, data })}\n\n`);
  });

  req.on('close', () => {
    game.setUpdateCallback(null);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
