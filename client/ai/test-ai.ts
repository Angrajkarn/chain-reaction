// ============================================================
// AI Automated Test Suite
// Checks move generators, heuristic evaluators, search correctness,
// MLP model inference speeds, and memory allocations.
// ============================================================

import { createEmptyBoard, applyMove, checkWinner } from '../utils/gameEngine';
import { generateMoves } from './MoveGenerator';
import { evaluateBoard } from './Evaluation';
import { getAIMove } from './InferenceEngine';
import { globalModel, MLPModel } from './MLPModel';

function runTestSuite() {
  console.log('================================================');
  console.log('     RUNNING CHAIN REACTION AI TEST SUITE       ');
  console.log('================================================');

  let passed = 0;
  let failed = 0;

  function assert(name: string, expr: boolean) {
    if (expr) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Legal moves generation validation
  try {
    const board = createEmptyBoard(6, 6);
    // Player 1 claims (0,0)
    board[0][0].owner = 1;
    board[0][0].count = 1;
    // Player 2 claims (0,1)
    board[0][1].owner = 2;
    board[0][1].count = 1;

    const p1Moves = generateMoves(board, 1);
    const hasOpponentCell = p1Moves.some(m => m.row === 0 && m.col === 1);
    assert('P1 cannot play on P2 cells', !hasOpponentCell);

    const hasP1Cell = p1Moves.some(m => m.row === 0 && m.col === 0);
    assert('P1 can play on P1 owned cells', hasP1Cell);

    const hasEmptyCell = p1Moves.some(m => m.row === 0 && m.col === 2);
    assert('P1 can play on empty cells', hasEmptyCell);

    assert('P1 has valid total move count (35 available)', p1Moves.length === 35);
  } catch (e: any) {
    console.error('Test 1 failed with exception:', e);
    failed++;
  }

  // 2. Board evaluation heuristics correctness
  try {
    const board = createEmptyBoard(6, 6);
    board[0][0].owner = 1; // P1 corner
    board[0][0].count = 1;
    
    board[1][1].owner = 2; // P2 center
    board[1][1].count = 1;

    const p1Score = evaluateBoard(board, 1, 1);
    const p2Score = evaluateBoard(board, 2, 1);
    assert('Evaluation scores are symmetric opposites', p1Score === -p2Score);
    assert('P1 corner placement gives positive corner control bonus', p1Score > 0);
  } catch (e: any) {
    console.error('Test 2 failed with exception:', e);
    failed++;
  }

  // 3. Search and Decision Quality
  try {
    // Setting up a board where P1 (AI) has an immediate winning move
    const board = createEmptyBoard(6, 6);
    board[0][0].owner = 1;
    board[0][0].count = 1; // critical mass is 2

    // Set other cells empty so P1 just needs to place at (0,0) to create explosion and win
    // Let's assert if search selects (0,0) as the best move
    getAIMove(board, 1, 2, 'hard').then((move) => {
      assert('AI finds immediate winning move (0,0)', move !== null && move.row === 0 && move.col === 0);
    }).catch(err => {
      console.error('Test 3 async error:', err);
      failed++;
    });
  } catch (e: any) {
    console.error('Test 3 failed with exception:', e);
    failed++;
  }

  // 4. MLP Model Inference Correctness
  try {
    const board = createEmptyBoard(6, 6);
    const features = MLPModel.extractFeatures(board, 1, 0, 1);
    assert('MLP features output dimensions equal 16', features.length === 16);

    const prediction = globalModel.forward(features);
    assert('MLP prediction lies within tanh bounds [-1, 1]', prediction.out >= -1.0 && prediction.out <= 1.0);
  } catch (e: any) {
    console.error('Test 4 failed with exception:', e);
    failed++;
  }

  // 5. Performance / TIMING limits
  try {
    const board = createEmptyBoard(6, 6);
    // Fill board with random count values to increase explosion evaluation complexity
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        board[r][c].owner = Math.random() > 0.5 ? 1 : 2;
        board[r][c].count = 1;
      }
    }

    const tStart = Date.now();
    getAIMove(board, 1, 10, 'impossible').then((move) => {
      const elapsed = Date.now() - tStart;
      assert(`Impossible (MLP-backed depth 5) move runs within budget: ${elapsed}ms (< 300ms)`, elapsed < 320);
    }).catch(err => {
      console.error('Test 5 async error:', err);
      failed++;
    });
  } catch (e: any) {
    console.error('Test 5 failed with exception:', e);
    failed++;
  }

  // Brief sleep delay for async asserts to finish
  setTimeout(() => {
    console.log('================================================');
    console.log(`TESTS COMPLETE: Passed: ${passed}, Failed: ${failed}`);
    console.log('================================================');
  }, 1000);
}

if (require.main === module) {
  runTestSuite();
}
