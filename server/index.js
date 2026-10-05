const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const GameEngine = require('./gameEngine');
const SinglePlayerGame = require('./singlePlayerGame');

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

  socket.on('createRoom', (playerName) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      host: socket.id,
      players: [{ id: socket.id, name: playerName, lives: 3 }],
      game: null,
      started: false
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, isHost: true });
    io.to(roomCode).emit('roomUpdate', {
      players: room.players,
      isHost: socket.id === room.host,
      canStart: room.players.length >= 3
    });
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.started) {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    if (room.players.length >= 6) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    room.players.push({ id: socket.id, name: playerName, lives: 3 });
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, isHost: false });
    io.to(roomCode).emit('roomUpdate', {
      players: room.players,
      isHost: socket.id === room.host,
      canStart: room.players.length >= 3
    });
  });

  socket.on('startGame', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || socket.id !== room.host) {
      socket.emit('error', { message: 'Only host can start game' });
      return;
    }
    if (room.players.length < 3) {
      socket.emit('error', { message: 'Need at least 3 players' });
      return;
    }
    room.started = true;
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
            canStart: room.players.length >= 3 && !room.started
          });
          if (room.started) {
            io.to(code).emit('playerDisconnected', { playerId: socket.id });
          }
        }
      }
    });
  });
});

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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
