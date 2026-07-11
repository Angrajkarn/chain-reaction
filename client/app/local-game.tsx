// ============================================================
// Local Pass & Play Game Screen — Offline 2-Player Mode
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
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
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

interface GameHistoryState {
  board: BoardState;
  currentTurn: Player;
  turnCount: number;
}

export default function LocalGameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const isExiting = useRef(false);
  const { lightTap, successNotify } = useHaptics();
  const { playTap, playVictory } = useSound();

  // Read grid size from persisted settings
  const gridSize = useSettingsStore((s) => s.gridSize);

  // Parse cols & rows count dynamically
  const [cols, rows] = useMemo(() => {
    const parts = gridSize.split('x');
    const c = parseInt(parts[0], 10) || 6;
    const r = parseInt(parts[1], 10) || 13;
    return [c, r];
  }, [gridSize]);

  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard(rows, cols));
  const [currentTurn, setCurrentTurn] = useState<Player>(1);
  const [turnCount, setTurnCount] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // Undo/Redo Game History engine state parameters
  const [history, setHistory] = useState<GameHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Intercept navigation back events (iOS swipe back, Expo header options, or custom routers)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isExiting.current) {
        return;
      }
      e.preventDefault();
      setMenuOpen(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Monitor Android hardware back button to trigger game menu pauses
  useEffect(() => {
    const onBackPress = () => {
      setMenuOpen(true);
      return true; // Prevents default routing exit behavior
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Toast warning message state when tap actions are rejected
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastTapTimeRef = useRef<number>(0);
  const currentStepExplosionsRef = useRef<ExplosionEvent[]>([]);

  // Track currently active explosions for the current cascade step
  const [activeExplosions, setActiveExplosions] = useState<ExplosionEvent[]>([]);

  // Keep stateRef fresh on every render to circumvent stale closures in stable callbacks.
  const stateRef = useRef({ board, currentTurn, turnCount, gameOver, activeExplosions, historyIndex });
  stateRef.current = { board, currentTurn, turnCount, gameOver, activeExplosions, historyIndex };

  const triggerStepExplosions = useCallback((explosions: ExplosionEvent[]) => {
    currentStepExplosionsRef.current = explosions;
    setActiveExplosions(explosions);
  }, []);

  // Sound play on game over
  useEffect(() => {
    if (gameOver && winner !== null) {
      successNotify();
      playVictory();
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

  // Fullscreen viewport rendering specs
  const GRID_MARGIN_TOP = 0;
  const { width: W, height: H } = Dimensions.get('window');
  const BOARD_HEIGHT = H;

  // Compute layouts dynamically
  const cellWidth = useMemo(() => W / cols, [W, cols]);
  const cellHeight = useMemo(() => BOARD_HEIGHT / rows, [BOARD_HEIGHT, rows]);

  // Resets or reinitializes the game board when grid settings change
  const resetBoardWithDimensions = useCallback((newRows: number, newCols: number) => {
    const emptyBoard = createEmptyBoard(newRows, newCols);
    setBoard(emptyBoard);
    setCurrentTurn(1);
    setTurnCount(0);
    setGameOver(false);
    setWinner(null);
    triggerStepExplosions([]);
    setToastMessage(null);

    // Initial history record
    setHistory([{
      board: emptyBoard,
      currentTurn: 1,
      turnCount: 0
    }]);
    setHistoryIndex(0);
  }, [triggerStepExplosions]);

  // Monitor grid option shifts
  useEffect(() => {
    resetBoardWithDimensions(rows, cols);
  }, [gridSize, rows, cols, resetBoardWithDimensions]);

  const commitTurnState = useCallback((nextBoard: BoardState, nextTurn: Player, nextTurnCount: number) => {
    const currentIndex = stateRef.current.historyIndex;
    setHistory((prev) => {
      const sliced = prev.slice(0, currentIndex + 1);
      return [...sliced, { board: nextBoard, currentTurn: nextTurn, turnCount: nextTurnCount }];
    });
    setHistoryIndex((prevIndex) => prevIndex + 1);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || activeExplosions.length > 0) return;

    lightTap();
    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];

    setBoard(prevState.board);
    setCurrentTurn(prevState.currentTurn);
    setTurnCount(prevState.turnCount);
    setHistoryIndex(prevIndex);
    
    // Clear game over if undoing the winning move
    setGameOver(false);
    setWinner(null);
  }, [historyIndex, history, activeExplosions.length, lightTap]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || activeExplosions.length > 0) return;

    lightTap();
    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];

    setBoard(nextState.board);
    setCurrentTurn(nextState.currentTurn);
    setTurnCount(nextState.turnCount);
    setHistoryIndex(nextIndex);

    // Recheck game over on redo
    const gameWinner = checkWinner(nextState.board, nextState.turnCount);
    if (gameWinner !== null) {
      setWinner(gameWinner);
      setGameOver(true);
    }
  }, [historyIndex, history, activeExplosions.length, lightTap]);

  // Resolves the results of explosions once all of them in a step have completed
  const resolveExplosionSplits = useCallback(
    (completedList: ExplosionEvent[]) => {
      setBoard((currentBoard) => {
        // Clone board
        let nextBoard = currentBoard.map((row) => row.map((cell) => ({ ...cell })));
        const nextExplosions: ExplosionEvent[] = [];

        // 1. Distribute orbs from exploded cells to neighbors
        completedList.forEach((exp) => {
          const neighbors = getAdjacentCells(exp.row, exp.col, rows, cols);
          neighbors.forEach(([nr, nc]) => {
            nextBoard[nr][nc].count += 1;
            nextBoard[nr][nc].owner = exp.player;
          });
        });

        // 2. Identify which cells have now reached critical mass
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const critMass = getCriticalMass(r, c, rows, cols);
            if (nextBoard[r][c].count >= critMass) {
               // Trigger explosion for next step, subtract critical mass
              nextBoard[r][c].count -= critMass;
              if (nextBoard[r][c].count === 0) {
                nextBoard[r][c].owner = null;
              }
              // Maintain the color of the active player making the move
              nextExplosions.push({
                row: r,
                col: c,
                player: completedList[0].player,
                id: randomId(),
              });
            }
          }
        }

        // 3. Chain reaction state routing
        if (nextExplosions.length > 0) {
          // Continue cascade
          triggerStepExplosions(nextExplosions);
        } else {
          // Finished cascade! Increment turn count and toggle player!
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

          commitTurnState(nextBoard, nextTurn, nextTurnCount);
        }

        return nextBoard;
      });
    },
    [rows, cols, commitTurnState, triggerStepExplosions]
  );

  const handleExplosionComplete = useCallback(
    (id: string) => {
      setActiveExplosions((prev) => {
        const remaining = prev.filter((e) => e.id !== id);
        if (remaining.length === 0) {
          const completedStep = currentStepExplosionsRef.current;
          setTimeout(() => {
            resolveExplosionSplits(completedStep);
          }, 10);
        }
        return remaining;
      });
    },
    [resolveExplosionSplits]
  );

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      const {
        board: currentBoard,
        currentTurn: turn,
        turnCount: count,
        gameOver: isOver,
        activeExplosions: exps,
      } = stateRef.current;

      // Ignore click if game over or if there is an active cascade running
      if (isOver) return;

      const now = Date.now();
      if (now - lastTapTimeRef.current < 250) {
        return;
      }
      lastTapTimeRef.current = now;
      
      if (exps.length > 0) {
        setToastMessage("Can't place");
        return;
      }
      
      if (!isValidMove(currentBoard, row, col, turn)) {
        setToastMessage("Can't place");
        return;
      }

      lightTap();
      playTap(turn);

      // Increment count on chosen cell
      let nextBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
      nextBoard[row][col].count += 1;
      nextBoard[row][col].owner = turn;

      const critMass = getCriticalMass(row, col, rows, cols);
      if (nextBoard[row][col].count >= critMass) {
        // Explode source cell immediately, subtract mass
        nextBoard[row][col].count -= critMass;
        if (nextBoard[row][col].count === 0) {
          nextBoard[row][col].owner = null;
        }

        setBoard(nextBoard);

        // Start sequential cascade steps
        const initialExplosion = {
          row,
          col,
          player: turn,
          id: randomId(),
        };
        triggerStepExplosions([initialExplosion]);
      } else {
        // Safe placement, pass turn immediately
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

        commitTurnState(nextBoard, nextTurn, nextTurnCount);
      }
    },
    [rows, cols, commitTurnState, lightTap, playTap, triggerStepExplosions]
  );

  const handlePlayAgain = () => {
    resetBoardWithDimensions(rows, cols);
  };

  const handleExit = () => {
    isExiting.current = true;
    router.replace('/home');
  };

  const isCascadeActive = activeExplosions.length > 0;

  return (
    <View style={styles.container}>
      {/* Game board template wrapper layout */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Underlay Cells */}
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
                isMyTurn={!isCascadeActive} // Lock cell touches if cascade is rendering
                myPlayerNumber={currentTurn}
                onPress={handleCellPress}
                maxRows={rows}
                maxCols={cols}
              />
            ))
          )}
        </View>

        {/* Top absolute overlay layer for unclipped, seamless traveling animations! */}
        {activeExplosions.map((exp) => (
          <View
            key={exp.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: exp.col * cellWidth,
              top: exp.row * cellHeight + GRID_MARGIN_TOP,
              width: cellWidth,
              height: cellHeight,
              overflow: 'visible', // Float freely across grid bounds without truncation
              zIndex: 999,      // Put above all grid cell boundaries
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

      {/* Tiny active player turn indicator bubble in overlay */}
      <SafeAreaView style={styles.statusOverlay} pointerEvents="none">
        <View
          style={[
            styles.turnBadge,
            {
              backgroundColor: currentTurn === 1 ? 'rgba(255, 75, 43, 0.15)' : 'rgba(0, 255, 61, 0.15)',
              borderColor: PLAYER_COLORS[currentTurn].primary,
            },
          ]}
        >
          <View
            style={[
              styles.turnDot,
              { backgroundColor: PLAYER_COLORS[currentTurn].primary },
            ]}
          />
          <Text style={styles.turnText}>
            {currentTurn === 1 ? 'PLAYER 1 (RED)' : 'PLAYER 2 (GREEN)'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Game Options / Pause Overlay Modal */}
      <Modal
        visible={menuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>GAME OPTIONS</Text>
            
            <TouchableOpacity 
              onPress={() => {
                lightTap();
                setMenuOpen(false);
              }} 
              style={[styles.menuBtn, styles.menuBtnPrimary]}
            >
              <Text style={styles.menuBtnText}>Resume Game</Text>
            </TouchableOpacity>

            <View style={styles.menuRow}>
              <TouchableOpacity 
                onPress={() => {
                  handleUndo();
                  setMenuOpen(false);
                }} 
                disabled={historyIndex <= 0 || isCascadeActive}
                style={[
                  styles.menuHalfBtn, 
                  (historyIndex <= 0 || isCascadeActive) && styles.menuBtnDisabled
                ]}
              >
                <Text style={styles.menuBtnText}>⏮️ Undo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => {
                  handleRedo();
                  setMenuOpen(false);
                }} 
                disabled={historyIndex >= history.length - 1 || isCascadeActive}
                style={[
                  styles.menuHalfBtn, 
                  (historyIndex >= history.length - 1 || isCascadeActive) && styles.menuBtnDisabled
                ]}
              >
                <Text style={styles.menuBtnText}>⏭️ Redo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => {
                lightTap();
                handlePlayAgain();
                setMenuOpen(false);
              }} 
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnText}>🔄 Reset Game</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                lightTap();
                setMenuOpen(false);
                setSettingsOpen(true);
              }} 
              style={styles.menuBtn}
            >
              <Text style={styles.menuBtnText}>⚙️ Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                lightTap();
                setMenuOpen(false);
                handleExit();
              }} 
              style={[styles.menuBtn, styles.menuBtnDanger]}
            >
              <Text style={styles.menuBtnText}>🚪 Exit to Main Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal overlay inside gameplay (returns to Pause Menu on close) */}
      <SettingsModal 
        visible={settingsOpen} 
        onClose={() => {
          setSettingsOpen(false);
          setMenuOpen(true);
        }} 
      />

      {/* Toast Notification for invalid taps */}
      {toastMessage && (
        <SafeAreaView style={styles.toastArea} pointerEvents="none">
          <View style={styles.toastCard}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* Winner Overlay Modal */}
      <WinnerModal
        visible={gameOver && winner !== null}
        winner={winner}
        winnerName={winner === 1 ? 'Player 1' : 'Player 2'}
        isMe={true}
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
    marginTop: 0, // Covers full screen completely
  },
  statusOverlay: {
    position: 'absolute',
    top: 45,
    alignSelf: 'center',
    zIndex: 10,
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
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
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
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
  menuBtnDisabled: {
    opacity: 0.35,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 12,
  },
  menuHalfBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
