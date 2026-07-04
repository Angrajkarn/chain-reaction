# Chain Reaction — Project Master Document

> **Last Updated:** 2026-07-03  
> **Status:** ✅ Completed  
> **Platform:** Android + iOS (Expo)  
> **Stack:** Expo + React Native + TypeScript + Node.js + Socket.IO + Zustand

---

## 📁 Project Structure

```
chain-reaction/
├── project.md                  ← THIS FILE (always update on any change)
├── .gitignore                  ← Global gitignore rules
│
├── client/                     ← Expo React Native app
│   ├── app/                    ← Expo Router screens
│   │   ├── _layout.tsx         ← Root layout with navigation
│   │   ├── index.tsx           ← Splash screen
│   │   ├── home.tsx            ← Home screen
│   │   ├── create-room.tsx     ← Create Room screen
│   │   ├── join-room.tsx       ← Join Room screen
│   │   ├── waiting.tsx         ← Waiting for opponent screen
│   │   └── game.tsx            ← Game screen
│   │
│   ├── components/             ← Reusable UI components
│   │   ├── Button.tsx          ← Premium gradient button
│   │   ├── Input.tsx           ← Styled text input
│   │   ├── GlassCard.tsx       ← Glassmorphism card
│   │   ├── GameBoard.tsx       ← Main game board (9x6)
│   │   ├── Cell.tsx            ← Individual board cell
│   │   ├── Orb.tsx             ← Animated glowing orb (1/2/3)
│   │   ├── Explosion.tsx       ← Explosion animation
│   │   ├── Header.tsx          ← Game header (players + turn)
│   │   ├── WaitingScreen.tsx   ← Waiting for opponent component
│   │   ├── WinnerModal.tsx     ← Winner popup with confetti
│   │   ├── SettingsModal.tsx   ← Settings overlay
│   │   └── ParticleBackground.tsx ← Animated particle background
│   │
│   ├── hooks/                  ← Custom React hooks
│   │   ├── useSocket.ts        ← Socket.IO connection hook
│   │   ├── useGame.ts          ← Game logic hook
│   │   ├── useHaptics.ts       ← Haptic feedback hook
│   │   └── useSound.ts         ← Sound effects hook
│   │
│   ├── store/                  ← Zustand state management
│   │   ├── gameStore.ts        ← Game state (board, players, turn)
│   │   └── settingsStore.ts    ← Settings state (sound, haptics, etc.)
│   │
│   ├── services/               ← API and socket services
│   │   ├── socket.ts           ← Socket.IO client singleton
│   │   └── api.ts              ← REST API calls
│   │
│   ├── utils/                  ← Utilities
│   │   ├── gameEngine.ts       ← Chain Reaction game logic (pure)
│   │   └── helpers.ts          ← General helpers
│   │
│   ├── constants/              ← App-wide constants
│   │   ├── colors.ts           ← Neon color palette
│   │   ├── theme.ts            ← Typography, spacing, shadows
│   │   └── config.ts           ← Server URL, game config
│   │
│   ├── types/                  ← TypeScript interfaces
│   │   └── index.ts            ← All shared types
│   │
│   ├── assets/                 ← Static assets
│   │   ├── sounds/             ← Audio files (tap, explosion, etc.)
│   │   └── images/             ← App icons, splashes
│   │
│   ├── app.json                ← Expo config
│   ├── package.json
│   ├── tsconfig.json
│   └── babel.config.js
│
├── backend/                    ← Node.js + Socket.IO server
│   ├── src/
│   │   ├── index.ts            ← Express + Socket.IO server entry
│   │   ├── routes/
│   │   │   └── room.ts         ← REST API routes
│   │   ├── controllers/
│   │   │   └── roomController.ts ← Room API handlers
│   │   ├── socket/
│   │   │   └── socketHandler.ts  ← All Socket.IO event handlers
│   │   ├── services/
│   │   │   ├── roomService.ts  ← Room management logic
│   │   │   └── gameService.ts  ← Server-side game validation
│   │   ├── game/
│   │   │   └── gameEngine.ts   ← Server-side Chain Reaction engine
│   │   ├── middleware/
│   │   │   └── validate.ts     ← Input validation middleware
│   │   └── utils/
│   │       └── codeGen.ts      ← Room code generator
│   ├── package.json
│   └── tsconfig.json
│
└── README.md                   ← Setup & deployment guide
```

---

## 🎮 Game Mechanics

| Cell Type | Critical Mass |
| --------- | ------------- |
| Corner    | 2             |
| Edge      | 3             |
| Center    | 4             |

### Rules

- Players alternate turns (P1 = Red, P2 = Green)
- Only current player can tap cells
- Tapping a cell adds one orb of your color
- When critical mass is reached → explosion → adjacent cells gain 1 orb and turn your color
- Chain reactions continue recursively until stable
- A player wins when ALL orbs on the board belong to them (after each player has taken ≥1 turn)

---

## 🌐 Socket Events

| Event           | Direction       | Description               |
| --------------- | --------------- | ------------------------- |
| `create-room`   | Client → Server | Create a new private room |
| `join-room`     | Client → Server | Join with room code       |
| `player-joined` | Server → Client | Notify both players       |
| `player-left`   | Server → Client | Notify remaining player   |
| `move`          | Client → Server | Submit a move (row, col)  |
| `board-update`  | Server → Client | Broadcast new board state |
| `turn-change`   | Server → Client | Whose turn it is          |
| `restart`       | Client → Server | Request play again        |
| `game-over`     | Server → Client | Announce winner           |
| `disconnect`    | Socket built-in | Handle disconnection      |
| `reconnect`     | Client → Server | Restore game state        |

---

## 📦 Dependencies

### Client

| Package                 | Purpose                      |
| ----------------------- | ---------------------------- |
| expo                    | Core framework               |
| expo-router             | File-based navigation        |
| react-native-reanimated | Animations                   |
| react-native-svg        | SVG orbs and explosions      |
| socket.io-client        | Realtime communication       |
| zustand                 | State management             |
| expo-av                 | Sound effects                |
| expo-haptics            | Haptic feedback              |
| expo-clipboard          | Copy room code               |
| expo-sharing            | Share room code              |
| expo-linear-gradient    | Gradient backgrounds/buttons |

### Backend

| Package   | Purpose            |
| --------- | ------------------ |
| express   | HTTP server        |
| socket.io | WebSocket server   |
| cors      | CORS middleware    |
| uuid      | Room ID generation |
| ts-node   | TypeScript runtime |

---

## 🚀 Running the Project

```bash
# Install backend
cd backend && npm install && npm run dev

# Install client (in new terminal)
cd client && npm install && npx expo start
```

---

## 📋 Build Status

| Component           | Status  |
| ------------------- | ------- |
| Project setup       | ✅ Done |
| Backend server      | ✅ Done |
| Socket.IO events    | ✅ Done |
| Game engine         | ✅ Done |
| TypeScript types    | ✅ Done |
| Constants/Theme     | ✅ Done |
| Zustand stores      | ✅ Done |
| Socket service      | ✅ Done |
| ParticleBackground  | ✅ Done |
| Button component    | ✅ Done |
| Input component     | ✅ Done |
| GlassCard component | ✅ Done |
| Orb component       | ✅ Done |
| Explosion component | ✅ Done |
| Cell component      | ✅ Done |
| GameBoard component | ✅ Done |
| Header component    | ✅ Done |
| WinnerModal         | ✅ Done |
| SettingsModal       | ✅ Done |
| Splash screen       | ✅ Done |
| Home screen         | ✅ Done |
| Create Room screen  | ✅ Done |
| Join Room screen    | ✅ Done |
| Waiting screen      | ✅ Done |
| Game screen         | ✅ Done |
| How to Play screen  | ✅ Done |
| useSocket hook      | ✅ Done |
| useGame hook        | ✅ Done |
| useHaptics hook     | ✅ Done |
| useSound hook       | ✅ Done |
| README              | ✅ Done |

---

## 🔧 Configuration

- **Server URL (dev):** `http://localhost:3001`
- **Board:** 9 columns × 6 rows
- **Room Code:** 6 uppercase alphanumeric characters
- **Max Players per Room:** 2
- **Room Inactivity Timeout:** 1 hour
