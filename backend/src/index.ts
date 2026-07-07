// ============================================================
// Chain Reaction — Backend Entry Point
// Express + Socket.IO server
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomRoutes from './routes/room';
import { registerSocketHandlers } from './socket/socketHandler';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Express Setup ───────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// REST Routes
app.use('/room', roomRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Pool of rotating romantic banner messages — picked randomly each request
const ROMANTIC_MESSAGES = [
  "Missing you already, Booblie G 💕 Come play with me!",
  "Every move I make on this board, I think of you 💖",
  "This game was built for only one reason — to play with you 🥰",
  "You're my Player 1, always. No matter who wins 👑❤️",
  "Distance means nothing when we're connected here 🌟",
  "In a world full of glitches, you're my favorite feature 💻❤️",
  "I'd lose every match just to see you smile, Booblie 🌸",
  "You make every round worth playing 💞",
  "Warning: Opponent too cute. Defensive mode: Disabled 😍",
  "My heart has zero latency for you ❤️📶",
  "This board resets, but my love for you never does 💫",
  "You're the chain reaction I never want to stop 🔥💕",
  "Even the grid knows — every cell belongs to you 💖",
  "No better opponent, no better person — it's always you 🥰",
];

// Greeting banner message — rotates randomly on each request
app.get('/greeting', (_req, res) => {
  const msg = ROMANTIC_MESSAGES[Math.floor(Math.random() * ROMANTIC_MESSAGES.length)];
  res.json({ message: msg });
});

// ─── HTTP + Socket.IO Server ─────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,   // Detect dead connections faster (was 60s)
  pingInterval: 10000,  // Ping clients every 10s (was 25s)
  connectTimeout: 10000,
});

// ─── Register all socket event handlers ──────────────────────
io.on('connection', socket => {
  registerSocketHandlers(io, socket);
});

// ─── Start Server ─────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Chain Reaction server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Room API: http://localhost:${PORT}/room/:code\n`);

  // ─── Self-ping keepalive: prevents Render free tier from sleeping ──
  // Pings the health endpoint every 10 minutes to keep the server warm.
  const SELF_URL = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      await fetch(`${SELF_URL}/health`);
      console.log('[Keepalive] Self-ping OK');
    } catch (e) {
      console.warn('[Keepalive] Self-ping failed:', e);
    }
  }, 10 * 60 * 1000); // Every 10 minutes
});

export { io };
