import React, { useState } from 'react';
import io from 'socket.io-client';
import './App.css';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';
import UnoFlipGameBoard from './components/UnoFlipGameBoard';
import WaitingRoom from './components/WaitingRoom';
import GameOver from './components/GameOver';

const SERVER_URL = 'http://localhost:3001';

function App() {
  const [gameMode, setGameMode] = useState('menu');
  const [gameType, setGameType] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [waitingRoomPlayers, setWaitingRoomPlayers] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [eventSource, setEventSource] = useState(null);
  const [botAction, setBotAction] = useState(null);
  const [roundEndInfo, setRoundEndInfo] = useState(null);

  const showError = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const startOnoSinglePlayer = async (playerName) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/singleplayer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });
      const data = await response.json();
      setSessionId(data.sessionId);
      const { sessionId: sid, ...gameStateData } = data;
      setGameState(gameStateData);
      setGameMode('playing-single');

      const es = new EventSource(`${SERVER_URL}/api/singleplayer/events/${data.sessionId}`);
      es.onmessage = (event) => {
        const { action, data: eventData } = JSON.parse(event.data);
        if (action === 'botThinking') {
          setBotAction({ type: 'thinking', botName: eventData.botName });
        } else if (action === 'botAction') {
          setBotAction({
            type: 'action',
            botName: eventData.botName,
            action: eventData.action,
            card: eventData.card
          });
          setGameState(eventData.gameState);
          setTimeout(() => setBotAction(null), 1500);
        } else if (action === 'gameDraw') {
          setMessage(eventData.message);
          setTimeout(() => setWinner({ name: 'Draw', isDraw: true }), 2000);
        }
      };
      setEventSource(es);
    } catch (error) {
      showError('Failed to start single player game');
    }
  };

  const startUnoFlipSinglePlayer = async (playerName) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/unoflip/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });
      const data = await response.json();
      setSessionId(data.sessionId);
      const { sessionId: sid, ...gameStateData } = data;
      setGameState(gameStateData);
      setGameMode('playing-single');

      const es = new EventSource(`${SERVER_URL}/api/unoflip/events/${data.sessionId}`);
      es.onmessage = (event) => {
        const { action, data: eventData } = JSON.parse(event.data);
        if (action === 'botThinking') {
          setBotAction({ type: 'thinking', botName: eventData.botName });
        } else if (action === 'botAction') {
          setBotAction({
            type: 'action',
            botName: eventData.botName,
            action: eventData.action,
            card: eventData.card
          });
          setGameState(eventData.gameState);
          setTimeout(() => setBotAction(null), 1500);
        } else if (action === 'roundEnd') {
          setRoundEndInfo(eventData);
          setTimeout(() => setRoundEndInfo(null), 2500);
        } else if (action === 'newRound') {
          setGameState(eventData.gameState);
          setRoundEndInfo(null);
          setSelectedCard(null);
        } else if (action === 'gameOver') {
          setWinner({ name: eventData.winnerName, isDraw: false, score: eventData.winnerScore });
        } else if (action === 'gameDraw') {
          setMessage(eventData.message);
          setTimeout(() => setWinner({ name: 'Draw', isDraw: true }), 2000);
        }
      };
      setEventSource(es);
    } catch (error) {
      showError('Failed to start single player game');
    }
  };

  const registerSocketListeners = (newSocket) => {
    newSocket.on('roomCreated', ({ roomCode, isHost, gameType }) => {
      setGameType(gameType);
      setRoomCode(roomCode);
      setIsHost(isHost);
      setGameMode('waiting');
    });

    newSocket.on('roomJoined', ({ roomCode, isHost, gameType }) => {
      setGameType(gameType);
      setRoomCode(roomCode);
      setIsHost(isHost);
      setGameMode('waiting');
    });

    newSocket.on('roomUpdate', ({ players, canStart }) => {
      setWaitingRoomPlayers(players);
      setCanStart(canStart);
    });

    newSocket.on('gameStarted', (state) => {
      setGameState(state);
      setGameMode('playing');
    });

    newSocket.on('gameStateUpdate', (state) => {
      setGameState(state);
      setSelectedCard(null);
    });

    newSocket.on('handLost', ({ loserName }) => {
      setMessage(`${loserName} lost a life!`);
      setTimeout(() => setMessage(''), 3000);
    });

    newSocket.on('gameOver', ({ winner }) => {
      setWinner(winner);
    });

    newSocket.on('unoFlipGameStarted', (state) => {
      setGameState(state);
      setGameMode('playing');
    });

    newSocket.on('unoFlipStateUpdate', (state) => {
      setGameState(state);
      setSelectedCard(null);
    });

    newSocket.on('unoFlipRoundEnd', (info) => {
      setRoundEndInfo(info);
      setTimeout(() => setRoundEndInfo(null), 2500);
    });

    newSocket.on('unoFlipGameOver', ({ winnerName, winnerScore }) => {
      setWinner({ name: winnerName, isDraw: false, score: winnerScore });
    });

    newSocket.on('unoFlipGameDraw', ({ message }) => {
      setMessage(message);
      setTimeout(() => setWinner({ name: 'Draw', isDraw: true }), 2000);
    });

    newSocket.on('error', ({ message }) => {
      showError(message);
    });

    newSocket.on('playerDisconnected', () => {
      setMessage('A player disconnected');
    });
  };

  const handleStartSinglePlayer = (game, playerName) => {
    setGameType(game);
    if (game === 'unoFlip') {
      startUnoFlipSinglePlayer(playerName);
    } else {
      startOnoSinglePlayer(playerName);
    }
  };

  const handleCreateRoom = (game, playerName) => {
    setGameType(game);
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    setGameMode('multiplayer');
    registerSocketListeners(newSocket);
    newSocket.on('connect', () => {
      newSocket.emit('createRoom', { playerName, gameType: game });
    });
  };

  const handleJoinRoom = (game, code, playerName) => {
    setGameType(game);
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    setGameMode('multiplayer');
    registerSocketListeners(newSocket);
    newSocket.on('connect', () => {
      newSocket.emit('joinRoom', { roomCode: code, playerName, gameType: game });
    });
  };

  const startMultiplayerGame = () => {
    if (socket) {
      socket.emit('startGame', roomCode);
    }
  };

  const playOnoCard = async () => {
    if (selectedCard === null) return;

    if (gameMode === 'playing-single') {
      setBotAction(null);
      try {
        const response = await fetch(`${SERVER_URL}/api/singleplayer/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardIndex: selectedCard, sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else if (data.gameDraw) {
          setGameState(data.gameState);
          setMessage(data.message);
          setTimeout(() => setWinner({ name: 'Draw', isDraw: true }), 2000);
        } else {
          setGameState(data.gameState);
          setSelectedCard(null);
          if (data.handLost) {
            setMessage(`${data.loserName} lost a life!`);
            setTimeout(async () => {
              setMessage('');
              if (data.gameOver) {
                setWinner(data.winner);
              } else {
                setMessage('New hand starting...');
                await new Promise(resolve => setTimeout(resolve, 500));
                const stateResponse = await fetch(`${SERVER_URL}/api/singleplayer/state`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId })
                });
                const newState = await stateResponse.json();
                setGameState(newState);
                setMessage('');
              }
            }, 3000);
          }
        }
      } catch (error) {
        showError('Failed to play card');
      }
    } else if (socket) {
      socket.emit('playCard', { roomCode, cardIndex: selectedCard });
    }
  };

  const playUnoFlipCard = async () => {
    if (selectedCard === null) return;

    if (gameMode === 'playing-single') {
      setBotAction(null);
      try {
        const response = await fetch(`${SERVER_URL}/api/unoflip/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardIndex: selectedCard, sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else if (data.roundEnd) {
          setGameState(data.gameState);
          setSelectedCard(null);
          setRoundEndInfo(data.roundEnd);
          setTimeout(() => setRoundEndInfo(null), 2500);
        } else {
          setGameState(data.gameState);
          setSelectedCard(null);
        }
      } catch (error) {
        showError('Failed to play card');
      }
    } else if (socket) {
      socket.emit('unoFlipPlayCard', { roomCode, cardIndex: selectedCard });
    }
  };

  const chooseUnoFlipColor = async (color) => {
    if (gameMode === 'playing-single') {
      try {
        const response = await fetch(`${SERVER_URL}/api/unoflip/choose-color`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color, sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else if (data.roundEnd) {
          setGameState(data.gameState);
          setRoundEndInfo(data.roundEnd);
          setTimeout(() => setRoundEndInfo(null), 2500);
        } else {
          setGameState(data.gameState);
        }
      } catch (error) {
        showError('Failed to choose color');
      }
    } else if (socket) {
      socket.emit('unoFlipChooseColor', { roomCode, color });
    }
  };

  const drawUnoFlipCard = async () => {
    if (gameMode === 'playing-single') {
      try {
        const response = await fetch(`${SERVER_URL}/api/unoflip/draw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else if (data.gameDraw) {
          setMessage(data.message);
          setTimeout(() => setWinner({ name: 'Draw', isDraw: true }), 2000);
        } else {
          setGameState(data.gameState);
          setSelectedCard(null);
        }
      } catch (error) {
        showError('Failed to draw card');
      }
    } else if (socket) {
      socket.emit('unoFlipDrawCard', roomCode);
    }
  };

  const passUnoFlipTurn = async () => {
    if (gameMode === 'playing-single') {
      try {
        const response = await fetch(`${SERVER_URL}/api/unoflip/pass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else {
          setGameState(data.gameState);
          setSelectedCard(null);
        }
      } catch (error) {
        showError('Failed to pass turn');
      }
    } else if (socket) {
      socket.emit('unoFlipPass', roomCode);
    }
  };

  const callUno = async () => {
    if (gameMode === 'playing-single') {
      try {
        const response = await fetch(`${SERVER_URL}/api/unoflip/call-uno`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else {
          setGameState(data.gameState);
        }
      } catch (error) {
        showError('Failed to call UNO');
      }
    } else if (socket) {
      socket.emit('unoFlipCallUno', roomCode);
    }
  };

  const drawOnoCard = async () => {
    setMessage('Cards are drawn automatically after playing');
    setTimeout(() => setMessage(''), 2000);
  };

  const discardFourOno99 = async () => {
    if (gameMode === 'playing-single') {
      try {
        const response = await fetch(`${SERVER_URL}/api/singleplayer/discard-ono99`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await response.json();
        if (data.error) {
          showError(data.error);
        } else {
          setGameState(data);
        }
      } catch (error) {
        showError('Failed to discard ONO 99 cards');
      }
    } else if (socket) {
      socket.emit('discardFourOno99', roomCode);
    }
  };

  const backToMenu = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setGameMode('menu');
    setGameType(null);
    setGameState(null);
    setSelectedCard(null);
    setRoomCode('');
    setIsHost(false);
    setWaitingRoomPlayers([]);
    setCanStart(false);
    setMessage('');
    setWinner(null);
    setSessionId(null);
    setBotAction(null);
    setRoundEndInfo(null);
  };

  const isUnoFlip = gameType === 'unoFlip';

  return (
    <div className="app">
      {message && (
        <div className={`message ${message.includes('Failed') || message.includes('error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {gameMode === 'menu' && (
        <Menu
          onStartSinglePlayer={handleStartSinglePlayer}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {gameMode === 'multiplayer' && (
        <div className="waiting-room">
          <h2>Connecting...</h2>
          <p>Please wait while we set up your room</p>
        </div>
      )}

      {gameMode === 'waiting' && (
        <WaitingRoom
          roomCode={roomCode}
          players={waitingRoomPlayers}
          isHost={isHost}
          canStart={canStart}
          onStartGame={startMultiplayerGame}
          minPlayers={isUnoFlip ? 2 : 3}
          maxPlayers={isUnoFlip ? 4 : 6}
        />
      )}

      {(gameMode === 'playing' || gameMode === 'playing-single') && gameState && !isUnoFlip && (
        <GameBoard
          gameState={gameState}
          onPlayCard={playOnoCard}
          onDrawCard={drawOnoCard}
          onDiscardFourOno99={discardFourOno99}
          selectedCard={selectedCard}
          onSelectCard={setSelectedCard}
          botAction={botAction}
        />
      )}

      {(gameMode === 'playing' || gameMode === 'playing-single') && gameState && isUnoFlip && (
        <UnoFlipGameBoard
          gameState={gameState}
          onPlayCard={playUnoFlipCard}
          onDrawCard={drawUnoFlipCard}
          onPass={passUnoFlipTurn}
          onCallUno={callUno}
          onChooseColor={chooseUnoFlipColor}
          selectedCard={selectedCard}
          onSelectCard={setSelectedCard}
          botAction={botAction}
          roundEndInfo={roundEndInfo}
        />
      )}

      {winner && (
        <GameOver winner={winner} onBackToMenu={backToMenu} />
      )}
    </div>
  );
}

export default App;
