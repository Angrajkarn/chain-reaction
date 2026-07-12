// ============================================================
// Game Engine — Client-side (supports dynamic grid dimensions)
// ============================================================

import { BOARD_COLS, BOARD_ROWS } from '../constants/config';
import { BoardState, OrbData, Player } from '../types';

export function createEmptyBoard(rows = BOARD_ROWS, cols = BOARD_COLS): BoardState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): OrbData => ({ count: 0, owner: null }))
  );
}

export function getCriticalMass(row: number, col: number, rows = BOARD_ROWS, cols = BOARD_COLS): number {
  const isTopBottom = row === 0 || row === rows - 1;
  const isLeftRight = col === 0 || col === cols - 1;

  if (isTopBottom && isLeftRight) return 2; // Corner
  if (isTopBottom || isLeftRight) return 3; // Edge
  return 4; // Center
}

export function getAdjacentCells(row: number, col: number, rows = BOARD_ROWS, cols = BOARD_COLS): [number, number][] {
  const adjacent: [number, number][] = [];
  if (row > 0) adjacent.push([row - 1, col]);
  if (row < rows - 1) adjacent.push([row + 1, col]);
  if (col > 0) adjacent.push([row, col - 1]);
  if (col < cols - 1) adjacent.push([row, col + 1]);
  return adjacent;
}

export function isValidMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): boolean {
  const rows = board.length;
  const cols = board[0]?.length || BOARD_COLS;

  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
  const cell = board[row][col];
  if (cell.owner !== null && cell.owner !== player) return false;
  return true;
}

export function getCellType(row: number, col: number, rows = BOARD_ROWS, cols = BOARD_COLS): 'corner' | 'edge' | 'center' {
  const isTopBottom = row === 0 || row === rows - 1;
  const isLeftRight = col === 0 || col === cols - 1;
  if (isTopBottom && isLeftRight) return 'corner';
  if (isTopBottom || isLeftRight) return 'edge';
  return 'center';
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => row.map(cell => ({ ...cell })));
}

/**
 * Checks if the game has a winner.
 * A player wins when ALL orbs belong to them, and total turns >= 2.
 */
export function checkWinner(board: BoardState, turnCount: number): Player | null {
  if (turnCount < 2) return null;

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
 * Applies a move locally and resolves all chain explosions (BFS).
 * Calls onExplode callback whenever a cell goes critical.
 */
export function applyMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player,
  onExplode?: (r: number, c: number) => void
): BoardState {
  const rows = board.length;
  const cols = board[0]?.length || BOARD_COLS;
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

    // Explode
    newBoard[r][c].count -= critMass;
    if (newBoard[r][c].count === 0) {
      const prevOwner = newBoard[r][c].owner;
      if (prevOwner === 1) p1Cells--;
      else if (prevOwner === 2) p2Cells--;
      newBoard[r][c].owner = null;
    }

    if (onExplode) {
      onExplode(r, c);
    }

    const neighbors = getAdjacentCells(r, c, rows, cols);
    for (const [nr, nc] of neighbors) {
      const prevOwner = newBoard[nr][nc].owner;
      const prevCount = newBoard[nr][nc].count;

      newBoard[nr][nc].count += 1;
      newBoard[nr][nc].owner = player;

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

  return newBoard;
}
