# ONO 99 - AI Development Specification (2022 Edition)

This `README.md` serves as a comprehensive system prompt and development specification for an AI to build a full-stack web application of the card game "ONO 99" (2022 Edition). 

## 🎯 Project Overview
Build a web-based digital version of the card game ONO 99. The game must support:
1. **Single Player Mode:** 1 Human vs 3 Computer Bots (Fixed 4-player game).
2. **Multiplayer Mode:** Real-time online play for 3 to 6 players via WebSockets.

**Crucial Constraint:** Do NOT use external image assets for cards. All cards must be created dynamically using CSS/HTML elements (border-radius, flexbox, typography, and colors).

## 🛠️ Technology Stack
*   **Frontend:** React.js or Vanilla JS (with a preference for React for state management), standard CSS/Tailwind for card UI.
*   **Backend:** Node.js with Express.
*   **Multiplayer:** Socket.io for real-time WebSocket communication.

---

## 📜 Game Rules & Logic (2022 Edition Strict Enforcement)

### 1. Deck Composition (Total 112 Cards)
Since the exact official distribution of all 112 cards isn't public, use this balanced distribution:
*   **Number Cards (0-10):** 74 cards total (approx. 7 of each for 1-10; 4 of the '0' card).
*   **Minus 10 (-10):** 10 cards.
*   **Reverse:** 8 cards.
*   **Play 2:** 10 cards.
*   **ONO 99:** 10 cards.

### 2. General Gameplay
*   **Lives:** Each player starts with 3 lives (tokens).
*   **Starting:** Dealer shuffles, deals 4 cards to each player. Top card forms the discard pile (start total = 0).
*   **Turn Sequence:**
    1.  Player plays a card to the discard pile.
    2.  Total is updated based on the card played.
    3.  Player MUST draw a card from the deck.
    *If a player forgets to draw and the next player finishes their turn, the first player plays the rest of the hand with one less card (Implement a "Draw" button separate from the "Play" action to enforce this mechanic).*
*   **Losing a Hand:** If a player plays a card that causes the total to reach or exceed **99**, they lose a life. The hand ends, and a new hand begins. Last player with lives wins the game.

### 3. Special Card Rules (2022 Edition)
*   **Number Cards (1-10):** Adds exactly that number to the total.
*   **0 Card (Orange):** Replaces the classic "Hold" card. Adds 0 to the total.
*   **Minus 10:** Subtracts 10 from the total. **Rule constraint:** The total CANNOT go below zero. If the total is 5, and -10 is played, the total becomes 0.
*   **Reverse:** Leaves total unaffected. Reverses play direction (Clockwise ↔ Counter-clockwise).
*   **Play 2:** Leaves total unaffected. Forces the next player to take two complete turns.
    *   *Deflection:* The affected player can play a `Reverse` to send the `Play 2` back, or immediately play another `Play 2` to end their turn and pass the double-turn penalty to the next player. 
    *   *Non-stacking:* Playing a `Play 2` on a `Play 2` does NOT make the next player take 4 turns; they only take 2.
*   **ONO 99:** Merely takes up space in the hand. If a player is forced to play it because they have no other valid moves, the total instantly becomes 99, and they lose the hand.
    *   **2022 Special Rule:** If a player accumulates exactly FOUR 'ONO 99' cards in their hand, they are permitted a special action: discard all 4 cards and draw 4 new cards.

---

## 🤖 Single Player: Bot Logic
When implementing the 3 bots for single-player mode, use the following heuristic AI:
1.  **If Total is low (< 50):** Play highest available number cards to dump them.
2.  **If Total is high (70 - 98):** 
    *   Prioritize `Minus 10`, `0`, or `Reverse`.
    *   Use `Play 2` defensively.
    *   Play the smallest possible number card if no special cards are available.
3.  **Four ONO 99s:** The bot must automatically trigger the discard/redraw rule if it draws 4 ONO 99 cards.
4.  **Drawing:** Bots will always "remember" to draw a card instantly after playing (delay 1 second for UX).

---

## 🌐 Multiplayer: WebSocket Architecture (Socket.io)

### Room Management
*   Players can create a room (generates a 4-character room code).
*   Other players can join via the room code (Max 6 players).
*   Host can start the game once at least 3 players are in the room.

### Required Socket Events
*   `Client->Server`: 
    *   `createRoom`, `joinRoom(roomCode, playerName)`
    *   `startGame`
    *   `playCard(cardId)`
    *   `drawCard()`
    *   `discardFourOno99()`
*   `Server->Client`:
    *   `roomUpdate(players, isHost)`
    *   `gameStateUpdate(stateObject)`
    *   `handLost(loserId)`
    *   `gameOver(winnerId)`

### Server Game State Object Structure
```json
{
  "total": 45,
  "direction": "clockwise",
  "turnIndex": 1,
  "pendingPlay2": false,
  "play2TurnsRemaining": 0,
  "discardPileTop": { "type": "number", "value": 7, "color": "blue" },
  "players": [
    {
      "id": "socket_id_1",
      "name": "Player 1",
      "lives": 3,
      "cardCount": 4,
      "hasDrawnThisTurn": true
    }
  ],
  "yourHand": [ ... ] 
}
```
*(Note: The server must never send full hands of other players to the client to prevent cheating.)*

---

## 🎨 UI/UX Guidelines: CSS-Only Cards

To fulfill the "no real assets" requirement, the AI must generate cards using HTML/CSS classes. 
Each card should be a styled `div` resembling a modern, sleek playing card.

**Card Styling Rules:**
*   **Dimensions:** Aspect ratio of 2.5:3.5 (e.g., width: 120px, height: 168px).
*   **Border:** `border-radius: 12px`, with a thick white border (`border: 6px solid white`).
*   **Inner background colors:**
    *   Number cards (1-10): Blue, Green, Red, or Yellow (randomly assigned or categorized).
    *   `0` Card: **Orange** (strictly required by 2022 rules).
    *   Special Cards (`Minus 10`, `Reverse`, `Play 2`): Purple or Teal.
    *   `ONO 99`: **Black** background, with bold red/white text.
*   **Typography:** Large centered text for the value/action. Small numbers in the top-left and bottom-right (inverted) corners, typical of standard playing cards.
*   **Interactivity:** Hover states (`transform: translateY(-10px)`), disabled states (greyed out if playing them would push the total to 99+ and the player has other valid cards). 
*   **Layout:** Use a responsive flexbox/grid layout. The current total should be prominently displayed in the center of the screen with a large font size.

## 🚀 Execution Instructions for AI
1. Initialize the Node.js/Express server and Socket.io environment.
2. Build the game logic engine handling the strict 2022 rules.
3. Build the single-player Bot logic.
4. Build the React (or Vanilla JS) frontend, focusing first on generating the CSS cards.
5. Connect the frontend to the backend via WebSockets.
6. Test edge cases: `Play 2` deflections, preventing negative totals, and the 4 `ONO 99` redraw rule.