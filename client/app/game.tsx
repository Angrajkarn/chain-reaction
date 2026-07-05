// ============================================================
// Game Screen — Main gameplay screen
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
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
import { getSocket, disconnectSocket } from '../services/socket';
import { Player } from '../types';

export default function GameScreen() {
  const router = useRouter();
  const { heavyPulse, successNotify } = useHaptics();
  const { playVictory, playDefeat } = useSound();

  const {
    players,
    roomCode,
    myPlayerNumber,
    gameOver,
    winner,
    winnerName,
    isReconnecting,
    toastMessage,
    setToastMessage,
  } = useGameStore();

  const {
    setMyRequestedRestart,
    fullReset,
  } = useGameStore();

  const { isMyTurn, handleCellPress, handleRestart } = useGame();

  const [opponentLeftVisible, setOpponentLeftVisible] = useState(false);
  const [opponentLeftName, setOpponentLeftName] = useState('');

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

  // Haptics + sound on game over
  useEffect(() => {
    if (gameOver && winner !== null) {
      if (winner === myPlayerNumber) {
        successNotify();
        playVictory();
      } else {
        heavyPulse();
        playDefeat();
      }
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
    setMyRequestedRestart(true);
    handleRestart();
  };

  const handleExit = () => {
    disconnectSocket();
    fullReset();
    router.replace('/home');
  };

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

      {/* Winner Modal */}
      <WinnerModal
        visible={gameOver && winner !== null}
        winner={winner}
        winnerName={winnerName}
        isMe={winner === myPlayerNumber}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
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
});
