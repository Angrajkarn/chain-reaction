// ============================================================
// Socket.IO Event Handler — All game events
// ============================================================

import { Server, Socket } from 'socket.io';
import {
  createRoom,
  joinRoom,
  getRoom,
  updateRoomBoard,
  removePlayer,
  resetRoom,
  findRoomByPlayerId,
  updatePlayerSocketId,
} from '../services/roomService';
import { applyMove, checkWinner, isValidMove } from '../game/gameEngine';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  MovePayload,
  Player,
  PlayerInfo,
} from '../types';

export function registerSocketHandlers(io: Server, socket: Socket): void {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ─── Per-socket move rate limiter ─────────────────────────
  // Prevents move spam — min 150ms between accepted moves per player
  let lastMoveTime = 0;
  const MOVE_RATE_LIMIT_MS = 150;

  // ─────────────────────────────────────────────
  // CREATE ROOM
  // ─────────────────────────────────────────────
  socket.on('create-room', ({ playerName, rows, cols }: CreateRoomPayload) => {
    try {
      if (!playerName || playerName.trim().length === 0) {
        socket.emit('error', { message: 'Player name is required.' });
        return;
      }

      const playerInfo: PlayerInfo = {
        id: socket.id,
        name: playerName.trim().slice(0, 20),
        playerNumber: 1,
      };

      const room = createRoom(playerInfo, rows, cols);
      socket.join(room.code);

      // Store on socket instance for later restoration
      (socket.data as any).roomCode = room.code;
      (socket.data as any).playerNumber = 1;

      socket.emit('room-created', {
        roomCode: room.code,
        playerNumber: 1,
        playerName: playerInfo.name,
      });

      console.log(`[Room] Created: ${room.code} by ${playerInfo.name}`);
    } catch (err) {
      console.error('[create-room] Error:', err);
      socket.emit('error', { message: 'Failed to create room.' });
    }
  });

  // ─────────────────────────────────────────────
  // JOIN ROOM
  // ─────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName }: JoinRoomPayload) => {
    try {
      if (!playerName || playerName.trim().length === 0) {
        socket.emit('error', { message: 'Player name is required.' });
        return;
      }

      if (!roomCode || roomCode.length !== 6) {
        socket.emit('join-error', { message: 'Invalid room code.' });
        return;
      }

      const upperCode = roomCode.toUpperCase();
      const existingRoom = getRoom(upperCode);

      if (!existingRoom) {
        socket.emit('join-error', { message: 'Room does not exist.' });
        return;
      }

      // ── Stale socket eviction ─────────────────────────────────
      // If the room already shows 2 players but player 2's socket is
      // gone (disconnected / stale), evict them so the new join works.
      if (existingRoom.players.length >= 2) {
        const p2 = existingRoom.players.find(p => p.playerNumber === 2);
        if (p2) {
          const p2Socket = io.sockets.sockets.get(p2.id);
          if (!p2Socket || !p2Socket.connected) {
            console.log(`[Room] Evicting stale P2 (${p2.id}) from room ${upperCode}`);
            removePlayer(upperCode, p2.id);
          } else {
            socket.emit('join-error', { message: 'Room already has two players.' });
            return;
          }
        }
      }

      const playerInfo: PlayerInfo = {
        id: socket.id,
        name: playerName.trim().slice(0, 20),
        playerNumber: 2,
      };

      const result = joinRoom(upperCode, playerInfo);

      if ('error' in result) {
        socket.emit('join-error', { message: result.error });
        return;
      }

      socket.join(result.code);
      (socket.data as any).roomCode = result.code;
      (socket.data as any).playerNumber = 2;

      // ── Re-sync Player 1 into the Socket.IO room channel ──────
      // If P1 reconnected after creating the room, their new socket
      // lost its Socket.IO room membership. Force them back in so
      // they receive the player-joined broadcast.
      const p1 = result.players.find(p => p.playerNumber === 1);
      if (p1) {
        const p1Socket = io.sockets.sockets.get(p1.id);
        if (p1Socket && p1Socket.connected) {
          p1Socket.join(result.code);
          console.log(`[Room] Re-synced P1 (${p1.id}) into channel ${result.code}`);
        }
      }

      // ── CRITICAL: Send room-joined to Player 2 FIRST ─────────
      // This ensures P2's roomCode and myPlayerNumber are stored in
      // the Zustand store BEFORE player-joined triggers navigation.
      socket.emit('room-joined', {
        roomCode: result.code,
        playerNumber: 2,
        playerName: playerInfo.name,
      });

      // Small delay ensures the room-joined state update is flushed
      // before player-joined fires and triggers router.push('/game')
      setTimeout(() => {
        // Broadcast to BOTH players — triggers navigation on both sides
        io.to(result.code).emit('player-joined', {
          players: result.players,
          gameStarted: result.gameStarted,
          board: result.board,
          currentTurn: result.currentTurn,
        });
      }, 100);

      console.log(`[Room] ${playerInfo.name} joined: ${result.code}`);
    } catch (err) {
      console.error('[join-room] Error:', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  // ─────────────────────────────────────────────
  // MOVE
  // ─────────────────────────────────────────────
  socket.on('move', ({ roomCode, row, col }: MovePayload) => {
    try {
      // ── Rate limit: reject moves fired too quickly ──────────
      const now = Date.now();
      if (now - lastMoveTime < MOVE_RATE_LIMIT_MS) {
        socket.emit('error', { message: 'Slow down! One move at a time.' });
        return;
      }
      lastMoveTime = now;

      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }

      const player = room.players.find(p => p.id === socket.id);
      if (!player) { socket.emit('error', { message: 'You are not in this room.' }); return; }
      if (player.playerNumber !== room.currentTurn) { socket.emit('error', { message: 'Not your turn.' }); return; }
      if (room.gameOver) { socket.emit('error', { message: 'Game is already over.' }); return; }

      const validation = isValidMove(room.board, row, col, player.playerNumber);
      if (!validation.valid) { socket.emit('error', { message: validation.reason || 'Invalid move.' }); return; }

      const newBoard = applyMove(room.board, row, col, player.playerNumber as Player);
      const newTurnCount = room.turnCount + 1;
      const nextTurn: Player = room.currentTurn === 1 ? 2 : 1;
      const winner = checkWinner(newBoard, newTurnCount);

      updateRoomBoard(roomCode, newBoard, nextTurn, newTurnCount, winner);

      // Emit board update and turn change atomically
      io.to(roomCode).emit('board-update', {
        board: newBoard,
        currentTurn: nextTurn,
        turnCount: newTurnCount,
        lastMove: { row, col, player: player.playerNumber },
      });
      io.to(roomCode).emit('turn-change', { currentTurn: nextTurn });

      if (winner !== null) {
        const winnerPlayer = room.players.find(p => p.playerNumber === winner);
        io.to(roomCode).emit('game-over', {
          winner,
          winnerName: winnerPlayer?.name ?? `Player ${winner}`,
        });
        console.log(`[Game] Winner in room ${roomCode}: Player ${winner} (${winnerPlayer?.name})`);
      }
    } catch (err) {
      console.error('[move] Error:', err);
      socket.emit('error', { message: 'Failed to process move.' });
    }
  });

  // ─────────────────────────────────────────────
  // RESTART
  // ─────────────────────────────────────────────
  socket.on('restart', ({ roomCode }: { roomCode: string }) => {
    try {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }
      if (room.players.length < 2) { socket.emit('error', { message: 'Waiting for opponent.' }); return; }

      const updatedRoom = resetRoom(roomCode);
      if (!updatedRoom) return;

      io.to(roomCode).emit('game-restarted', {
        board: updatedRoom.board,
        currentTurn: updatedRoom.currentTurn,
        players: updatedRoom.players,
      });
      console.log(`[Room] Restarted: ${roomCode}`);
    } catch (err) {
      console.error('[restart] Error:', err);
    }
  });

  // ─────────────────────────────────────────────
  // RECONNECT — restore player to existing room
  // ─────────────────────────────────────────────
  socket.on('reconnect-to-room', ({ roomCode, playerNumber }: { roomCode: string; playerNumber: Player }) => {
    try {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('reconnect-failed', { message: 'Room no longer exists.' }); return; }

      const updatedRoom = updatePlayerSocketId(roomCode, playerNumber, socket.id);
      if (!updatedRoom) { socket.emit('reconnect-failed', { message: 'Could not reconnect.' }); return; }

      socket.join(roomCode);
      (socket.data as any).roomCode = roomCode;
      (socket.data as any).playerNumber = playerNumber;

      socket.emit('reconnect-success', {
        board: updatedRoom.board,
        currentTurn: updatedRoom.currentTurn,
        players: updatedRoom.players,
        playerNumber,
        gameOver: updatedRoom.gameOver,
        winner: updatedRoom.winner,
      });

      socket.to(roomCode).emit('opponent-reconnected', { playerNumber });
      console.log(`[Reconnect] Player ${playerNumber} back in ${roomCode}`);
    } catch (err) {
      console.error('[reconnect-to-room] Error:', err);
    }
  });

  // ─────────────────────────────────────────────
  // DISCONNECT — 30s grace period before cleanup
  // ─────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} reason=${reason}`);

    const room = findRoomByPlayerId(socket.id);
    if (!room) return;

    const playerName = room.players.find(p => p.id === socket.id)?.name ?? 'Opponent';
    const savedSocketId = socket.id;
    const savedRoomCode = room.code;

    // Warn opponent immediately (temporary flag = brief drop)
    socket.to(savedRoomCode).emit('player-left', { playerName, temporary: true });

    // Give 30 seconds to reconnect before destroying their slot
    setTimeout(() => {
      const stillPresent = findRoomByPlayerId(savedSocketId);
      if (!stillPresent) return; // Already reconnected with new socket ID

      console.log(`[Room] Grace expired for ${savedSocketId} — removing from ${savedRoomCode}`);
      socket.to(savedRoomCode).emit('player-left', { playerName, temporary: false });
      removePlayer(savedRoomCode, savedSocketId);
    }, 30_000);
  });
}
