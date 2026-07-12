// ============================================================
// AI Game Screen — Human vs AI
// Human = Player 1 (RED), AI = Player 2 (GREEN)
// Reuses all existing board, cell, explosion, and winner logic.
// ============================================================

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { useHaptics } from '../hooks/useHaptics';
import { useSound } from '../hooks/useSound';
import { useSettingsStore } from '../store/settingsStore';
import {
  createEmptyBoard,
  isValidMove,
  checkWinner,
  getAdjacentCells,
  getCriticalMass,
} from '../utils/gameEngine';
import { BoardState, Player, ExplosionEvent } from '../types';
import Cell from '../components/Cell';
import Explosion from '../components/Explosion';
import WinnerModal from '../components/WinnerModal';
import SettingsModal from '../components/SettingsModal';
import { PLAYER_COLORS } from '../constants/colors';
import { randomId } from '../utils/helpers';
import { AIDifficulty } from '../ai/Difficulty';
import { computeAIMove } from '../ai/AIEngine';

const HUMAN_PLAYER: Player = 1;
const AI_PLAYER: Player = 2;

export default function AIGameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ difficulty: AIDifficulty }>();
  const difficulty: AIDifficulty = (params.difficulty as AIDifficulty) || 'easy';

  const isExiting = useRef(false);
  const { lightTap, successNotify } = useHaptics();
  const { playTap, playVictory } = useSound();

  const gridSize = useSettingsStore((s) => s.gridSize);

  const [cols, rows] = useMemo(() => {
    const parts = gridSize.split('x');
    const c = parseInt(parts[0], 10) || 6;
    const r = parseInt(parts[1], 10) || 13;
    return [c, r];
  }, [gridSize]);

  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard(rows, cols));
  const [currentTurn, setCurrentTurn] = useState<Player>(HUMAN_PLAYER);
  const [turnCount, setTurnCount] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);

  // Active explosion tracking (same as local-game.tsx)
  const currentStepExplosionsRef = useRef<ExplosionEvent[]>([]);
  const [activeExplosions, setActiveExplosions] = useState<ExplosionEvent[]>([]);

  // Stale-closure-free ref for all mutable state
  const stateRef = useRef({ board, currentTurn, turnCount, gameOver, activeExplosions });
  stateRef.current = { board, currentTurn, turnCount, gameOver, activeExplosions };

  // Flag to prevent double AI triggers
  const aiScheduledRef = useRef(false);
  const isCascadeInProgressRef = useRef(false);


  // ── Navigation guards ─────────────────────────────────────
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (isExiting.current) return;
      e.preventDefault();
      setMenuOpen(true);
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    const onBack = () => {
      setMenuOpen(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  // ── Toast auto-clear ──────────────────────────────────────
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 1000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // ── Sound on game over ────────────────────────────────────
  useEffect(() => {
    if (gameOver && winner !== null) {
      successNotify();
      playVictory();
    }
  }, [gameOver, winner]);

  // ── Reset board when grid size changes ───────────────────
  const resetBoard = useCallback(
    (newRows: number, newCols: number) => {
      setBoard(createEmptyBoard(newRows, newCols));
      setCurrentTurn(HUMAN_PLAYER);
      setTurnCount(0);
      setGameOver(false);
      setWinner(null);
      setActiveExplosions([]);
      currentStepExplosionsRef.current = [];
      setToastMessage(null);
      setIsAIThinking(false);
      aiScheduledRef.current = false;
      isCascadeInProgressRef.current = false;
    },
    []
  );

  useEffect(() => {
    resetBoard(rows, cols);
  }, [gridSize, rows, cols]);

  // ── Viewport ──────────────────────────────────────────────
  const { width: W, height: H } = Dimensions.get('window');
  const cellWidth = useMemo(() => W / cols, [W, cols]);
  const cellHeight = useMemo(() => H / rows, [H, rows]);

  const triggerStepExplosions = useCallback((explosions: ExplosionEvent[]) => {
    currentStepExplosionsRef.current = explosions;
    setActiveExplosions(explosions);
  }, []);

  // ── Cascade resolution (identical to local-game.tsx logic) ──
  const resolveExplosionSplits = useCallback(
    (completedList: ExplosionEvent[]) => {
      setBoard((currentBoard) => {
        let nextBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
        const nextExplosions: ExplosionEvent[] = [];

        completedList.forEach((exp) => {
          getAdjacentCells(exp.row, exp.col, rows, cols).forEach(([nr, nc]) => {
            nextBoard[nr][nc].count += 1;
            nextBoard[nr][nc].owner = exp.player;
          });
        });

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const critMass = getCriticalMass(r, c, rows, cols);
            if (nextBoard[r][c].count >= critMass) {
              nextBoard[r][c].count -= critMass;
              if (nextBoard[r][c].count === 0) nextBoard[r][c].owner = null;
              nextExplosions.push({
                row: r,
                col: c,
                player: completedList[0].player,
                id: randomId(),
              });
            }
          }
        }

        if (nextExplosions.length > 0) {
          triggerStepExplosions(nextExplosions);
        } else {
          // Cascade ended — advance turn
          isCascadeInProgressRef.current = false;
          const { currentTurn: turn, turnCount: count } = stateRef.current;
          const nextTurnCount = count + 1;
          const nextTurn: Player = turn === 1 ? 2 : 1;

          setTurnCount(nextTurnCount);
          setCurrentTurn(nextTurn);

          const gameWinner = checkWinner(nextBoard, nextTurnCount);
          if (gameWinner !== null) {
            setWinner(gameWinner);
            setGameOver(true);
          }
        }

        return nextBoard;
      });
    },
    [rows, cols, triggerStepExplosions]
  );

  const handleExplosionComplete = useCallback(
    (id: string) => {
      setActiveExplosions((prev) => {
        const remaining = prev.filter((e) => e.id !== id);
        if (remaining.length === 0) {
          const completedStep = currentStepExplosionsRef.current;
          setTimeout(() => resolveExplosionSplits(completedStep), 10);
        }
        return remaining;
      });
    },
    [resolveExplosionSplits]
  );

  // ── Place orb helper (shared by human and AI) ─────────────
  const applyOrbPlacement = useCallback(
    (
      currentBoard: BoardState,
      row: number,
      col: number,
      turn: Player,
      count: number
    ) => {
      playTap(turn);

      let nextBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
      nextBoard[row][col].count += 1;
      nextBoard[row][col].owner = turn;

      const critMass = getCriticalMass(row, col, rows, cols);
      if (nextBoard[row][col].count >= critMass) {
        nextBoard[row][col].count -= critMass;
        if (nextBoard[row][col].count === 0) nextBoard[row][col].owner = null;

        isCascadeInProgressRef.current = true;
        setBoard(nextBoard);
        triggerStepExplosions([{ row, col, player: turn, id: randomId() }]);
      } else {
        setBoard(nextBoard);
        const nextTurnCount = count + 1;
        const nextTurn: Player = turn === 1 ? 2 : 1;

        setTurnCount(nextTurnCount);
        setCurrentTurn(nextTurn);

        const gameWinner = checkWinner(nextBoard, nextTurnCount);
        if (gameWinner !== null) {
          setWinner(gameWinner);
          setGameOver(true);
        }
      }
    },
    [rows, cols, playTap, triggerStepExplosions]
  );

  // ── Human cell press ──────────────────────────────────────
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      const { board: b, currentTurn: turn, turnCount: count, gameOver: over, activeExplosions: exps } =
        stateRef.current;

      if (over) return;
      if (turn !== HUMAN_PLAYER) return; // Not human's turn
      if (exps.length > 0) {
        setToastMessage("Wait for animation");
        return;
      }
      if (isAIThinking) {
        setToastMessage("AI is thinking…");
        return;
      }
      if (!isValidMove(b, row, col, turn)) {
        setToastMessage("Can't place here");
        return;
      }

      lightTap();
      applyOrbPlacement(b, row, col, turn, count);
    },
    [applyOrbPlacement, isAIThinking, lightTap]
  );

  // ── AI turn trigger ───────────────────────────────────────
  // Fires whenever currentTurn becomes AI_PLAYER and cascade is idle
  useEffect(() => {
    const { gameOver: over, activeExplosions: exps } = stateRef.current;

    if (over) return;
    if (currentTurn !== AI_PLAYER) return;
    if (exps.length > 0) return;
    if (isCascadeInProgressRef.current) return;
    if (aiScheduledRef.current) return;

    aiScheduledRef.current = true;
    setIsAIThinking(true);

    // Capture board/turn/count at this moment (stable inside async closure)
    const boardSnap = stateRef.current.board;
    const countSnap = stateRef.current.turnCount;

    computeAIMove(boardSnap, AI_PLAYER, countSnap, difficulty)
      .then((move) => {
        aiScheduledRef.current = false;
        setIsAIThinking(false);

        if (!move) return; // No moves available (shouldn't happen)

        const { board: currentBoard, turnCount: currentCount, gameOver: isOver } =
          stateRef.current;
        if (isOver) return;

        applyOrbPlacement(currentBoard, move.row, move.col, AI_PLAYER, currentCount);
      })
      .catch(() => {
        aiScheduledRef.current = false;
        setIsAIThinking(false);
      });
  }, [currentTurn, activeExplosions.length, difficulty, applyOrbPlacement]);

  // ── Play again / exit ─────────────────────────────────────
  const handlePlayAgain = () => {
    resetBoard(rows, cols);
  };

  const handleExit = () => {
    isExiting.current = true;
    router.replace('/home');
  };

  const isCascadeActive = activeExplosions.length > 0;

  // ── Difficulty label for UI ──────────────────────────────
  const difficultyLabel =
    difficulty === 'easy'
      ? '🟢 Easy'
      : difficulty === 'medium'
      ? '🟡 Medium'
      : difficulty === 'hard'
      ? '🔴 Hard'
      : '💀 Impossible';

  // ── Winner name ───────────────────────────────────────────
  const winnerName =
    winner === HUMAN_PLAYER ? 'You' : `AI (${difficultyLabel})`;

  return (
    <View style={styles.container}>
      {/* Game board */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Cells */}
        <View style={styles.gridContainer}>
          {board.map((rowData, row) =>
            rowData.map((cellData, col) => (
              <Cell
                key={`${row}-${col}`}
                row={row}
                col={col}
                data={cellData}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                isMyTurn={!isCascadeActive && !isAIThinking && currentTurn === HUMAN_PLAYER}
                myPlayerNumber={HUMAN_PLAYER}
                onPress={handleCellPress}
                maxRows={rows}
                maxCols={cols}
              />
            ))
          )}
        </View>

        {/* Explosion animations */}
        {activeExplosions.map((exp) => (
          <View
            key={exp.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: exp.col * cellWidth,
              top: exp.row * cellHeight,
              width: cellWidth,
              height: cellHeight,
              overflow: 'visible',
              zIndex: 999,
            }}
          >
            <Explosion
              id={exp.id}
              player={exp.player}
              row={exp.row}
              col={exp.col}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              maxRows={rows}
              maxCols={cols}
              onComplete={() => handleExplosionComplete(exp.id)}
            />
          </View>
        ))}
      </View>

      {/* Status bar overlay */}
      <SafeAreaView style={styles.statusOverlay} pointerEvents="none">
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                currentTurn === HUMAN_PLAYER
                  ? 'rgba(255, 45, 85, 0.15)'
                  : 'rgba(50, 215, 75, 0.15)',
              borderColor: PLAYER_COLORS[currentTurn].primary,
            },
          ]}
        >
          {isAIThinking ? (
            <>
              <ActivityIndicator
                size="small"
                color={PLAYER_COLORS[AI_PLAYER].primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.statusText, { color: PLAYER_COLORS[AI_PLAYER].primary }]}>
                AI THINKING…
              </Text>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.turnDot,
                  { backgroundColor: PLAYER_COLORS[currentTurn].primary },
                ]}
              />
              <Text style={[styles.statusText, { color: PLAYER_COLORS[currentTurn].primary }]}>
                {currentTurn === HUMAN_PLAYER ? 'YOUR TURN' : 'AI TURN'}
              </Text>
            </>
          )}
        </View>

        {/* Difficulty chip */}
        <View style={styles.difficultyChip}>
          <Text style={styles.difficultyText}>{difficultyLabel}</Text>
        </View>
      </SafeAreaView>

      {/* Pause menu modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>GAME OPTIONS</Text>

            <TouchableOpacity
              onPress={() => { lightTap(); setMenuOpen(false); }}
              style={[styles.menuBtn, styles.menuBtnPrimary]}
            >
              <Text style={styles.menuBtnText}>▶ Resume Game</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { lightTap(); handlePlayAgain(); setMenuOpen(false); }}
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnText}>🔄 New Game</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { lightTap(); setMenuOpen(false); setSettingsOpen(true); }}
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnText}>⚙️ Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { lightTap(); setMenuOpen(false); handleExit(); }}
              style={[styles.menuBtn, styles.menuBtnDanger]}
            >
              <Text style={styles.menuBtnText}>🚪 Exit to Main Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SettingsModal
        visible={settingsOpen}
        onClose={() => { setSettingsOpen(false); setMenuOpen(true); }}
      />

      {/* Toast */}
      {toastMessage && (
        <SafeAreaView style={styles.toastArea} pointerEvents="none">
          <View style={styles.toastCard}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Winner modal */}
      <WinnerModal
        visible={gameOver && winner !== null}
        winner={winner}
        winnerName={winnerName}
        isMe={winner === HUMAN_PLAYER}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    overflow: 'visible',
    width: '100%',
    marginTop: 0,
  },
  statusOverlay: {
    position: 'absolute',
    top: 45,
    alignSelf: 'center',
    zIndex: 10,
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
  },
  difficultyChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  difficultyText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  toastArea: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    zIndex: 1000,
  },
  toastCard: {
    backgroundColor: '#ff3333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '85%',
    backgroundColor: '#12121a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    alignItems: 'stretch',
  },
  menuTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  menuBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnPrimary: {
    backgroundColor: '#ff4b2b',
    borderColor: '#ff4b2b',
  },
  menuBtnDanger: {
    backgroundColor: 'rgba(255, 50, 50, 0.15)',
    borderColor: 'rgba(255, 50, 50, 0.3)',
  },
  menuBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
