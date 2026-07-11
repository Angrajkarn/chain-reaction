// ============================================================
// Zobrist Hashing — High-speed unique board state hash generator
// ============================================================

import { BoardState, Player } from '../types';
import { getCriticalMass } from '../utils/gameEngine';

// Seeded pseudorandom number generator for reproducibility
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    // LCG parameters
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  next32(): number {
    return Math.floor(this.next() * 0xffffffff);
  }
}

let zobristKeys: {
  // keys[row][col][owner][count]
  cellKeys: number[][][][];
  turnKeys: number[];
} | null = null;

export function initZobrist(rows: number, cols: number) {
  const rng = new SeededRandom(42); // deterministic seed
  const cellKeys: number[][][][] = [];

  for (let r = 0; r < rows; r++) {
    cellKeys[r] = [];
    for (let c = 0; c < cols; c++) {
      cellKeys[r][c] = [];
      const maxCount = getCriticalMass(r, c, rows, cols);
      // Owner index: 0 = null, 1 = Player 1, 2 = Player 2
      for (let o = 0; o <= 2; o++) {
        cellKeys[r][c][o] = [];
        for (let count = 0; count <= maxCount; count++) {
          cellKeys[r][c][o][count] = rng.next32();
        }
      }
    }
  }

  const turnKeys = [rng.next32(), rng.next32(), rng.next32()]; // 0 (not used), 1, 2

  zobristKeys = { cellKeys, turnKeys };
}

/**
 * Computes Zobrist Hash key for the given board and current player.
 */
export function getZobristHash(board: BoardState, player: Player): number {
  const rows = board.length;
  const cols = board[0]?.length || 6;

  if (!zobristKeys) {
    initZobrist(rows, cols);
  }

  const keys = zobristKeys!;
  let hash = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      const ownerIdx = cell.owner === null ? 0 : cell.owner;
      const count = cell.count;
      
      // XOR the hash with the cell-specific random key
      if (keys.cellKeys[r]?.[c]?.[ownerIdx]?.[count] !== undefined) {
        hash ^= keys.cellKeys[r][c][ownerIdx][count];
      }
    }
  }

  hash ^= keys.turnKeys[player];
  return hash;
}
