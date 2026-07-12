// ============================================================
// Game Screen — Main gameplay screen
// ============================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Modal,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { useGame } from '../hooks/useGame';
import { useHaptics } from '../hooks/useHaptics';
import { useSound } from '../hooks/useSound';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import GameBoard from '../components/GameBoard';
import WinnerModal from '../components/WinnerModal';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import Header from '../components/Header';
import SettingsModal from '../components/SettingsModal';
import { getSocket, disconnectSocket } from '../services/socket';
import { Player, ExplosionEvent } from '../types';
import { getAdjacentCells, getCriticalMass } from '../utils/gameEngine';
import { randomId } from '../utils/helpers';

export default function GameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const isExiting = useRef(false);
  const { heavyPulse, successNotify } = useHaptics();
  const { playVictory, playDefeat } = useSound();

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    players,
    roomCode,
    myPlayerNumber,
    currentTurn,
    gameOver,
    winner,
    winnerName,
    isReconnecting,
    toastMessage,
    setToastMessage,
    explosions,
    setBoard,
    setCurrentTurn: setStoreTurn,
    setTurnCount: setStoreTurnCount,
    addExplosion,
    pendingOnlineBoard,
    setPendingOnlineBoard,
  } = useGameStore();

  const {
    setMyRequestedRestart,
    fullReset,
  } = useGameStore();

  const { isMyTurn, handleCellPress, handleRestart } = useGame();

  const [opponentLeftVisible, setOpponentLeftVisible] = useState(false);
  const [opponentLeftName, setOpponentLeftName] = useState('');

  // ── Online Cascade Animation Engine ───────────────────────────
  const onlineStepRef = useRef<ExplosionEvent[]>([]);
  const onlineStepIdsRef = useRef<Set<string>>(new Set());
  // BUG-005: Session counter increments on every new game so stale cascades are
  // detected and aborted if a restart is received while animations are in flight.
  const sessionIdRef = useRef(0);

  const resolveOnlineStep = useCallback((completedList: ExplosionEvent[], capturedSession: number) => {
    // BUG-005: Abort if a restart/new-game changed the session while we were animating
    if (capturedSession !== sessionIdRef.current) return;

    const currentBoard = useGameStore.getState().board;
    const rows = currentBoard.length;
    const cols = currentBoard[0]?.length || 6;
    let nextBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
    const nextExplosions: ExplosionEvent[] = [];

    // Distribute orbs from completed explosions to neighbors
    completedList.forEach((exp) => {
      getAdjacentCells(exp.row, exp.col, rows, cols).forEach(([nr, nc]) => {
        nextBoard[nr][nc].count += 1;
        nextBoard[nr][nc].owner = exp.player;
      });
    });

    // Find cells that hit critical mass
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const critMass = getCriticalMass(r, c, rows, cols);
        if (nextBoard[r][c].count >= critMass) {
          nextBoard[r][c].count -= critMass;
          if (nextBoard[r][c].count === 0) nextBoard[r][c].owner = null;
          nextExplosions.push({ row: r, col: c, player: completedList[0].player, id: randomId() });
        }
      }
    }

    if (nextExplosions.length > 0) {
      const newExplosionEvents = nextExplosions.map((e) => ({
        row: e.row,
        col: e.col,
        player: e.player,
        id: randomId(),
      }));

      // Atomic batch update to prevent rendering flashes and components resetting/blinking
      useGameStore.setState((state) => ({
        board: nextBoard,
        explosions: [...state.explosions, ...newExplosionEvents],
      }));

      onlineStepRef.current = newExplosionEvents;
      onlineStepIdsRef.current = new Set(newExplosionEvents.map((e) => e.id));
    } else {
      // Cascade finished — sync to server-authoritative final board
      const pending = useGameStore.getState().pendingOnlineBoard;
      if (pending) {
        // Retrieve and process deferred game over if it arrived during the active cascade
        const pendingOver = useGameStore.getState().pendingOnlineGameOver;

        useGameStore.setState({
          board: pending.board,
          currentTurn: pending.currentTurn,
          turnCount: pending.turnCount,
          pendingOnlineBoard: null,
          ...(pendingOver ? {
            gameOver: true,
            winner: pendingOver.winner,
            winnerName: pendingOver.winnerName,
            pendingOnlineGameOver: null,
          } : {}),
        });
      }
    }
    // BUG-019: useCallback deps list was populated with store action refs that
    // are never actually called directly here (we use getState/setState). Removed.
  }, []);

  // Register initial explosion batch when cascade starts
  useEffect(() => {
    if (pendingOnlineBoard !== null && explosions.length > 0 && onlineStepIdsRef.current.size === 0) {
      onlineStepRef.current = [...explosions];
      onlineStepIdsRef.current = new Set(explosions.map((e) => e.id));
    }
  }, [pendingOnlineBoard, explosions]);

  // Detect when current explosion batch completes, then resolve next step
  useEffect(() => {
    if (onlineStepIdsRef.current.size === 0) return;
    const remaining = explosions.filter((e) => onlineStepIdsRef.current.has(e.id));
    if (remaining.length === 0) {
      const completedStep = [...onlineStepRef.current];
      const capturedSession = sessionIdRef.current; // BUG-005: capture before async
      onlineStepRef.current = [];
      onlineStepIdsRef.current = new Set();
      setTimeout(() => resolveOnlineStep(completedStep, capturedSession), 10);
    }
  }, [explosions, resolveOnlineStep]);

  // Abort cascade if server declares game over before animations finish
  useEffect(() => {
    if (gameOver) {
      onlineStepRef.current = [];
      onlineStepIdsRef.current = new Set();
      sessionIdRef.current += 1; // BUG-005: invalidate any in-flight cascade
      if (useGameStore.getState().pendingOnlineBoard !== null) {
        setPendingOnlineBoard(null);
      }
    }
  }, [gameOver, setPendingOnlineBoard]);
  // ── End Online Cascade Engine ──────────────────────────────────

  // Intercept iOS swipe-back and Expo navigation back gesture → open pause menu
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (isExiting.current || gameOver) return;
      e.preventDefault();
      setMenuOpen(true);
    });
    return unsubscribe;
  }, [navigation, gameOver]);

  // BUG-020: Keep a ref to the auto-exit timer so it can be cancelled if user
  // opens the pause menu during the 2500ms loser window.
  const loseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intercept Android hardware back button → open pause menu
  useEffect(() => {
    const onBackPress = () => {
      if (gameOver) return false;
      // BUG-020: Cancel the pending auto-exit timer so it doesn't navigate
      // while the pause menu is visible.
      if (loseTimerRef.current !== null) {
        clearTimeout(loseTimerRef.current);
        loseTimerRef.current = null;
      }
      setMenuOpen(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [gameOver]);

  // Handle "player-left" socket event
  useEffect(() => {
    const socket = getSocket();
    const onPlayerLeft = ({ playerName, temporary }: { playerName: string; temporary?: boolean }) => {
      if (temporary) {
        // Brief drop — don't show modal, just show a toast
        setToastMessage(`${playerName} briefly disconnected...`);
        return;
      }
      setOpponentLeftName(playerName);
      setOpponentLeftVisible(true);
    };
    socket.on('player-left', onPlayerLeft);
    return () => { socket.off('player-left', onPlayerLeft); };
  }, []);

  // Disconnect socket on unmount ONLY if game is over or user explicitly exits
  // Do NOT disconnect on normal navigation (e.g. accidental back press)
  // Intentional exit is handled by handleExit() below

  // BUG-008: Added all referenced values to dep array.
  // Stable callbacks (disconnectSocket, fullReset, router, haptics, sounds)
  // are read via ref-style access inside the effect to avoid re-subscribing.
  const loseHandlersRef = useRef({ successNotify, playVictory, heavyPulse, playDefeat, disconnectSocket, fullReset, router });
  loseHandlersRef.current = { successNotify, playVictory, heavyPulse, playDefeat, disconnectSocket, fullReset, router };

  useEffect(() => {
    if (!gameOver || winner === null) return;
    const { successNotify, playVictory, heavyPulse, playDefeat, disconnectSocket, fullReset, router } = loseHandlersRef.current;
    const myNum = useGameStore.getState().myPlayerNumber;
    if (winner === myNum) {
      successNotify();
      playVictory();
    } else {
      heavyPulse();
      playDefeat();
      // BUG-020: Store the timer so it can be cancelled if the pause menu opens
      loseTimerRef.current = setTimeout(() => {
        loseTimerRef.current = null;
        disconnectSocket();
        fullReset();
        router.replace('/home');
      }, 2500);
      return () => {
        if (loseTimerRef.current !== null) {
          clearTimeout(loseTimerRef.current);
          loseTimerRef.current = null;
        }
      };
    }
  }, [gameOver, winner]);

  // Toast message auto-dimmer timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handlePlayAgain = () => {
    sessionIdRef.current += 1; // BUG-005: invalidate any leftover cascade from previous game
    setMyRequestedRestart(true);
    handleRestart();
  };


  const handleExit = useCallback(() => {
    isExiting.current = true;
    disconnectSocket();
    fullReset();
    router.replace('/home');
  }, []);

  return (
    <View style={styles.container}>
      {/* Game Board - taking full absolute screen space */}
      <View style={StyleSheet.absoluteFillObject}>
        <GameBoard
          isMyTurn={isMyTurn}
          myPlayerNumber={myPlayerNumber as Player | null}
          onCellPress={handleCellPress}
        />
      </View>

      {/* Header overlay: player names + turn indicator + room code */}
      {players.length === 2 && roomCode && (
        <SafeAreaView style={styles.headerOverlay} pointerEvents="none">
          <Header
            players={players}
            currentTurn={currentTurn}
            roomCode={roomCode}
            myPlayerNumber={myPlayerNumber}
          />
        </SafeAreaView>
      )}

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <SafeAreaView style={styles.reconnectContainer}>
          <View style={styles.reconnectBanner}>
            <Text style={styles.reconnectText}>🔄 Reconnecting...</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Toast Notification for invalid taps */}
      {toastMessage && (
        <SafeAreaView style={styles.toastArea} pointerEvents="none">
          <View style={styles.toastCard}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Winner Modal — only shown to the WINNER */}
      <WinnerModal
        visible={gameOver && winner !== null && winner === myPlayerNumber}
        winner={winner}
        winnerName={winnerName}
        isMe={true}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />

      {/* Loser overlay — shown briefly before auto-redirect */}
      {gameOver && winner !== null && winner !== myPlayerNumber && (
        <View style={styles.loseOverlay}>
          <Text style={styles.loseEmoji}>💔</Text>
          <Text style={styles.loseTitle}>DEFEATED</Text>
          <Text style={styles.loseSubtitle}>{winnerName ?? `Player ${winner}`} wins this round...</Text>
          <Text style={styles.loseHint}>Going back to home...</Text>
        </View>
      )}

      {/* ─── Pause Menu Modal (back press) ───────────────────── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>⏸ GAME PAUSED</Text>

            {roomCode && (
              <Text style={styles.menuRoomCode}>Room: {roomCode}</Text>
            )}

            {/* Resume */}
            <TouchableOpacity
              onPress={() => setMenuOpen(false)}
              style={[styles.menuBtn, styles.menuBtnPrimary]}
            >
              <Text style={styles.menuBtnText}>▶  Resume Game</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnText}>⚙️  Settings</Text>
            </TouchableOpacity>

            {/* Exit */}
            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                handleExit();
              }}
              style={[styles.menuBtn, styles.menuBtnDanger]}
            >
              <Text style={styles.menuBtnText}>🚪  Exit to Main Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings modal (opened from pause menu) */}
      <SettingsModal
        visible={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setMenuOpen(true);
        }}
      />

      {/* Opponent Left Modal */}
      <Modal visible={opponentLeftVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <GlassCard style={styles.alertCard} glowColor={COLORS.player1}>
            <Text style={styles.alertTitle}>😔 Opponent Left</Text>
            <Text style={styles.alertBody}>
              {opponentLeftName} has disconnected from the game.
            </Text>
            <View style={styles.alertBtns}>
              <Button
                label="Wait for Reconnect"
                onPress={() => setOpponentLeftVisible(false)}
                variant="secondary"
                style={styles.alertBtn}
              />
              <Button
                label="Exit Game"
                onPress={() => {
                  setOpponentLeftVisible(false);
                  handleExit();
                }}
                variant="danger"
                style={styles.alertBtn}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  reconnectContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  reconnectBanner: {
    backgroundColor: 'rgba(255, 107, 0, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.50)',
    borderRadius: 8,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  reconnectText: {
    color: '#FF6B00',
    fontWeight: '700',
    fontSize: 13,
  },
  toastArea: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    zIndex: 1000,
  },
  toastCard: {
    backgroundColor: '#ff3333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#ff3333',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  alertCard: {
    width: '100%',
    gap: SPACING.md,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alertBody: {
    color: 'rgba(255, 255, 255, 0.60)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  alertBtns: {
    flexDirection: 'column',
    gap: SPACING.sm,
    width: '100%',
  },
  alertBtn: { width: '100%' },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  loseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    gap: SPACING.md,
  },
  loseEmoji: { fontSize: 72, marginBottom: SPACING.sm },
  loseTitle: { fontSize: 36, fontWeight: '900', color: '#ff2d55', letterSpacing: 4 },
  loseSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loseHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
    marginTop: SPACING.sm,
  },
  // ─── Pause menu styles ───────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,10,0.87)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '85%',
    backgroundColor: '#12121a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
    gap: 14,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  menuTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  menuRoomCode: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: -8,
  },
  menuBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnPrimary: {
    backgroundColor: 'rgba(0,212,255,0.15)',
    borderColor: 'rgba(0,212,255,0.35)',
  },
  menuBtnDanger: {
    backgroundColor: 'rgba(255,50,50,0.12)',
    borderColor: 'rgba(255,50,50,0.28)',
  },
  menuBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
