// ============================================================
// Transposition Table — Caches evaluated search states using Zobrist hashes
// ============================================================

import { Move } from './MoveGenerator';

export enum EntryType {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

export interface TTEntry {
  hash: number;
  depth: number;
  value: number;
  type: EntryType;
  bestMove: Move | null;
  age: number; // For replacement strategy
}

export class TranspositionTable {
  private size: number;
  private table: (TTEntry | null)[];
  private currentAge: number = 0;

  constructor(size = 65536) { // 2^16 entries
    this.size = size;
    this.table = new Array(size).fill(null);
  }

  private getIndex(hash: number): number {
    return Math.abs(hash) % this.size;
  }

  public lookup(hash: number, depth: number): TTEntry | null {
    const idx = this.getIndex(hash);
    const entry = this.table[idx];
    if (entry && entry.hash === hash) {
      return entry;
    }
    return null;
  }

  public store(hash: number, depth: number, value: number, type: EntryType, bestMove: Move | null) {
    const idx = this.getIndex(hash);
    const existing = this.table[idx];

    // Replacement strategy: replace if empty, or new search depth is greater, or existing is older
    if (!existing || depth >= existing.depth || existing.age < this.currentAge) {
      this.table[idx] = {
        hash,
        depth,
        value,
        type,
        bestMove,
        age: this.currentAge,
      };
    }
  }

  public incrementAge() {
    this.currentAge++;
  }

  public clear() {
    this.table.fill(null);
    this.currentAge = 0;
  }
}

// Global shared transposition table instance
export const globalTT = new TranspositionTable(131072); // 128k entries
