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

export function useSocket(bindListeners = false) {
  const router = useRouter();
  const { playTap } = useSound();
  const {
    setRoomCode,
    setMyPlayerNumber,
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

    const onRoomCreated = ({ roomCode, playerNumber, playerName }: RoomCreatedPayload) => {
      setRoomCode(roomCode);
      setMyPlayerNumber(playerNumber);
      setPlayers([{ id: socket.id || '', name: playerName, playerNumber }]);
      router.push('/waiting');
    };

    const onRoomJoined = ({ roomCode, playerNumber }: RoomJoinedPayload) => {
      setRoomCode(roomCode);
      setMyPlayerNumber(playerNumber);
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
      setMovePending(false);
      setBoard(newBoard);
      setCurrentTurn(currentTurn);
      setTurnCount(turnCount);
      if (lastMove) {
        const { row, col, player } = lastMove;
        const rows = currentBoard.length;
        const cols = currentBoard[0]?.length || 6;
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          const prevCellCount = currentBoard[row][col]?.count || 0;
          const critMass = getCriticalMass(row, col, rows, cols);
          if (prevCellCount + 1 >= critMass) {
            addExplosion(row, col, player as Player);
          }
        }
        if (player !== myPlayerNumber) {
          playTap(player as Player);
        }
      }
    };

    const onTurnChange = ({ currentTurn }: { currentTurn: Player }) => {
      setCurrentTurn(currentTurn);
    };

    const onGameOver = ({ winner, winnerName }: GameOverPayload) => {
      setGameOver(true, winner, winnerName);
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
      setConnected(true);
      setReconnecting(false);
      router.push('/game');
    };

    const onPlayerLeft = ({ playerName }: { playerName: string }) => {
      // Handled in game screen via store subscription
      console.log(`[Socket] ${playerName} left the game`);
    };

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
    socket.on('turn-change', onTurnChange);
    socket.on('game-over', onGameOver);
    socket.on('game-restarted', onGameRestarted);
    socket.on('reconnect-success', onReconnectSuccess);
    socket.on('player-left', onPlayerLeft);
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
      socket.off('turn-change', onTurnChange);
      socket.off('game-over', onGameOver);
      socket.off('game-restarted', onGameRestarted);
      socket.off('reconnect-success', onReconnectSuccess);
      socket.off('player-left', onPlayerLeft);
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
    if (!roomCode || !myPlayerNumber) return;
    socket.emit('reconnect-to-room', { roomCode, playerNumber: myPlayerNumber });
  }, [roomCode, myPlayerNumber]);

  return { createRoom, joinRoom, makeMove, requestRestart, reconnectToRoom };
}
