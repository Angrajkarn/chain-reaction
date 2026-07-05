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

      socket.emit('room-created', {
        roomCode: room.code,
        playerNumber: 1,
        playerName: playerInfo.name,
      });

      console.log(`[Room] Created: ${room.code} (${room.board[0]?.length || 6}x${room.board.length || 13}) by ${playerInfo.name}`);
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

      const playerInfo: PlayerInfo = {
        id: socket.id,
        name: playerName.trim().slice(0, 20),
        playerNumber: 2,
      };

      const result = joinRoom(roomCode.toUpperCase(), playerInfo);

      if ('error' in result) {
        socket.emit('join-error', { message: result.error });
        return;
      }

      socket.join(result.code);

      // Notify both players
      io.to(result.code).emit('player-joined', {
        players: result.players,
        gameStarted: result.gameStarted,
        board: result.board,
        currentTurn: result.currentTurn,
      });

      // Tell the joining player their number
      socket.emit('room-joined', {
        roomCode: result.code,
        playerNumber: 2,
        playerName: playerInfo.name,
      });

      console.log(`[Room] ${playerInfo.name} joined: ${result.code}`);
    } catch (err) {
      console.error('[join-room] Error:', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  // ─────────────────────────────────────────────
  // MOVE
  // ─────────────────────────────────────────────
  socket.on('move', ({ roomCode, row, col, playerId }: MovePayload) => {
    try {
      const room = getRoom(roomCode);

      // Security: validate room exists
      if (!room) {
        socket.emit('error', { message: 'Room not found.' });
        return;
      }

      // Security: validate it is this player's turn
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('error', { message: 'You are not in this room.' });
        return;
      }

      if (player.playerNumber !== room.currentTurn) {
        socket.emit('error', { message: 'Not your turn.' });
        return;
      }

      if (room.gameOver) {
        socket.emit('error', { message: 'Game is already over.' });
        return;
      }

      // Security: validate the move
      const validation = isValidMove(room.board, row, col, player.playerNumber);
      if (!validation.valid) {
        socket.emit('error', { message: validation.reason || 'Invalid move.' });
        return;
      }

      // Apply move
      const newBoard = applyMove(room.board, row, col, player.playerNumber as Player);
      const newTurnCount = room.turnCount + 1;
      const nextTurn: Player = room.currentTurn === 1 ? 2 : 1;
      const winner = checkWinner(newBoard, newTurnCount);

      // Persist state
      updateRoomBoard(roomCode, newBoard, nextTurn, newTurnCount, winner);

      // Broadcast updated board
      io.to(roomCode).emit('board-update', {
        board: newBoard,
        currentTurn: nextTurn,
        turnCount: newTurnCount,
        lastMove: { row, col, player: player.playerNumber },
      });

      // Broadcast turn change
      io.to(roomCode).emit('turn-change', { currentTurn: nextTurn });

      // Check for game over
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
      if (!room) {
        socket.emit('error', { message: 'Room not found.' });
        return;
      }

      // Both players must be present to restart
      if (room.players.length < 2) {
        socket.emit('error', { message: 'Waiting for opponent.' });
        return;
      }

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
  // RECONNECT — restore player to room
  // ─────────────────────────────────────────────
  socket.on('reconnect-to-room', ({ roomCode, playerNumber }: { roomCode: string; playerNumber: Player }) => {
    try {
      const room = getRoom(roomCode);
      if (!room) {
        socket.emit('reconnect-failed', { message: 'Room no longer exists.' });
        return;
      }

      // Update this player's socket ID
      const updatedRoom = updatePlayerSocketId(roomCode, playerNumber, socket.id);
      if (!updatedRoom) {
        socket.emit('reconnect-failed', { message: 'Could not reconnect.' });
        return;
      }

      socket.join(roomCode);

      socket.emit('reconnect-success', {
        board: updatedRoom.board,
        currentTurn: updatedRoom.currentTurn,
        players: updatedRoom.players,
        playerNumber,
        gameOver: updatedRoom.gameOver,
        winner: updatedRoom.winner,
      });

      // Notify opponent
      socket.to(roomCode).emit('opponent-reconnected', { playerNumber });

      console.log(`[Reconnect] Player ${playerNumber} reconnected to ${roomCode}`);
    } catch (err) {
      console.error('[reconnect-to-room] Error:', err);
    }
  });

  // ─────────────────────────────────────────────
  // DISCONNECT — graceful 30s grace period before cleanup
  // ─────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} reason=${reason}`);

    const room = findRoomByPlayerId(socket.id);
    if (!room) return;

    const playerName = room.players.find(p => p.id === socket.id)?.name ?? 'Opponent';

    // Notify opponent immediately so they see a warning
    socket.to(room.code).emit('player-left', { playerName, temporary: true });

    // ── Grace period: give the player 30 seconds to reconnect ──
    // We do NOT remove from room immediately. If they reconnect
    // within 30 seconds via 'reconnect-to-room', the room is intact.
    setTimeout(() => {
      const currentRoom = findRoomByPlayerId(socket.id);
      if (!currentRoom) return; // Already reconnected under new socket ID

      console.log(`[Room] Grace period expired for ${socket.id} in ${currentRoom.code}. Removing.`);
      socket.to(currentRoom.code).emit('player-left', { playerName, temporary: false });
      removePlayer(currentRoom.code, socket.id);
    }, 30_000); // 30-second grace period
  });
}
