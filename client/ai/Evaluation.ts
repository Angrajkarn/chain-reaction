// ============================================================
// Evaluation — Board scoring heuristic for AI
// ============================================================

import { BoardState, Player } from '../types';
import { getCriticalMass, getCellType, getAdjacentCells } from '../utils/gameEngine';

const WEIGHTS = {
  atom: 1,            // Each atom owned
  cell: 3,            // Each cell owned
  corner: 8,          // Corner cells (safest — critical mass 2)
  edge: 4,            // Edge cells (safer — critical mass 3)
  critical: 12,       // Cells one orb away from exploding (chain potential)
  vulnerable: -5,     // Cells close to opponent explosive threshold (dangerous to own)
  win: 100_000,       // Terminal win state
  lose: -100_000,     // Terminal lose state
};

/**
 * Evaluates the board from the perspective of `aiPlayer`.
 * Higher = better for AI, Lower = worse.
 */
export function evaluateBoard(board: BoardState, aiPlayer: Player, turnCount: number): number {
  const humanPlayer: Player = aiPlayer === 1 ? 2 : 1;
  const rows = board.length;
  const cols = board[0]?.length || 6;

  let aiAtoms = 0;
  let humanAtoms = 0;
  let aiCells = 0;
  let humanCells = 0;

  // Quick terminal check
  for (const row of board) {
    for (const cell of row) {
      if (cell.count > 0) {
        if (cell.owner === aiPlayer) {
          aiAtoms += cell.count;
          aiCells += 1;
        } else if (cell.owner === humanPlayer) {
          humanAtoms += cell.count;
          humanCells += 1;
        }
      }
    }
  }

  if (turnCount >= 2) {
    if (humanAtoms === 0 && aiAtoms > 0) return WEIGHTS.win;
    if (aiAtoms === 0 && humanAtoms > 0) return WEIGHTS.lose;
  }

  let score = 0;
  score += (aiAtoms - humanAtoms) * WEIGHTS.atom;
  score += (aiCells - humanCells) * WEIGHTS.cell;

  // Positional + tactical scoring per cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.count === 0) continue;

      const cellType = getCellType(r, c, rows, cols);
      const critMass = getCriticalMass(r, c, rows, cols);
      const isAI = cell.owner === aiPlayer;
      const isHuman = cell.owner === humanPlayer;
      const modifier = isAI ? 1 : -1;

      // Corner / edge bonuses
      if (cellType === 'corner') score += modifier * WEIGHTS.corner;
      else if (cellType === 'edge') score += modifier * WEIGHTS.edge;

      // Chain reaction potential: one orb away from critical
      if (cell.count === critMass - 1) {
        score += modifier * WEIGHTS.critical;
      }

      // Vulnerable: opponent cell is one away from exploding into our territory
      if (isHuman && cell.count === critMass - 1) {
        const neighbors = getAdjacentCells(r, c, rows, cols);
        for (const [nr, nc] of neighbors) {
          if (board[nr][nc].owner === aiPlayer) {
            score += WEIGHTS.vulnerable; // Our neighbour is threatened
          }
        }
      }
    }
  }

  return score;
}
