// ============================================================
// useSocket — Manages Socket.IO events and game state sync
// ============================================================

import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import {
  RoomCreatedPayload,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  BoardUpdatePayload,
  GameOverPayload,
  ReconnectSuccessPayload,
  GameRestartedPayload,
  Player,
} from '../types';
import { useSound } from './useSound';
import { getCriticalMass } from '../utils/gameEngine';
import { randomId } from '../utils/helpers';

export function useSocket(bindListeners = false) {
  const router = useRouter();
  const { playTap } = useSound();
  const {
    setRoomCode,
    setMyPlayerNumber,
    setMyReconnectToken, // BUG-001
    setPlayers,
    setBoard,
    setCurrentTurn,
    setTurnCount,
    setGameStarted,
    setGameOver,
    addExplosion,
    setConnected,
    setReconnecting,
    setToastMessage,
    setMovePending,
    setPendingOnlineBoard,
    resetForNewGame,
    fullReset,
    roomCode,
    myPlayerNumber,
  } = useGameStore();

  useEffect(() => {
    if (!bindListeners) return;
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onReconnecting = () => {
      setReconnecting(true);
    };

    const onRoomCreated = ({ roomCode, playerNumber, playerName, reconnectToken }: RoomCreatedPayload) => {
      setRoomCode(roomCode);
      setMyPlayerNumber(playerNumber);
      setMyReconnectToken(reconnectToken); // BUG-001
      setPlayers([{ id: socket.id || '', name: playerName, playerNumber }]);
      router.push('/waiting');
    };

    const onRoomJoined = ({ roomCode, playerNumber, reconnectToken }: RoomJoinedPayload) => {
      setRoomCode(roomCode);
      setMyPlayerNumber(playerNumber);
      setMyReconnectToken(reconnectToken); // BUG-001
    };

    const onPlayerJoined = ({ players, gameStarted, board, currentTurn }: PlayerJoinedPayload) => {
      setPlayers(players);
      setBoard(board);
      setCurrentTurn(currentTurn);
      setGameStarted(gameStarted);
      if (gameStarted) {
        router.push('/game');
      }
    };

    const onBoardUpdate = ({ board: newBoard, currentTurn, turnCount, lastMove }: BoardUpdatePayload) => {
      const currentBoard = useGameStore.getState().board;
      const freshPlayerNumber = useGameStore.getState().myPlayerNumber;
      setMovePending(false);
      if (lastMove) {
        const { row, col, player } = lastMove;
        const rows = currentBoard.length;
        const cols = currentBoard[0]?.length || 6;
        if (player !== freshPlayerNumber) {
          playTap(player as Player);
        }
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          const prevCellCount = currentBoard[row][col]?.count || 0;
          const critMass = getCriticalMass(row, col, rows, cols);
          if (prevCellCount + 1 >= critMass) {
            // Cascade — apply step-0 board (orb placed + source cell decremented)
            const stepBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
            // BUG-004: Clamp to 0 to prevent negative orb counts when client/server drift
            stepBoard[row][col].count = Math.max(0, prevCellCount + 1 - critMass);
            stepBoard[row][col].owner = stepBoard[row][col].count === 0 ? null : (player as Player);
            
            // Atomic batch update to prevent blinking (no frame gap between board write and explosion mount)
            useGameStore.setState((state) => ({
              board: stepBoard,
              pendingOnlineBoard: { board: newBoard, currentTurn, turnCount },
              explosions: [...state.explosions, { row, col, player: player as Player, id: randomId() }],
            }));
            return;
          }
        }
      }
      // No cascade — set final board immediately
      useGameStore.setState({
        board: newBoard,
        currentTurn,
        turnCount,
      });
    };

    // BUG-006: turn-change is removed — currentTurn is already inside board-update payload.
    // Keeping listener registration would do nothing harmful but wastes a round-trip.

    const onGameOver = ({ winner, winnerName }: GameOverPayload) => {
      const isCascadeActive = useGameStore.getState().pendingOnlineBoard !== null;
      if (isCascadeActive) {
        useGameStore.setState({
          pendingOnlineGameOver: { winner, winnerName },
        });
      } else {
        setGameOver(true, winner, winnerName);
      }
    };

    const onGameRestarted = ({ board, currentTurn, players }: GameRestartedPayload) => {
      resetForNewGame();
      setBoard(board);
      setCurrentTurn(currentTurn);
      setPlayers(players);
    };

    const onReconnectSuccess = ({
      board,
      currentTurn,
      players,
      playerNumber,
      gameOver,
      winner,
    }: ReconnectSuccessPayload) => {
      setBoard(board);
      setCurrentTurn(currentTurn);
      setPlayers(players);
      setMyPlayerNumber(playerNumber);
      setGameOver(gameOver, winner, null);
      setGameStarted(true); // Ensure game is interactive after reconnect
      setConnected(true);
      setReconnecting(false);
      // Only navigate if not already on the game screen
      router.push('/game');
    };

    // BUG-015: player-left handled exclusively in game.tsx. Removed duplicate here.

    const onError = ({ message }: { message: string }) => {
      console.error(`[Socket Error] ${message}`);
      setToastMessage(message);
      setMovePending(false);
    };

    const onJoinError = ({ message }: { message: string }) => {
      // Re-emitted so join screen can catch it
      socket.emit('__join-error-local', { message });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnecting);
    socket.on('room-created', onRoomCreated);
    socket.on('room-joined', onRoomJoined);
    socket.on('player-joined', onPlayerJoined);
    socket.on('board-update', onBoardUpdate);
    // BUG-006: 'turn-change' listener removed — handled by board-update
    socket.on('game-over', onGameOver);
    socket.on('game-restarted', onGameRestarted);
    socket.on('reconnect-success', onReconnectSuccess);
    // BUG-015: 'player-left' removed — handled in game.tsx directly
    socket.on('error', onError);
    socket.on('join-error', onJoinError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnecting);
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('player-joined', onPlayerJoined);
      socket.off('board-update', onBoardUpdate);
      socket.off('game-over', onGameOver);
      socket.off('game-restarted', onGameRestarted);
      socket.off('reconnect-success', onReconnectSuccess);
      socket.off('error', onError);
      socket.off('join-error', onJoinError);
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    const socket = getSocket();
    socket.emit('create-room', { playerName });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const socket = getSocket();
    socket.emit('join-room', { roomCode, playerName });
  }, []);

  const makeMove = useCallback(
    (row: number, col: number) => {
      const socket = getSocket();
      if (!roomCode) return;
      setMovePending(true);
      socket.emit('move', {
        roomCode,
        row,
        col,
        playerId: socket.id,
      });

      // Fail-safe: Auto-reset pending lock after 3 seconds in case of network drops
      setTimeout(() => {
        if (useGameStore.getState().movePending) {
          setMovePending(false);
        }
      }, 3000);
    },
    [roomCode, setMovePending]
  );

  const requestRestart = useCallback(() => {
    const socket = getSocket();
    if (!roomCode) return;
    socket.emit('restart', { roomCode });
  }, [roomCode]);

  const reconnectToRoom = useCallback(() => {
    const socket = getSocket();
    const state = useGameStore.getState();
    if (!state.roomCode || !state.myPlayerNumber || !state.myReconnectToken) return;
    // BUG-001: Send the server-issued token so the server can authenticate us
    socket.emit('reconnect-to-room', {
      roomCode: state.roomCode,
      playerNumber: state.myPlayerNumber,
      reconnectToken: state.myReconnectToken,
    });
  }, []);

  return { createRoom, joinRoom, makeMove, requestRestart, reconnectToRoom };
}
