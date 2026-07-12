// ============================================================
// InferenceEngine — Multi-difficulty AI player with Search & ML
// ============================================================

import { BoardState, Player } from '../types';
import { getCriticalMass, getCellType, getAdjacentCells, checkWinner, applyMove } from '../utils/gameEngine';
import { generateMoves, Move } from './MoveGenerator';
import { evaluateBoard } from './Evaluation';
import { globalModel, MLPModel } from './MLPModel';
import { getZobristHash } from './Zobrist';
import { globalTT, EntryType } from './TranspositionTable';
import { orderMoves } from './MoveOrdering';
import { sleep } from '../utils/helpers';
import { AIDifficulty, DIFFICULTY_CONFIGS } from './Difficulty';

// Extends difficulty types to match objective requirements
export type ExtendedAIDifficulty = AIDifficulty | 'impossible';

const EVALUATION_TIMEOUT_MS = 250; // Max time budget for iterative deepening to stay under 300ms limit

// ─── Easy Strategy ──────────────────────────────────────────────
function getEasyMove(board: BoardState, player: Player): Move | null {
  const moves = generateMoves(board, player);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// ─── Medium Strategy ────────────────────────────────────────────
function getMediumMove(board: BoardState, player: Player, turnCount: number): Move | null {
  const moves = generateMoves(board, player);
  if (moves.length === 0) return null;

  const rows = board.length;
  const cols = board[0]?.length || 6;

  const scored = moves.map((move) => {
    const cell = board[move.row][move.col];
    const critMass = getCriticalMass(move.row, move.col, rows, cols);
    let score = evaluateBoard(board, player, turnCount);

    // Prefer expanding our own cells
    if (cell.owner === player) {
      score += 15;
      if (cell.count === critMass - 1) {
        score += 35; // chain potential
      }
    } else if (cell.owner === null) {
      score += 8;
    }

    // Avoid placing adjacent to critical opponent cells (safety)
    const opponent: Player = player === 1 ? 2 : 1;
    const neighbors = getAdjacentCells(move.row, move.col, rows, cols);
    const adjacentToThreat = neighbors.some(([nr, nc]) => {
      const oppCell = board[nr][nc];
      return oppCell.owner === opponent && oppCell.count === getCriticalMass(nr, nc, rows, cols) - 1;
    });

    if (adjacentToThreat) {
      score -= 25;
    }

    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

// ─── Search-based Strategy (Hard and Impossible) ─────────────────
interface SearchContext {
  startTime: number;
  timeLimit: number;
  isTimedOut: boolean;
  nodesVisited: number;
  aiPlayer: Player;
  useNeuralNet: boolean; // true for "Impossible"
}

/**
 * Searches the game tree using minimax, alpha-beta, sorting, and transposition tables.
 */
function searchMinimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximising: boolean,
  turnCount: number,
  ctx: SearchContext
): number {
  ctx.nodesVisited++;

  // BUG-017: Check timeout every 64 nodes (was 128) so we never overshoot
  // the 300ms budget even inside a single deep recursive branch.
  if (ctx.nodesVisited % 64 === 0) {
    if (Date.now() - ctx.startTime > ctx.timeLimit) {
      ctx.isTimedOut = true;
    }
  }

  if (ctx.isTimedOut) return 0;


  // Terminal winner check
  const winner = checkWinner(board, turnCount);
  if (winner !== null) {
    return winner === ctx.aiPlayer ? 100_000 + depth : -100_000 - depth;
  }

  // Terminal: leaf node evaluation
  if (depth === 0) {
    if (ctx.useNeuralNet) {
      // Neural Net evaluation scaled up to match minimax bounds
      const features = MLPModel.extractFeatures(board, ctx.aiPlayer, turnCount, isMaximising ? ctx.aiPlayer : (ctx.aiPlayer === 1 ? 2 : 1));
      const modelOut = globalModel.forward(features).out;
      return modelOut * 1000; // Neural policy score mapping [-1000, 1000]
    } else {
      return evaluateBoard(board, ctx.aiPlayer, turnCount);
    }
  }

  const currentPlayer = isMaximising ? ctx.aiPlayer : (ctx.aiPlayer === 1 ? 2 : 1);
  const hash = getZobristHash(board, currentPlayer);

  // Transposition table lookup
  const cachedVal = globalTT.lookup(hash, depth);
  if (cachedVal && cachedVal.depth >= depth) {
    if (cachedVal.type === EntryType.EXACT) return cachedVal.value;
    if (cachedVal.type === EntryType.LOWERBOUND) alpha = Math.max(alpha, cachedVal.value);
    else if (cachedVal.type === EntryType.UPPERBOUND) beta = Math.min(beta, cachedVal.value);
    if (alpha >= beta) return cachedVal.value;
  }

  const rawMoves = generateMoves(board, currentPlayer);
  if (rawMoves.length === 0) {
    return 0; // Draw/No move safety
  }

  // Order moves to maximize pruning efficiency
  const orderedMoves = orderMoves(board, rawMoves, currentPlayer, hash);

  let bestVal = isMaximising ? -Infinity : Infinity;
  let bestMove: Move | null = null;

  if (isMaximising) {
    for (const move of orderedMoves) {
      const nextBoard = applyMove(board, move.row, move.col, currentPlayer);
      const score = searchMinimax(nextBoard, depth - 1, alpha, beta, false, turnCount + 1, ctx);
      
      if (ctx.isTimedOut) break;

      if (score > bestVal) {
        bestVal = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // Beta cut-off
    }

    // Cache to transposition table
    if (!ctx.isTimedOut) {
      let type = EntryType.EXACT;
      if (bestVal <= alpha) type = EntryType.UPPERBOUND;
      else if (bestVal >= beta) type = EntryType.LOWERBOUND;
      globalTT.store(hash, depth, bestVal, type, bestMove);
    }
  } else {
    for (const move of orderedMoves) {
      const nextBoard = applyMove(board, move.row, move.col, currentPlayer);
      const score = searchMinimax(nextBoard, depth - 1, alpha, beta, true, turnCount + 1, ctx);

      if (ctx.isTimedOut) break;

      if (score < bestVal) {
        bestVal = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // Alpha cut-off
    }

    // Cache to transposition table
    if (!ctx.isTimedOut) {
      let type = EntryType.EXACT;
      if (bestVal <= alpha) type = EntryType.UPPERBOUND;
      else if (bestVal >= beta) type = EntryType.LOWERBOUND;
      globalTT.store(hash, depth, bestVal, type, bestMove);
    }
  }

  return bestVal;
}

/**
 * Searches the best move using Iterative Deepening.
 */
function getSearchedMove(
  board: BoardState,
  player: Player,
  turnCount: number,
  maxDepth: number,
  useNeuralNet: boolean
): Move | null {
  const ctx: SearchContext = {
    startTime: Date.now(),
    timeLimit: EVALUATION_TIMEOUT_MS,
    isTimedOut: false,
    nodesVisited: 0,
    aiPlayer: player,
    useNeuralNet,
  };

  let bestMove: Move | null = null;
  const rawMoves = generateMoves(board, player);
  if (rawMoves.length === 0) return null;

  // Default to first legal move
  bestMove = rawMoves[0];

  // Iterative deepening search
  for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
    const hash = getZobristHash(board, player);
    const orderedMoves = orderMoves(board, rawMoves, player, hash);

    let currentBestMove: Move | null = null;
    let bestScore = -Infinity;

    for (const move of orderedMoves) {
      const nextBoard = applyMove(board, move.row, move.col, player);
      const score = searchMinimax(nextBoard, currentDepth - 1, -Infinity, Infinity, false, turnCount + 1, ctx);

      if (ctx.isTimedOut) {
        break;
      }

      if (score > bestScore) {
        bestScore = score;
        currentBestMove = move;
      }
    }

    // Only update if search completed this depth successfully
    if (!ctx.isTimedOut && currentBestMove) {
      bestMove = currentBestMove;
      // If we found a forced win path, we can terminate search early
      if (bestScore > 90000) {
        break;
      }
    } else {
      break;
    }
  }

  return bestMove;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Computes AI move based on difficulty and outputs selected move.
 */
export async function getAIMove(
  board: BoardState,
  aiPlayer: Player,
  turnCount: number,
  difficulty: ExtendedAIDifficulty
): Promise<Move | null> {
  const config = DIFFICULTY_CONFIGS[difficulty === 'impossible' ? 'hard' : difficulty];
  const delayLimit = config.maxDelayMs - config.minDelayMs;
  const delay = config.minDelayMs + Math.random() * delayLimit;

  const tStart = Date.now();

  let move: Move | null = null;

  switch (difficulty) {
    case 'easy':
      move = getEasyMove(board, aiPlayer);
      break;

    case 'medium':
      move = getMediumMove(board, aiPlayer, turnCount);
      break;

    case 'hard':
      move = getSearchedMove(board, aiPlayer, turnCount, 4, false); // use default heuristic
      break;

    case 'impossible':
      move = getSearchedMove(board, aiPlayer, turnCount, 5, true); // use neural net policy evaluator + deeper path search
      break;
  }

  // Ensure minimum thinking delay to look natural, while staying strictly under 300ms limit for fast moves
  const elapsed = Date.now() - tStart;
  const remaining = Math.max(0, Math.min(300 - elapsed, delay - elapsed));
  if (remaining > 0) {
    await sleep(remaining);
  }

  return move;
}
