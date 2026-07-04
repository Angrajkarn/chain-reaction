// ============================================================
// Room Service — manages all rooms in memory
// ============================================================

import { Room, PlayerInfo, Player, BoardState } from '../types';
import { generateRoomCode } from '../utils/codeGen';
import { createEmptyBoard } from '../game/gameEngine';

const rooms = new Map<string, Room>();
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Clean up inactive rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > INACTIVITY_TIMEOUT) {
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

/**
 * Creates a new room and returns its code.
 * Optionally configures dynamic grid dimensions (rows x cols).
 */
export function createRoom(player: PlayerInfo, rows?: number, cols?: number): Room {
  const existingCodes = new Set(rooms.keys());
  const code = generateRoomCode(existingCodes);

  const room: Room = {
    code,
    players: [player],
    board: createEmptyBoard(rows, cols),
    currentTurn: 1,
    gameStarted: false,
    gameOver: false,
    winner: null,
    turnCount: 0,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

/**
 * Adds a player to an existing room.
 * Returns the updated room or an error string.
 */
export function joinRoom(
  code: string,
  player: PlayerInfo
): Room | { error: string } {
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return { error: 'Room does not exist.' };
  }

  if (room.players.length >= 2) {
    return { error: 'Room already has two players.' };
  }

  room.players.push(player);
  room.gameStarted = true;
  room.lastActivity = Date.now();
  return room;
}

/**
 * Retrieves a room by code.
 */
export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

/**
 * Updates board state in room.
 */
export function updateRoomBoard(
  code: string,
  board: BoardState,
  currentTurn: Player,
  turnCount: number,
  winner: Player | null
): void {
  const room = rooms.get(code);
  if (!room) return;
  room.board = board;
  room.currentTurn = currentTurn;
  room.turnCount = turnCount;
  room.gameOver = winner !== null;
  room.winner = winner;
  room.lastActivity = Date.now();
}

/**
 * Removes a player from a room.
 */
export function removePlayer(code: string, playerId: string): Room | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  room.players = room.players.filter(p => p.id !== playerId);
  room.lastActivity = Date.now();

  // If both players left, delete room
  if (room.players.length === 0) {
    rooms.delete(code);
    return undefined;
  }

  return room;
}

/**
 * Resets a room for a new game.
 * Automatically preserves the grid dimensions of the original board setup.
 */
export function resetRoom(code: string): Room | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  const rows = room.board.length;
  const cols = room.board[0]?.length || 6;

  room.board = createEmptyBoard(rows, cols);
  room.currentTurn = 1;
  room.gameStarted = true;
  room.gameOver = false;
  room.winner = null;
  room.turnCount = 0;
  room.lastActivity = Date.now();

  return room;
}

/**
 * Updates a player's socket ID (on reconnect).
 */
export function updatePlayerSocketId(
  code: string,
  playerNumber: Player,
  newSocketId: string
): Room | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  const player = room.players.find(p => p.playerNumber === playerNumber);
  if (player) {
    player.id = newSocketId;
    room.lastActivity = Date.now();
  }

  return room;
}

/**
 * Find which room a socket belongs to.
 */
export function findRoomByPlayerId(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === socketId)) {
      return room;
    }
  }
  return undefined;
}

/**
 * REST API: list room info (sanitized).
 */
export function getRoomInfo(code: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  return {
    code: room.code,
    playerCount: room.players.length,
    gameStarted: room.gameStarted,
    gameOver: room.gameOver,
  };
}
