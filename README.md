# Chain Reaction — Multiplayer Mobile Game

> A premium 2-player private multiplayer Chain Reaction game built with Expo React Native + Node.js + Socket.IO

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode (for device emulation) OR Expo Go app on your phone

---

## 📦 Installation

### 1. Backend (Socket.IO Server)

```bash
cd backend
npm install
npm run dev
```

Server starts on **http://localhost:3001**

### 2. Frontend (Expo App)

```bash
cd client
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a` for Android emulator, `i` for iOS simulator.

---

## 🎮 How to Play

1. One player opens the app and taps **Create Private Room**
2. A 6-character room code is generated (e.g., `A8KQX2`)
3. Share the code with your opponent
4. Opponent taps **Join Private Room** and enters the code
5. Game starts automatically when both players are in the room!

### Game Rules

| Cell Type | Position    | Critical Mass |
| --------- | ----------- | ------------- |
| Corner    | 4 corners   | 2 orbs        |
| Edge      | Outer edges | 3 orbs        |
| Center    | Inner cells | 4 orbs        |

- Place orbs on empty or your own cells
- When critical mass is reached → **EXPLOSION!**
- Explosions spread to neighboring cells and convert them to your color
- Chain reactions cascade until the board is stable
- **Win** by controlling ALL orbs on the board

---

## 🏗️ Project Structure

```
chain reaction/
├── project.md          ← Project tracker (always updated)
├── client/             ← Expo React Native app
│   ├── app/            ← Screens (Expo Router)
│   ├── components/     ← Reusable UI components
│   ├── hooks/          ← Custom React hooks
│   ├── store/          ← Zustand state management
│   ├── services/       ← Socket.IO + REST API
│   ├── utils/          ← Game engine + helpers
│   ├── constants/      ← Colors, theme, config
│   └── types/          ← TypeScript types
└── backend/            ← Node.js + Socket.IO server
    └── src/
        ├── game/       ← Game engine (server-side)
        ├── services/   ← Room management
        ├── socket/     ← Socket event handlers
        ├── routes/     ← REST API routes
        └── utils/      ← Code generator
```

---

## 🔧 Configuration

Edit `client/constants/config.ts`:

```ts
// For development (same WiFi network)
export const SERVER_URL = "http://YOUR_IP:3001";

// For production
export const SERVER_URL = "https://your-server.com";
```

> **Important**: Use your local IP address (not `localhost`) when testing on a physical device.
> Find it with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

---

## 🌐 Deployment

### Backend (Node.js)

Deploy to any Node.js host:

```bash
# Railway, Render, Fly.io, etc.
cd backend
npm run build
npm start
```

### Frontend

```bash
cd client
# Build for Android
npx expo build:android

# Build for iOS
npx expo build:ios

# Or use EAS Build (recommended)
npx eas build --platform all
```

---

## 🛡️ Security

- All moves validated **server-side** — clients cannot cheat
- Invalid moves are rejected with error messages
- Room codes are private — only users with the code can join
- 6-character alphanumeric codes with ~32^6 ≈ 1 billion combinations
- Rooms expire after 1 hour of inactivity

---

## 📱 Tech Stack

| Layer      | Technology                 |
| ---------- | -------------------------- |
| Framework  | Expo SDK 52 + React Native |
| Language   | TypeScript                 |
| Navigation | Expo Router                |
| State      | Zustand                    |
| Animations | React Native Reanimated    |
| Graphics   | React Native SVG           |
| Audio      | Expo AV                    |
| Haptics    | Expo Haptics               |
| Backend    | Node.js + Express          |
| Realtime   | Socket.IO                  |

---

## 🐛 Troubleshooting

**Socket can't connect?**

- Make sure backend is running on port 3001
- Update `SERVER_URL` in `client/constants/config.ts` with your IP
- Ensure both devices are on the same WiFi network

**Metro bundler issues?**

```bash
npx expo start --clear
```

**Module not found errors?**

```bash
cd client && rm -rf node_modules && npm install
```
