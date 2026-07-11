// ============================================================
// SelfPlay — Orchestrates fast AI vs AI self-play simulations
// ============================================================

import { BoardState, Player } from '../types';
import { createEmptyBoard, applyMove, checkWinner } from '../utils/gameEngine';
import { generateMoves, Move } from './MoveGenerator';
import { evaluateBoard } from './Evaluation';

export interface RecordedState {
  features: number[];
  validMoves: Move[];
  selectedMoveIdx: number;
  player: Player;
  turnCount: number;
}

export interface SelfPlayGame {
  states: RecordedState[];
  winner: Player;
  totalTurns: number;
}

/**
 * Simulates a single complete game of Chain Reaction via AI self-play.
 * Returns game states timeline and the winner.
 */
export function simulateSelfPlayGame(
  rows = 6,
  cols = 6,
  explorationRate = 0.22 // Random moves for coverage
): SelfPlayGame {
  let board = createEmptyBoard(rows, cols);
  let currentTurn: Player = 1;
  let turnCount = 0;
  const states: RecordedState[] = [];

  const MAX_TURNS = 180; // Safety cap

  while (turnCount < MAX_TURNS) {
    const validMoves = generateMoves(board, currentTurn);
    if (validMoves.length === 0) {
      break;
    }

    // Feature extraction representation
    const features = evaluateBoardFeatures(board, currentTurn, turnCount);

    // AI decision selects move
    let selectedIdx = 0;
    if (Math.random() < explorationRate) {
      // Exploration
      selectedIdx = Math.floor(Math.random() * validMoves.length);
    } else {
      // Pure greedy selection based on simple static scoring to make moves reasonable
      let bestVal = -Infinity;
      for (let i = 0; i < validMoves.length; i++) {
        const mv = validMoves[i];
        const nextB = applyMove(board, mv.row, mv.col, currentTurn);
        const val = evaluateCandidateBoard(nextB, currentTurn, turnCount + 1);
        if (val > bestVal) {
          bestVal = val;
          selectedIdx = i;
        }
      }
    }

    const move = validMoves[selectedIdx];
    states.push({
      features,
      validMoves,
      selectedMoveIdx: selectedIdx,
      player: currentTurn,
      turnCount,
    });

    board = applyMove(board, move.row, move.col, currentTurn);
    turnCount++;

    const winner = checkWinner(board, turnCount);
    if (winner !== null) {
      return { states, winner, totalTurns: turnCount };
    }

    // Toggle player
    currentTurn = currentTurn === 1 ? 2 : 1;
  }

  // If cap exceeded, declare player with more atoms the winner
  let p1Atoms = 0;
  let p2Atoms = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.owner === 1) p1Atoms += cell.count;
      else if (cell.owner === 2) p2Atoms += cell.count;
    }
  }
  const fallbackWinner = p1Atoms >= p2Atoms ? 1 : 2;
  return { states, winner: fallbackWinner as Player, totalTurns: turnCount };
}

// Inline lightweight feature extraction matching MLPModel features
function evaluateBoardFeatures(board: BoardState, player: Player, turnCount: number): number[] {
  // Call general feature extractor
  const MLPModel = require('./MLPModel').MLPModel;
  return MLPModel.extractFeatures(board, player, turnCount, player);
}

// Lightweight candidate evaluator
function evaluateCandidateBoard(board: BoardState, player: Player, turnCount: number): number {
  let aiAtoms = 0;
  let opponentAtoms = 0;
  const opponent = player === 1 ? 2 : 1;

  for (const row of board) {
    for (const cell of row) {
      if (cell.count > 0) {
        if (cell.owner === player) aiAtoms += cell.count;
        else if (cell.owner === opponent) opponentAtoms += cell.count;
      }
    }
  }
  return aiAtoms - opponentAtoms;
}
