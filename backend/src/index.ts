// ============================================================
// Chain Reaction — Backend Entry Point (Enterprise Grade)
// Express + Socket.IO | Production-ready configuration
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomRoutes from './routes/room';
import { registerSocketHandlers } from './socket/socketHandler';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'production';

// ─── Express Setup ───────────────────────────────────────────
const app = express();

// CORS — allow all origins (React Native app)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50kb' }));

// ─── Security headers ────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ─── REST Routes ─────────────────────────────────────────────
app.use('/room', roomRoutes);

// Health check with server metrics
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: NODE_ENV,
    uptime: process.uptime(),
    time: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

// ─── Rotating Romantic Greeting Messages ─────────────────────
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
  "You are my favorite notification, always 🔔❤️",
  "Can't undo my feelings for you — and I don't want to 💝",
];

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
  // Low-latency, enterprise Socket.IO config
  pingTimeout: 20000,        // Detect dead connections in 20s
  pingInterval: 8000,        // Heartbeat every 8s — snappier than default 25s
  connectTimeout: 8000,      // Reject slow handshakes quickly
  httpCompression: true,     // Gzip HTTP polling responses
  perMessageDeflate: {       // Compress WebSocket frames
    threshold: 512,          // Only compress payloads > 512 bytes
  },
  maxHttpBufferSize: 1e5,    // 100KB max event payload — security cap
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
  upgradeTimeout: 5000,      // Upgrade from polling → WebSocket within 5s
  allowUpgrades: true,
});

// ─── Register all socket event handlers ──────────────────────
io.on('connection', socket => {
  console.log(`[WS] Connected: ${socket.id} | transport: ${socket.conn.transport.name}`);

  // Upgrade notification — log when client upgrades to WebSocket
  socket.conn.on('upgrade', (transport) => {
    console.log(`[WS] Upgraded: ${socket.id} → ${transport.name}`);
  });

  registerSocketHandlers(io, socket);
});

// ─── Start Server ─────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Chain Reaction [${NODE_ENV}] on port ${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   Room API: http://localhost:${PORT}/room/:code\n`);

  // ─── Self-ping keepalive ──────────────────────────────────
  // Render free tier sleeps after 15 minutes of inactivity.
  // Ping every 8 minutes to keep the server warm 24/7.
  const SELF_URL = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/health`);
      if (res.ok) {
        console.log('[Keepalive] ✓ OK');
      } else {
        console.warn('[Keepalive] ⚠ Non-200:', res.status);
      }
    } catch (e) {
      console.warn('[Keepalive] ✗ Failed:', (e as Error).message);
    }
  }, 8 * 60 * 1000); // Every 8 minutes
});

export { io };
