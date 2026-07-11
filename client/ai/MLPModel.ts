// ============================================================
// MLPModel — Lightweight offline Multi-Layer Perceptron (16-16-8-1)
// ============================================================

import { BoardState, Player } from '../types';
import { getCriticalMass, getCellType, getAdjacentCells, checkWinner } from '../utils/gameEngine';
import { generateMoves } from './MoveGenerator';

export interface ModelWeights {
  w1: number[][]; // 16x16
  b1: number[];   // 16
  w2: number[][]; // 8x16
  b2: number[];   // 8
  w3: number[];   // 8
  b3: number;     // 1
}

// Default random weights for initialization
function createRandomArray(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() * 2 - 1) * Math.sqrt(2.0 / cols))
  );
}

function createRandomVector(size: number): number[] {
  return Array.from({ length: size }, () => (Math.random() * 2 - 1) * 0.1);
}

const DEFAULT_WEIGHTS: ModelWeights = {
  w1: createRandomArray(16, 16),
  b1: createRandomVector(16),
  w2: createRandomArray(8, 16),
  b2: createRandomVector(8),
  w3: createRandomVector(8),
  b3: 0,
};

export class MLPModel {
  public weights: ModelWeights = DEFAULT_WEIGHTS;

  /**
   * Encodes board state into 16 standardized features.
   */
  public static extractFeatures(board: BoardState, aiPlayer: Player, turnCount: number, currentPlayer: Player): number[] {
    const humanPlayer: Player = aiPlayer === 1 ? 2 : 1;
    const rows = board.length;
    const cols = board[0]?.length || 6;
    const totalCells = rows * cols;

    let aiAtoms = 0;
    let humanAtoms = 0;
    let aiCells = 0;
    let humanCells = 0;
    let aiCorners = 0;
    let humanCorners = 0;
    let aiEdges = 0;
    let humanEdges = 0;
    let aiCritical = 0;
    let humanCritical = 0;

    let totalCorners = 0;
    let totalEdges = 0;

    const criticalOpponentCells: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const cellType = getCellType(r, c, rows, cols);
        if (cellType === 'corner') totalCorners++;
        else if (cellType === 'edge') totalEdges++;

        const critMass = getCriticalMass(r, c, rows, cols);

        if (cell.count > 0) {
          if (cell.owner === aiPlayer) {
            aiAtoms += cell.count;
            aiCells++;
            if (cellType === 'corner') aiCorners++;
            else if (cellType === 'edge') aiEdges++;
            if (cell.count === critMass - 1) aiCritical++;
          } else if (cell.owner === humanPlayer) {
            humanAtoms += cell.count;
            humanCells++;
            if (cellType === 'corner') humanCorners++;
            else if (cellType === 'edge') humanEdges++;
            if (cell.count === critMass - 1) {
              humanCritical++;
              criticalOpponentCells[r][c] = true;
            }
          }
        }
      }
    }

    // Vulnerable: AI owned cells adjacent to critical human cells
    let aiVulnerable = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].owner === aiPlayer) {
          const neighbors = getAdjacentCells(r, c, rows, cols);
          const adjacentToCrit = neighbors.some(([nr, nc]) => criticalOpponentCells[nr][nc]);
          if (adjacentToCrit) aiVulnerable++;
        }
      }
    }

    // Human vulnerable: opposite of above
    let humanVulnerable = 0;
    const criticalAICells: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].owner === aiPlayer && board[r][c].count === getCriticalMass(r, c, rows, cols) - 1) {
          criticalAICells[r][c] = true;
        }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].owner === humanPlayer) {
          const neighbors = getAdjacentCells(r, c, rows, cols);
          if (neighbors.some(([nr, nc]) => criticalAICells[nr][nc])) {
            humanVulnerable++;
          }
        }
      }
    }

    const aiMoves = generateMoves(board, aiPlayer).length;
    const humanMoves = generateMoves(board, humanPlayer).length;

    const totalAtoms = aiAtoms + humanAtoms + 1;

    return [
      aiAtoms / totalAtoms,
      humanAtoms / totalAtoms,
      aiCells / totalCells,
      humanCells / totalCells,
      totalCorners > 0 ? aiCorners / totalCorners : 0,
      totalCorners > 0 ? humanCorners / totalCorners : 0,
      totalEdges > 0 ? aiEdges / totalEdges : 0,
      totalEdges > 0 ? humanEdges / totalEdges : 0,
      aiCritical / totalCells,
      humanCritical / totalCells,
      aiVulnerable / totalCells,
      humanVulnerable / totalCells,
      aiMoves / totalCells,
      humanMoves / totalCells,
      Math.log(turnCount + 1) / 50.0,
      currentPlayer === aiPlayer ? 1 : -1,
    ];
  }

  /**
   * Forward pass: computes evaluation score between -1.0 (win for other) and +1.0 (win for AI).
   */
  public forward(features: number[]): {
    out: number;
    h1: number[];
    h2: number[];
  } {
    const w = this.weights;

    // Layer 1 (Input to Hidden 1)
    const h1: number[] = new Array(16);
    for (let i = 0; i < 16; i++) {
      let sum = w.b1[i];
      for (let j = 0; j < 16; j++) {
        sum += features[j] * w.w1[i][j];
      }
      h1[i] = Math.max(0, sum); // ReLU
    }

    // Layer 2 (Hidden 1 to Hidden 2)
    const h2: number[] = new Array(8);
    for (let i = 0; i < 8; i++) {
      let sum = w.b2[i];
      for (let j = 0; j < 16; j++) {
        sum += h1[j] * w.w2[i][j];
      }
      h2[i] = Math.max(0, sum); // ReLU
    }

    // Layer 3 (Hidden 2 to Output)
    let sum3 = w.b3;
    for (let j = 0; j < 8; j++) {
      sum3 += h2[j] * w.w3[j];
    }
    const out = Math.tanh(sum3); // Tanh scales output between [-1, 1]

    return { out, h1, h2 };
  }

  /**
   * Backward pass / training step of weights for a single batch element
   */
  public trainStep(features: number[], target: number, lr: number) {
    const { out, h1, h2 } = this.forward(features);
    const error = out - target;

    // Derivative of tanh: 1 - o^2
    const dOut = error * (1 - out * out);

    // Layer 3 gradients
    const dw3: number[] = new Array(8);
    const db3 = dOut;
    const dh2: number[] = new Array(8);
    for (let i = 0; i < 8; i++) {
      dw3[i] = dOut * h2[i];
      dh2[i] = dOut * this.weights.w3[i];
    }

    // Layer 2 gradients
    const dw2: number[][] = Array.from({ length: 8 }, () => new Array(16).fill(0));
    const db2: number[] = new Array(8);
    const dh1: number[] = new Array(16).fill(0);
    for (let i = 0; i < 8; i++) {
      const dAct = h2[i] > 0 ? dh2[i] : 0; // ReLU derivative
      db2[i] = dAct;
      for (let j = 0; j < 16; j++) {
        dw2[i][j] = dAct * h1[j];
        dh1[j] += dAct * this.weights.w2[i][j];
      }
    }

    // Layer 1 gradients
    const dw1: number[][] = Array.from({ length: 16 }, () => new Array(16).fill(0));
    const db1: number[] = new Array(16);
    for (let i = 0; i < 16; i++) {
      const dAct = h1[i] > 0 ? dh1[i] : 0; // ReLU derivative
      db1[i] = dAct;
      for (let j = 0; j < 16; j++) {
        dw1[i][j] = dAct * features[j];
      }
    }

    // Apply updates (SGD)
    for (let i = 0; i < 8; i++) {
      this.weights.w3[i] -= lr * dw3[i];
      this.weights.b2[i] -= lr * db2[i];
      for (let j = 0; j < 16; j++) {
        this.weights.w2[i][j] -= lr * dw2[i][j];
      }
    }
    this.weights.b3 -= lr * db3;

    for (let i = 0; i < 16; i++) {
      this.weights.b1[i] -= lr * db1[i];
      for (let j = 0; j < 16; j++) {
        this.weights.w1[i][j] -= lr * dw1[i][j];
      }
    }
  }

  public loadWeights(jsonString: string) {
    try {
      this.weights = JSON.parse(jsonString);
    } catch (e) {
      console.warn('Failed to load weights, using defaults', e);
    }
  }

  public saveWeights(): string {
    return JSON.stringify(this.weights);
  }
}

// Global active offline model instance
export const globalModel = new MLPModel();

import defaultWeights from './ai-model-weights.json';
globalModel.weights = defaultWeights as ModelWeights;

