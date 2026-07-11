// ============================================================
// Chain Reaction — Server-Side Game Engine
// Dynamic grid dimension supporting logic
// ============================================================

import { BoardState, OrbData, Player } from '../types';

export const COLS = 6;
export const ROWS = 13;

/**
 * Creates a blank board (rows x cols) with all cells empty.
 */
export function createEmptyBoard(rows: number = ROWS, cols: number = COLS): BoardState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): OrbData => ({ count: 0, owner: null }))
  );
}

/**
 * Returns the critical mass for a given cell.
 */
export function getCriticalMass(row: number, col: number, rows: number = ROWS, cols: number = COLS): number {
  const isTopBottom = row === 0 || row === rows - 1;
  const isLeftRight = col === 0 || col === cols - 1;

  if (isTopBottom && isLeftRight) return 2; // Corner
  if (isTopBottom || isLeftRight) return 3; // Edge
  return 4; // Center
}

/**
 * Returns valid adjacent cell coordinates.
 */
function getAdjacentCells(row: number, col: number, rows: number = ROWS, cols: number = COLS): [number, number][] {
  const adjacent: [number, number][] = [];
  if (row > 0) adjacent.push([row - 1, col]);
  if (row < rows - 1) adjacent.push([row + 1, col]);
  if (col > 0) adjacent.push([row, col - 1]);
  if (col < cols - 1) adjacent.push([row, col + 1]);
  return adjacent;
}

/**
 * Deep clones a board state.
 */
export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => row.map(cell => ({ ...cell })));
}

/**
 * Applies a move to the board and resolves all chain explosions.
 * Returns the new board state.
 * Uses BFS to process explosions in order.
 */
export function applyMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player,
  turnCount: number = 2
): BoardState {
  const rows = board.length;
  const cols = board[0]?.length || COLS;
  const newBoard = cloneBoard(board);

  // Add one orb to target cell
  newBoard[row][col].count += 1;
  newBoard[row][col].owner = player;

  // BFS explosion queue
  const queue: [number, number][] = [];

  if (newBoard[row][col].count >= getCriticalMass(row, col, rows, cols)) {
    queue.push([row, col]);
  }

  const MAX_ITERATIONS = rows * cols * 4; // Safety cap
  let iterations = 0;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const [r, c] = queue.shift()!;

    const critMass = getCriticalMass(r, c, rows, cols);
    if (newBoard[r][c].count < critMass) continue;

    // Explode: distribute orbs to neighbors
    newBoard[r][c].count -= critMass;
    if (newBoard[r][c].count === 0) {
      newBoard[r][c].owner = null;
    }

    const neighbors = getAdjacentCells(r, c, rows, cols);
    for (const [nr, nc] of neighbors) {
      newBoard[nr][nc].count += 1;
      newBoard[nr][nc].owner = player; // ownership transfers

      if (newBoard[nr][nc].count >= getCriticalMass(nr, nc, rows, cols)) {
        queue.push([nr, nc]);
      }
    }

    // Terminate cascade immediately if a player has won mid-cascade
    if (checkWinner(newBoard, turnCount + 1) !== null) {
      break;
    }
  }

  return newBoard;
}

/**
 * Checks if the game is over.
 * A player wins when ALL orbs on the board belong to them,
 * and at least one move has been made by each player (turnCount >= 2).
 */
export function checkWinner(board: BoardState, turnCount: number): Player | null {
  if (turnCount < 2) return null; // Both players must have played at least once

  let p1Count = 0;
  let p2Count = 0;
  let totalOrbs = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell.count > 0) {
        totalOrbs++;
        if (cell.owner === 1) p1Count++;
        else if (cell.owner === 2) p2Count++;
      }
    }
  }

  if (totalOrbs === 0) return null;
  if (p2Count === 0 && p1Count > 0) return 1;
  if (p1Count === 0 && p2Count > 0) return 2;
  return null;
}

/**
 * Validates whether a move is legal.
 */
export function isValidMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): { valid: boolean; reason?: string } {
  const rows = board.length;
  const cols = board[0]?.length || COLS;

  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    return { valid: false, reason: 'Cell out of bounds' };
  }

  const cell = board[row][col];

  // Can only place on own cell or empty cell
  if (cell.owner !== null && cell.owner !== player) {
    return { valid: false, reason: 'Cannot place on opponent cell' };
  }

  return { valid: true };
}
