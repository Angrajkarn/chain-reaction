// ============================================================
// Move Ordering — Sorts legal moves to maximize Alpha-Beta cutoffs
// ============================================================

import { BoardState, Player } from '../types';
import { getCriticalMass, getCellType, getAdjacentCells, checkWinner } from '../utils/gameEngine';
import { Move } from './MoveGenerator';
import { globalTT } from './TranspositionTable';
import { getZobristHash } from './Zobrist';

/**
 * Assigns a weight/score to a move for sorting.
 * Higher scores indicate higher priority.
 */
function scoreMoveForOrdering(
  board: BoardState,
  move: Move,
  player: Player,
  rows: number,
  cols: number,
  ttBestMove: Move | null
): number {
  // 1. TT best move gets the highest priority
  if (ttBestMove && ttBestMove.row === move.row && ttBestMove.col === move.col) {
    return 10000;
  }

  const cell = board[move.row][move.col];
  const critMass = getCriticalMass(move.row, move.col, rows, cols);
  let score = 0;

  // 2. Prioritize adding to cells we already own that are close to critical mass
  if (cell.owner === player) {
    score += 100;
    if (cell.count === critMass - 1) {
      score += 500; // Ready to explode / trigger chain reaction
    }
  } else if (cell.owner === null) {
    score += 50; // Empty cell
  }

  // 3. Positional preference: corner > edge > center for empty/expanding cells
  const cellType = getCellType(move.row, move.col, rows, cols);
  if (cellType === 'corner') {
    score += 80;
  } else if (cellType === 'edge') {
    score += 40;
  }

  // 4. Opponent threat handling: prioritize blocking or neutralizing opponent cells that are 1 away from exploding nearby
  const opponent: Player = player === 1 ? 2 : 1;
  const neighbors = getAdjacentCells(move.row, move.col, rows, cols);
  for (const [nr, nc] of neighbors) {
    const oppCell = board[nr][nc];
    if (oppCell.owner === opponent && oppCell.count === getCriticalMass(nr, nc, rows, cols) - 1) {
      score += 300; // High threat neighbor, placing here increases our resistance or starts our own response
    }
  }

  return score;
}

/**
 * Sorts array of valid moves in place for optimal search ordering.
 */
export function orderMoves(
  board: BoardState,
  moves: Move[],
  player: Player,
  hash: number
): Move[] {
  const rows = board.length;
  const cols = board[0]?.length || 6;

  // Retrieve best move from Transposition Table if accessible
  const entry = globalTT.lookup(hash, 0);
  const ttBestMove = entry ? entry.bestMove : null;

  return moves.map((move) => ({
    move,
    score: scoreMoveForOrdering(board, move, player, rows, cols, ttBestMove),
  })).sort((a, b) => b.score - a.score).map((item) => item.move);
}
