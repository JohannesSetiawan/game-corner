# Feature Specification: Uno Flip! Gameplay Logic

## 1. Domain Models & State

### 1.1 Card Structure
Each physical card possesses two independent faces:
- **Light Side (`LIGHT`)**:
  - Colors: `RED`, `BLUE`, `YELLOW`, `GREEN`, or `NONE` (for unplayed Wilds).
  - Values / Symbols: Numbers `1`-`9`, `DRAW_ONE`, `SKIP`, `REVERSE`, `FLIP`, `WILD`, `WILD_DRAW_TWO`.
- **Dark Side (`DARK`)**:
  - Colors: `TEAL`, `ORANGE`, `PINK`, `PURPLE`, or `NONE` (for unplayed Wilds).
  - Values / Symbols: Numbers `1`-`9`, `DRAW_FIVE`, `SKIP_EVERYONE`, `REVERSE`, `FLIP`, `WILD`, `WILD_DRAW_COLOR`.

### 1.2 Game State
- `active_side`: Enum (`LIGHT` | `DARK`). Initialized to `LIGHT`.
- `play_direction`: Integer (`+1` for Clockwise, `-1` for Counter-Clockwise). Initialized to `+1`.
- `current_player_index`: Index of the player whose turn it is.
- `stockpile`: Ordered stack of dual-sided cards.
- `discard_pile`: Ordered stack of dual-sided cards.
- `active_color`: The currently active color to match (set by played card or declared via Wild).
- `active_symbol`: The currently active symbol or number to match.
- `players`: Ordered list of player entities.
  - `hand`: List of dual-sided cards.
  - `uno_called`: Boolean tracking if the player called Uno when holding 2 cards prior to playing.
  - `total_score`: Cumulative score across rounds.

---

## 2. Match & Round Initialization

1. **Game Setup**:
   - Scores reset to 0. Target score is 500 points.
2. **Round Setup**:
   - `active_side` is set to `LIGHT`.
   - `play_direction` is set to `+1` (Clockwise).
   - Decks are shuffled.
   - Deal 7 cards to each player. Card faces are oriented such that `LIGHT` faces the player and `DARK` faces away.
   - Draw 1 card from `stockpile` to form the top of the `discard_pile`.
     - If the top card is a Wild card, the first player chooses the starting color.
     - If the top card is an Action card (Draw One, Skip, Reverse, Flip), apply its effect as if played by the dealer onto the first player.

---

## 3. Turn Progression & Play Rules

### 3.1 Turn Steps
On a player's turn:
1. **Play a Card**:
   - A card from hand can be played if its active face matches:
     - The `active_color`, OR
     - The `active_symbol` (matching number or action type), OR
     - It is a Wild card (`WILD`, `WILD_DRAW_TWO`, or `WILD_DRAW_COLOR`).
2. **Draw a Card**:
   - If no valid card can be played (or the player opts not to play), the player draws the top card from the `stockpile`.
   - If that drawn card is legally playable, the player may play it immediately on the same turn. Otherwise, the turn passes.
3. **End of Turn**:
   - Advance `current_player_index` by `play_direction`, wrapping modulo total player count.

### 3.2 Legality Restrictions on Wild Draw Cards
- `WILD_DRAW_TWO` (Light) and `WILD_DRAW_COLOR` (Dark) may **only** be played if the player holds **no cards** in their active hand matching the current `active_color`.
- (Holding matching numbers/actions of a different color or other Wilds does not restrict this play).

---

## 4. Action Card Resolution

All actions evaluate against the current `active_side`:

### 4.1 Light Side Actions
- **Draw One**:
  - Target: Next player in sequence.
  - Effect: Target draws 1 card from `stockpile` and loses their turn.
- **Skip**:
  - Target: Next player in sequence.
  - Effect: Target's turn is skipped.
- **Reverse**:
  - Effect: Invert `play_direction` (`play_direction *= -1`). In a 2-player game, acts as a Skip.
- **Wild**:
  - Effect: Current player declares the new `active_color` (chosen from `RED`, `BLUE`, `YELLOW`, `GREEN`).
- **Wild Draw Two**:
  - Effect: Current player declares the new `active_color`. Next player draws 2 cards and loses their turn (subject to Challenge rules).
- **Flip**:
  - Effect: Trigger Global Flip sequence (see Section 5).

### 4.2 Dark Side Actions
- **Draw Five**:
  - Target: Next player in sequence.
  - Effect: Target draws 5 cards from `stockpile` and loses their turn.
- **Skip Everyone**:
  - Effect: Skips all remaining players; current player immediately takes another turn.
- **Reverse**:
  - Effect: Invert `play_direction` (`play_direction *= -1`). In a 2-player game, acts as a Skip.
- **Wild**:
  - Effect: Current player declares the new `active_color` (chosen from `TEAL`, `ORANGE`, `PINK`, `PURPLE`).
- **Wild Draw Color**:
  - Effect: Current player declares the new `active_color`. Next player must draw cards repeatedly from `stockpile` until drawing a card matching the declared color, then loses their turn (subject to Challenge rules).
- **Flip**:
  - Effect: Trigger Global Flip sequence (see Section 5).

---

## 5. Flip State Transition

When a `FLIP` card is played:
1. `active_side` toggles (`LIGHT -> DARK` or `DARK -> LIGHT`).
2. **Stockpile Inversion**:
   - The `stockpile` is turned upside down. The bottom card becomes the top card, and cards are drawn showing the newly active side.
3. **Discard Pile Inversion**:
   - The `discard_pile` is turned upside down. The original bottom card becomes the new top discard card.
   - Set `active_color` and `active_symbol` to the new top card's active face.
4. **Hands Inversion**:
   - All players invert their hands. The opposing face of each held card is now active and oriented toward the player.

---

## 6. Penalties & Challenge Subsystems

### 6.1 Uno Calling Rule
- When playing a card that leaves a player with exactly 1 card in hand, the player must call "Uno".
- **Penalty**: If the player fails to call "Uno" and is challenged by another player before the next player in sequence begins their turn (draws or plays a card), the offending player must draw 2 penalty cards immediately.

### 6.2 Wild Draw Challenges
When `WILD_DRAW_TWO` or `WILD_DRAW_COLOR` is played, the affected player may issue a challenge before drawing:
1. The challenged player privately reveals their active hand to the challenger.
2. **Outcome A — Illegal Play (Challenged player held a card matching the pre-play active color)**:
   - Challenge succeeds.
   - The challenged player must draw the cards dictated by the card (2 cards for `WILD_DRAW_TWO`; draw until declared color for `WILD_DRAW_COLOR`).
   - The challenger does not draw and proceeds with their normal turn.
3. **Outcome B — Legal Play (Challenged player did not hold the pre-play active color)**:
   - Challenge fails.
   - The challenger must draw the original required cards (`2` or `until matching color`) **plus 2 additional penalty cards**.
   - Challenger loses their turn.

---

## 7. Round Termination & Scoring

### 7.1 Round End Condition
- A round ends immediately when a player plays their final card ("goes out").
- **Forced Draw Resolution**: If the final played card requires the next player to draw (`DRAW_ONE`, `DRAW_FIVE`, `WILD_DRAW_TWO`, `WILD_DRAW_COLOR`), the target player must complete all required draws before points are calculated.

### 7.2 Score Calculation
Points are awarded to the round winner based on the cards remaining in all opponents' hands, evaluated on the **active side at the conclusion of the round**:

| Card Type | Point Value |
| :--- | :--- |
| Number Cards (`1` - `9`) | Face Value |
| Draw One | 10 points |
| Draw Five | 20 points |
| Reverse | 20 points |
| Skip | 20 points |
| Flip | 20 points |
| Skip Everyone | 30 points |
| Wild | 40 points |
| Wild Draw Two | 50 points |
| Wild Draw Color | 60 points |

### 7.3 Game Win Condition
- Add round score to the winning player's `total_score`.
- If `total_score >= 500`, that player wins the game.
- If no player reaches 500, initiate a new round with `active_side = LIGHT`.