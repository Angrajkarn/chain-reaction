// ============================================================
// AIEngine — Top-level AI that selects a move for a given
// difficulty level without freezing the UI.
// ============================================================

import { BoardState, Player } from '../types';
import { AIDifficulty, DIFFICULTY_CONFIGS } from './Difficulty';
import { generateMoves, Move } from './MoveGenerator';
import { findBestMove } from './Minimax';
import { evaluateBoard } from './Evaluation';
import { getCriticalMass } from '../utils/gameEngine';
import { sleep } from '../utils/helpers';

// ─── Easy strategy: pure random ──────────────────────────────
function randomMove(board: BoardState, player: Player): Move | null {
  const moves = generateMoves(board, player);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// ─── Medium strategy: heuristic-only (no tree search) ────────
function mediumMove(board: BoardState, player: Player, turnCount: number): Move | null {
  const moves = generateMoves(board, player);
  if (moves.length === 0) return null;

  const rows = board.length;
  const cols = board[0]?.length || 6;

  // Score each candidate move using the evaluation function at depth 0
  const scored = moves.map((move) => {
    const cell = board[move.row][move.col];
    const critMass = getCriticalMass(move.row, move.col, rows, cols);

    let bonus = 0;

    // Prefer cells that are about to explode (chain potential)
    if (cell.count === critMass - 1) bonus += 20;

    // Prefer cells we already own (expanding)
    if (cell.owner === player) bonus += 10;

    // Avoid placing on cells that neighbor a near-critical opponent cell
    const opponent: Player = player === 1 ? 2 : 1;
    const isRisky = (() => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const b = board[r][c];
          if (b.owner === opponent && b.count >= getCriticalMass(r, c, rows, cols) - 1) {
            if (Math.abs(r - move.row) + Math.abs(c - move.col) <= 1) return true;
          }
        }
      }
      return false;
    })();

    if (isRisky) bonus -= 15;

    return { move, score: evaluateBoard(board, player, turnCount) + bonus };
  });

  // Sort descending by score, pick top candidate with small random jitter
  scored.sort((a, b) => b.score - a.score);
  const topN = Math.min(3, scored.length);
  return scored[Math.floor(Math.random() * topN)].move;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Computes the AI move asynchronously so the UI never freezes.
 * Applies the configured think-time delay for realism.
 */
export async function computeAIMove(
  board: BoardState,
  aiPlayer: Player,
  turnCount: number,
  difficulty: AIDifficulty
): Promise<Move | null> {
  const config = DIFFICULTY_CONFIGS[difficulty];

  // Simulate realistic "thinking" delay
  const delay =
    config.minDelayMs +
    Math.random() * (config.maxDelayMs - config.minDelayMs);
  await sleep(delay);

  switch (difficulty) {
    case 'easy':
      return randomMove(board, aiPlayer);

    case 'medium':
      return mediumMove(board, aiPlayer, turnCount);

    case 'hard':
      // Run synchronously inside the async function — heavy but bounded by depth 4
      return findBestMove(board, aiPlayer, turnCount, config.minimaxDepth);
  }
}
