// ============================================================
// Chain Reaction — Shared TypeScript Types (Client)
// ============================================================

export type Player = 1 | 2;

export interface OrbData {
  count: number;
  owner: Player | null;
}

export type BoardState = OrbData[][];

export interface PlayerInfo {
  id: string;
  name: string;
  playerNumber: Player;
}

export interface RoomState {
  code: string;
  players: PlayerInfo[];
  board: BoardState;
  currentTurn: Player;
  gameStarted: boolean;
  gameOver: boolean;
  winner: Player | null;
  turnCount: number;
}

// Socket event payloads
export interface RoomCreatedPayload {
  roomCode: string;
  playerNumber: Player;
  playerName: string;
  reconnectToken: string; // BUG-001
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerNumber: Player;
  playerName: string;
  reconnectToken: string; // BUG-001
}

export interface PlayerJoinedPayload {
  players: PlayerInfo[];
  gameStarted: boolean;
  board: BoardState;
  currentTurn: Player;
}

export interface BoardUpdatePayload {
  board: BoardState;
  currentTurn: Player;
  turnCount: number;
  lastMove?: { row: number; col: number; player: Player };
}

export interface GameOverPayload {
  winner: Player;
  winnerName: string;
}

export interface ReconnectSuccessPayload {
  board: BoardState;
  currentTurn: Player;
  players: PlayerInfo[];
  playerNumber: Player;
  gameOver: boolean;
  winner: Player | null;
}

export interface GameRestartedPayload {
  board: BoardState;
  currentTurn: Player;
  players: PlayerInfo[];
}

// Settings
export interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  animationQuality: 'low' | 'medium' | 'high';
  darkMode: boolean;
  gridSize: '6x13' | '7x15' | '8x16';
}

// Cell position
export interface CellPosition {
  row: number;
  col: number;
}

// Explosion animation data
export interface ExplosionEvent {
  row: number;
  col: number;
  player: Player;
  id: string;
}
