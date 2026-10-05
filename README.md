# ONO 99 - Card Game (2022 Edition)

A full-stack web implementation of the ONO 99 card game with both single-player (vs AI bots) and multiplayer modes.

## Features

- **Single Player Mode**: Play against 3 AI bots with smart card-playing logic
- **Multiplayer Mode**: Real-time online play for 3-6 players via WebSockets
- **CSS-Only Cards**: All cards rendered dynamically with CSS gradients and styling
- **2022 Rules Implementation**: Full rule enforcement including special cards and mechanics

## Technology Stack

- **Frontend**: React.js with Socket.io client
- **Backend**: Node.js, Express, Socket.io
- **Styling**: Pure CSS with gradients and animations

## Installation

### 1. Install Backend Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

## Running the Application

### Option 1: Run Both Server and Client Separately

**Terminal 1 - Start the Backend Server:**
```bash
npm start
```
Server will run on `http://localhost:3001`

**Terminal 2 - Start the React Client:**
```bash
cd client
npm start
```
Client will run on `http://localhost:3000`

### Option 2: Run Both Concurrently (requires concurrently package)

```bash
npm run dev
```

## How to Play

### Game Objective
Be the last player with lives remaining. Players lose lives when they play a card that makes the total reach or exceed 99.

### Card Types

- **Number Cards (1-10)**: Add their value to the total
- **0 Card (Orange)**: Adds 0 to the total
- **Minus 10**: Subtracts 10 from the total (minimum 0)
- **Reverse**: Reverses play direction (clockwise ↔ counter-clockwise)
- **Play 2**: Forces the next player to take two complete turns
- **ONO 99**: Instantly sets total to 99 (you lose a life if you play it)

### Special Rules

1. **Draw Mechanism**: After playing a card, you MUST click "Draw Card" before your turn ends
2. **Four ONO 99 Rule**: If you collect exactly 4 ONO 99 cards, you can discard all 4 and draw 4 new cards
3. **Play 2 Deflection**: You can play a Reverse to send Play 2 back, or play another Play 2 to pass it forward

### Single Player Mode
- Play against 3 AI bots (Alice, Bob, Charlie)
- Bots use intelligent card-playing strategies
- Start immediately from the main menu

### Multiplayer Mode
1. **Create Room**: Host creates a 4-character room code
2. **Join Room**: Other players join using the room code
3. **Start Game**: Host starts when 3-6 players are ready
4. **Real-time Play**: All players see updates instantly via WebSockets

## Project Structure

```
ono-99/
├── server/
│   ├── index.js           # Express server + Socket.io + REST API
│   ├── gameEngine.js      # Core game logic
│   ├── singlePlayerGame.js # Single player game controller
│   └── botAI.js           # Bot decision-making logic
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Menu.js        # Main menu
│       │   ├── GameBoard.js   # Game interface
│       │   ├── Card.js        # Card component
│       │   ├── WaitingRoom.js # Multiplayer lobby
│       │   └── GameOver.js    # End game screen
│       ├── App.js         # Main React app
│       └── App.css        # All styling
├── package.json
└── README.md
```

## Game Rules (2022 Edition)

### Deck Composition (112 cards)
- Number Cards (1-10): 74 cards
- 0 Cards: 4 cards
- Minus 10: 10 cards
- Reverse: 8 cards
- Play 2: 10 cards
- ONO 99: 10 cards

### Gameplay
1. Each player starts with 3 lives and 4 cards
2. Players take turns playing one card
3. After playing, the player MUST draw a card
4. If the total reaches or exceeds 99, that player loses a life
5. Last player with lives wins

## Development Notes

- No external image assets used - all cards are pure CSS
- Bot AI uses heuristic strategies based on current total
- WebSocket events ensure real-time synchronization in multiplayer
- Session management for single-player games stored server-side

## Port Configuration

- Backend Server: `http://localhost:3001`
- Frontend Client: `http://localhost:3000`

To change ports, update:
- Server port: `server/index.js` (line: `const PORT = process.env.PORT || 3001`)
- Client API URL: `client/src/App.js` (line: `const SERVER_URL = 'http://localhost:3001'`)

## Browser Compatibility

Tested on modern browsers (Chrome, Firefox, Edge, Safari). Requires JavaScript enabled and WebSocket support for multiplayer mode.

## License

This is a demonstration project for educational purposes.
