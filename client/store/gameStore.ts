// ============================================================
// Zustand — Game State Store
// ============================================================

import { create } from 'zustand';
import { BoardState, Player, PlayerInfo, ExplosionEvent } from '../types';
import { createEmptyBoard } from '../utils/gameEngine';
import { randomId } from '../utils/helpers';

interface GameState {
  // Room
  roomCode: string | null;
  myPlayerNumber: Player | null;
  myName: string | null;

  // Players
  players: PlayerInfo[];

  // Board
  board: BoardState;
  currentTurn: Player;
  turnCount: number;

  // Game status
  gameStarted: boolean;
  gameOver: boolean;
  winner: Player | null;
  winnerName: string | null;

  // Animations
  explosions: ExplosionEvent[];

  // Connection
  isConnected: boolean;
  isReconnecting: boolean;

  // Restart votes
  myRequestedRestart: boolean;

  // Global Warning Toasts
  toastMessage: string | null;

  // Move submission state
  movePending: boolean;

  // Online cascade — stores server final board until local animation finishes
  pendingOnlineBoard: { board: BoardState; currentTurn: Player; turnCount: number } | null;
  setPendingOnlineBoard: (s: { board: BoardState; currentTurn: Player; turnCount: number } | null) => void;

  // Actions
  setRoomCode: (code: string) => void;
  setMyPlayerNumber: (num: Player) => void;
  setMyName: (name: string) => void;
  setPlayers: (players: PlayerInfo[]) => void;
  setBoard: (board: BoardState) => void;
  setCurrentTurn: (turn: Player) => void;
  setTurnCount: (count: number) => void;
  setGameStarted: (started: boolean) => void;
  setGameOver: (over: boolean, winner: Player | null, winnerName: string | null) => void;
  addExplosion: (row: number, col: number, player: Player) => void;
  removeExplosion: (id: string) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setMyRequestedRestart: (val: boolean) => void;
  setToastMessage: (msg: string | null) => void;
  setMovePending: (val: boolean) => void;
  resetForNewGame: () => void;
  fullReset: () => void;
}

const initialBoard = createEmptyBoard();

export const useGameStore = create<GameState>((set) => ({
  roomCode: null,
  myPlayerNumber: null,
  myName: null,
  players: [],
  board: initialBoard,
  currentTurn: 1,
  turnCount: 0,
  gameStarted: false,
  gameOver: false,
  winner: null,
  winnerName: null,
  explosions: [],
  isConnected: false,
  isReconnecting: false,
  myRequestedRestart: false,
  toastMessage: null,
  movePending: false,
  pendingOnlineBoard: null,

  setRoomCode: (code) => set({ roomCode: code }),
  setMyPlayerNumber: (num) => set({ myPlayerNumber: num }),
  setMyName: (name) => set({ myName: name }),
  setPlayers: (players) => set({ players }),
  setBoard: (board) => set({ board }),
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  setTurnCount: (count) => set({ turnCount: count }),
  setGameStarted: (started) => set({ gameStarted: started }),
  setGameOver: (over, winner, winnerName) =>
    set({ gameOver: over, winner, winnerName }),

  addExplosion: (row, col, player) =>
    set((state) => ({
      explosions: [...state.explosions, { row, col, player, id: randomId() }],
    })),

  removeExplosion: (id) =>
    set((state) => ({
      explosions: state.explosions.filter((e) => e.id !== id),
    })),

  setConnected: (connected) => set({ isConnected: connected }),
  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  setMyRequestedRestart: (val) => set({ myRequestedRestart: val }),
  setToastMessage: (msg) => set({ toastMessage: msg }),
  setMovePending: (val) => set({ movePending: val }),
  setPendingOnlineBoard: (s) => set({ pendingOnlineBoard: s }),

  resetForNewGame: () =>
    set({
      board: createEmptyBoard(),
      currentTurn: 1,
      turnCount: 0,
      gameOver: false,
      winner: null,
      winnerName: null,
      explosions: [],
      myRequestedRestart: false,
      toastMessage: null,
      movePending: false,
    }),

  fullReset: () =>
    set({
      roomCode: null,
      myPlayerNumber: null,
      myName: null,
      players: [],
      board: createEmptyBoard(),
      currentTurn: 1,
      turnCount: 0,
      gameStarted: false,
      gameOver: false,
      winner: null,
      winnerName: null,
      explosions: [],
      isConnected: false,
      isReconnecting: false,
      myRequestedRestart: false,
      toastMessage: null,
      movePending: false,
    }),
}));
