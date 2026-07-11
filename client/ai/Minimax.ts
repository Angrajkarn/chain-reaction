// ============================================================
// Minimax — Alpha-Beta pruned minimax search engine
// ============================================================

import { BoardState, Player } from '../types';
import { applyMove, checkWinner } from '../utils/gameEngine';
import { evaluateBoard } from './Evaluation';
import { generateMoves, Move } from './MoveGenerator';

/**
 * Minimax with Alpha-Beta pruning.
 *
 * @param board       Current board state
 * @param depth       Remaining search depth
 * @param alpha       Best score maximiser is guaranteed (−∞ initially)
 * @param beta        Best score minimiser is guaranteed (+∞ initially)
 * @param isMaximising  true = AI's turn, false = Human's turn
 * @param aiPlayer    The AI's player number
 * @param turnCount   Running game turn count (for checkWinner threshold)
 */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximising: boolean,
  aiPlayer: Player,
  turnCount: number
): number {
  const humanPlayer: Player = aiPlayer === 1 ? 2 : 1;
  const currentPlayer: Player = isMaximising ? aiPlayer : humanPlayer;

  // Terminal: winner exists
  const winner = checkWinner(board, turnCount);
  if (winner !== null) {
    return winner === aiPlayer ? 100_000 + depth : -100_000 - depth;
  }

  // Terminal: depth exhausted → evaluate statically
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer, turnCount);
  }

  const moves = generateMoves(board, currentPlayer);

  // No moves available (unlikely but safe)
  if (moves.length === 0) {
    return evaluateBoard(board, aiPlayer, turnCount);
  }

  if (isMaximising) {
    let best = -Infinity;
    for (const move of moves) {
      const nextBoard = applyMove(board, move.row, move.col, currentPlayer);
      const score = minimax(nextBoard, depth - 1, alpha, beta, false, aiPlayer, turnCount + 1);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // β cut-off
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const nextBoard = applyMove(board, move.row, move.col, currentPlayer);
      const score = minimax(nextBoard, depth - 1, alpha, beta, true, aiPlayer, turnCount + 1);
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // α cut-off
    }
    return best;
  }
}

/**
 * Returns the best move found by Alpha-Beta Minimax at the given depth.
 */
export function findBestMove(
  board: BoardState,
  aiPlayer: Player,
  turnCount: number,
  depth: number
): Move | null {
  const moves = generateMoves(board, aiPlayer);
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMove: Move = moves[0];

  for (const move of moves) {
    const nextBoard = applyMove(board, move.row, move.col, aiPlayer);
    const score = minimax(nextBoard, depth - 1, -Infinity, Infinity, false, aiPlayer, turnCount + 1);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
