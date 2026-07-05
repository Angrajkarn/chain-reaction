// ============================================================
// useGame — Game interaction hook with warnings
// ============================================================

import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from './useSocket';
import { useHaptics } from './useHaptics';
import { useSound } from './useSound';
import { isValidMove } from '../utils/gameEngine';
import { Player } from '../types';

export function useGame() {
  const {
    board,
    myPlayerNumber,
    currentTurn,
    gameOver,
    gameStarted,
    setToastMessage,
    movePending,
  } = useGameStore();

  const { makeMove, requestRestart } = useSocket();
  const { lightTap } = useHaptics();
  const { playTap } = useSound();

  const isMyTurn = myPlayerNumber === currentTurn;

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameOver) return;

      // Reject if game not started
      if (!gameStarted) {
        setToastMessage('Waiting for opponent...');
        return;
      }

      // Reject if there is a pending move submission to network
      if (movePending) {
        return;
      }

      // Reject if not my turn
      if (!isMyTurn || !myPlayerNumber) {
        setToastMessage("Not your turn yet! ⏳");
        return;
      }

      // Reject if cell is invalid (e.g. owned by opponent)
      if (!isValidMove(board, row, col, myPlayerNumber)) {
        setToastMessage("That cell belongs to your opponent! ❌");
        return;
      }

      lightTap();
      playTap(myPlayerNumber as Player);
      makeMove(row, col);
    },
    [board, gameStarted, gameOver, isMyTurn, myPlayerNumber, movePending, makeMove, lightTap, playTap, setToastMessage]
  );

  const handleRestart = useCallback(() => {
    requestRestart();
  }, [requestRestart]);

  return {
    isMyTurn,
    handleCellPress,
    handleRestart,
  };
}
