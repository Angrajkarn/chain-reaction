// ============================================================
// Chain Reaction — Shared Types (used by backend)
// ============================================================

export type Player = 1 | 2;

export interface OrbData {
  count: number;
  owner: Player | null;
}

export type BoardState = OrbData[][];

export interface PlayerInfo {
  id: string;       // socket id
  name: string;
  playerNumber: Player;
}

export interface Room {
  code: string;
  players: PlayerInfo[];
  board: BoardState;
  currentTurn: Player;
  gameStarted: boolean;
  gameOver: boolean;
  winner: Player | null;
  turnCount: number;         // total moves made in game
  createdAt: number;
  lastActivity: number;
}

export interface MovePayload {
  roomCode: string;
  row: number;
  col: number;
  playerId: string;
}

export interface CreateRoomPayload {
  playerName: string;
  rows?: number;
  cols?: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface GameOverPayload {
  winner: Player;
  winnerName: string;
}

export interface BoardUpdatePayload {
  board: BoardState;
  currentTurn: Player;
  turnCount: number;
}

export interface PlayerJoinedPayload {
  players: PlayerInfo[];
  gameStarted: boolean;
  board: BoardState;
  currentTurn: Player;
}

export interface ReconnectPayload {
  roomCode: string;
  playerId: string;
}

export interface ReconnectResponsePayload {
  success: boolean;
  board?: BoardState;
  currentTurn?: Player;
  players?: PlayerInfo[];
  playerNumber?: Player;
  message?: string;
}
