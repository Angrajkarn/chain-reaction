// ============================================================
// AIEngine — Lightweight bridge pointing to the optimised InferenceEngine
// ============================================================

import { BoardState, Player } from '../types';
import { AIDifficulty } from './Difficulty';
import { Move } from './MoveGenerator';
import { getAIMove, ExtendedAIDifficulty } from './InferenceEngine';

/**
 * Computes the AI move asynchronously using the high-performance InferenceEngine.
 */
export async function computeAIMove(
  board: BoardState,
  aiPlayer: Player,
  turnCount: number,
  difficulty: ExtendedAIDifficulty
): Promise<Move | null> {
  return getAIMove(board, aiPlayer, turnCount, difficulty);
}

