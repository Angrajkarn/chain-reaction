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
  player: Player
): BoardState {
  const rows = board.length;
  const cols = board[0]?.length || COLS;
  const newBoard = cloneBoard(board);

  // Dynamically track occupied cells of each player to detect early win & prevent infinite loops
  let p1Cells = 0;
  let p2Cells = 0;
  let totalOrbs = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const count = board[r][c].count;
      totalOrbs += count;
      if (count > 0) {
        if (board[r][c].owner === 1) p1Cells++;
        else if (board[r][c].owner === 2) p2Cells++;
      }
    }
  }

  // Adjust cell counts for placing the new orb
  const prevCell = board[row][col];
  if (prevCell.count === 0) {
    if (player === 1) p1Cells++;
    else p2Cells++;
  } else if (prevCell.owner !== player) {
    if (player === 1) {
      p1Cells++;
      p2Cells--;
    } else {
      p2Cells++;
      p1Cells--;
    }
  }
  totalOrbs += 1;

  // Add one orb to target cell
  newBoard[row][col].count += 1;
  newBoard[row][col].owner = player;

  // BFS explosion queue
  const queue: [number, number][] = [];

  if (newBoard[row][col].count >= getCriticalMass(row, col, rows, cols)) {
    queue.push([row, col]);
  }

  // Safety cap to prevent CPU exhaustion
  const MAX_ITERATIONS = Math.max(100000, rows * cols * 100);
  let iterations = 0;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const [r, c] = queue.shift()!;

    const critMass = getCriticalMass(r, c, rows, cols);
    if (newBoard[r][c].count < critMass) continue;

    // Explode: distribute orbs to neighbors
    newBoard[r][c].count -= critMass;
    if (newBoard[r][c].count === 0) {
      const prevOwner = newBoard[r][c].owner;
      if (prevOwner === 1) p1Cells--;
      else if (prevOwner === 2) p2Cells--;
      newBoard[r][c].owner = null;
    }

    const neighbors = getAdjacentCells(r, c, rows, cols);
    for (const [nr, nc] of neighbors) {
      const prevOwner = newBoard[nr][nc].owner;
      const prevCount = newBoard[nr][nc].count;

      newBoard[nr][nc].count += 1;
      newBoard[nr][nc].owner = player; // ownership transfers

      if (prevCount === 0) {
        if (player === 1) p1Cells++;
        else p2Cells++;
      } else if (prevOwner !== player) {
        if (player === 1) {
          p1Cells++;
          p2Cells--;
        } else {
          p2Cells++;
          p1Cells--;
        }
      }

      if (newBoard[nr][nc].count >= getCriticalMass(nr, nc, rows, cols)) {
        queue.push([nr, nc]);
      }
    }

    // Halt early if a player won (all opposing cells captured)
    if (totalOrbs >= 2 && (p1Cells === 0 || p2Cells === 0)) {
      break;
    }
  }

  // If cap was hit, throw so the caller can reject compile/overflow
  if (iterations >= MAX_ITERATIONS && queue.length > 0) {
    console.error(`[GameEngine] applyMove: BFS cap hit (${iterations}). Possible infinite chain on board ${rows}x${cols}.`);
    throw new Error('EXPLOSION_OVERFLOW');
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
