// ============================================================
// MoveGenerator — Enumerates all valid moves for a player
// ============================================================

import { BoardState, Player } from '../types';
import { isValidMove } from '../utils/gameEngine';

export interface Move {
  row: number;
  col: number;
}

/**
 * Returns all valid moves for `player` on `board`.
 * A valid move is any cell owned by player or empty.
 */
export function generateMoves(board: BoardState, player: Player): Move[] {
  const moves: Move[] = [];
  const rows = board.length;
  const cols = board[0]?.length || 6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isValidMove(board, r, c, player)) {
        moves.push({ row: r, col: c });
      }
    }
  }

  return moves;
}
