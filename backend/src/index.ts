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

// ─── HTTP + Socket.IO Server ─────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
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
});

export { io };
