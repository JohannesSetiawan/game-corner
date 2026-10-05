import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Menu from './components/Menu';
import GameBoard from './components/GameBoard';
import WaitingRoom from './components/WaitingRoom';
import GameOver from './components/GameOver';

const SERVER_URL = 'http://localhost:3001';

function App() {
  const [gameMode, setGameMode] = useState('menu');
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

  const startSinglePlayer = async (playerName) => {
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
          
          setTimeout(() => {
            setBotAction(null);
          }, 1500);
        } else if (action === 'gameDraw') {
          setMessage(eventData.message);
          setTimeout(() => {
            setWinner({ name: 'Draw', isDraw: true });
          }, 2000);
        }
      };

      setEventSource(es);
    } catch (error) {
      setMessage('Failed to start single player game');
    }
  };

  const createRoom = (playerName) => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    setGameMode('multiplayer');

    newSocket.on('connect', () => {
      newSocket.emit('createRoom', playerName);
    });

    newSocket.on('roomCreated', ({ roomCode, isHost }) => {
      setRoomCode(roomCode);
      setIsHost(isHost);
      setGameMode('waiting');
    });

    newSocket.on('roomJoined', ({ roomCode, isHost }) => {
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

    newSocket.on('error', ({ message }) => {
      setMessage(message);
      setTimeout(() => setMessage(''), 3000);
    });

    newSocket.on('playerDisconnected', () => {
      setMessage('A player disconnected');
    });
  };

  const joinRoom = (code, playerName) => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    setGameMode('multiplayer');

    newSocket.on('connect', () => {
      newSocket.emit('joinRoom', { roomCode: code, playerName });
    });

    newSocket.on('roomCreated', ({ roomCode, isHost }) => {
      setRoomCode(roomCode);
      setIsHost(isHost);
      setGameMode('waiting');
    });

    newSocket.on('roomJoined', ({ roomCode, isHost }) => {
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

    newSocket.on('error', ({ message }) => {
      setMessage(message);
      setTimeout(() => setMessage(''), 3000);
    });

    newSocket.on('playerDisconnected', () => {
      setMessage('A player disconnected');
    });
  };

  const startMultiplayerGame = () => {
    if (socket) {
      socket.emit('startGame', roomCode);
    }
  };

  const playCard = async () => {
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
          setMessage(data.error);
          setTimeout(() => setMessage(''), 3000);
        } else if (data.gameDraw) {
          setGameState(data.gameState);
          setMessage(data.message);
          setTimeout(() => {
            setWinner({ name: 'Draw', isDraw: true });
          }, 2000);
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
        setMessage('Failed to play card');
      }
    } else if (socket) {
      socket.emit('playCard', { roomCode, cardIndex: selectedCard });
    }
  };

  const drawCard = async () => {
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
          setMessage(data.error);
          setTimeout(() => setMessage(''), 3000);
        } else {
          setGameState(data);
        }
      } catch (error) {
        setMessage('Failed to discard ONO 99 cards');
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
  };

  return (
    <div className="app">
      {message && (
        <div className={`message ${message.includes('Failed') || message.includes('error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {gameMode === 'menu' && (
        <Menu
          onStartSinglePlayer={startSinglePlayer}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
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
        />
      )}

      {(gameMode === 'playing' || gameMode === 'playing-single') && gameState && (
        <GameBoard
          gameState={gameState}
          onPlayCard={playCard}
          onDrawCard={drawCard}
          onDiscardFourOno99={discardFourOno99}
          selectedCard={selectedCard}
          onSelectCard={setSelectedCard}
          botAction={botAction}
        />
      )}

      {winner && (
        <GameOver winner={winner} onBackToMenu={backToMenu} />
      )}
    </div>
  );
}

export default App;
