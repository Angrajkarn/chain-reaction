// ============================================================
// Waiting Screen — Waiting for opponent to join
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import ParticleBackground from '../components/ParticleBackground';
import { useGameStore } from '../store/gameStore';
import { disconnectSocket } from '../services/socket';

function PulsingDot({ delay, color }: { delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animScale = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    const animOpacity = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    const t = setTimeout(() => {
      Animated.parallel([animScale, animOpacity]).start();
    }, delay);

    return () => {
      clearTimeout(t);
      animScale.stop();
      animOpacity.stop();
    };
  }, [scale, opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          shadowColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export default function WaitingScreen() {
  const router = useRouter();
  const roomCode = useGameStore((s) => s.roomCode);
  const players = useGameStore((s) => s.players);
  const fullReset = useGameStore((s) => s.fullReset);

  const handleCancel = () => {
    disconnectSocket();
    fullReset();
    router.replace('/home');
  };

  const handleCopy = async () => {
    if (!roomCode) return;
    await Clipboard.setStringAsync(roomCode);
    Alert.alert('Copied!', `Room code ${roomCode} copied to clipboard`);
  };

  const handleShare = async () => {
    if (!roomCode) return;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync('', {
        dialogTitle: `Join my Chain Reaction room: ${roomCode}`,
        mimeType: 'text/plain',
      });
    } else {
      await Clipboard.setStringAsync(roomCode);
      Alert.alert('Copied!', 'Room code copied to clipboard');
    }
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={handleCancel} style={styles.back}>
          <Text style={styles.backText}>✕ Cancel</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Room Created!</Text>

          <GlassCard style={styles.codeCard} glowColor={COLORS.neonBlue}>
            <Text style={styles.codeLabel}>ROOM CODE</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
            <View style={styles.codeActions}>
              <Button
                label="📋 Copy"
                onPress={handleCopy}
                variant="secondary"
                style={styles.codeBtn}
              />
              <Button
                label="📤 Share"
                onPress={handleShare}
                variant="secondary"
                style={styles.codeBtn}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.waitCard}>
            <Text style={styles.waitTitle}>⏳ Waiting for Opponent</Text>

            {/* Animated dots */}
            <View style={styles.dotsRow}>
              <PulsingDot delay={0} color={COLORS.neonBlue} />
              <PulsingDot delay={200} color={COLORS.neonPurple} />
              <PulsingDot delay={400} color={COLORS.player2} />
            </View>

            <Text style={styles.waitSubtitle}>
              You are Player 1 (Red){'\n'}
              Opponent will be Player 2 (Green)
            </Text>

            {/* Player slot indicators */}
            <View style={styles.slots}>
              <View style={[styles.slot, { borderColor: COLORS.player1 }]}>
                <Text style={[styles.slotIcon, { color: COLORS.player1 }]}>👤</Text>
                <Text style={[styles.slotLabel, { color: COLORS.player1 }]}>YOU</Text>
                <Text style={styles.slotName} numberOfLines={1}>
                  {players[0]?.name ?? '—'}
                </Text>
              </View>

              <Text style={styles.vs}>VS</Text>

              <View style={[styles.slot, { borderColor: COLORS.glassBorder }]}>
                <Text style={[styles.slotIcon, { color: COLORS.textMuted }]}>❓</Text>
                <Text style={[styles.slotLabel, { color: COLORS.textMuted }]}>OPPONENT</Text>
                <Text style={[styles.slotName, { color: COLORS.textMuted }]}>Waiting...</Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safe: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  back: { alignSelf: 'flex-start' },
  backText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
  codeCard: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  codeLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  codeActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    width: '100%',
  },
  codeBtn: { flex: 1 },
  roomCode: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.neonBlue,
    letterSpacing: 10,
    textShadowColor: COLORS.neonBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  codeHint: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  waitCard: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  waitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    height: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  waitSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  slots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  slot: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  slotIcon: { fontSize: 24 },
  slotLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  slotName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  vs: {
    color: COLORS.textMuted,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  },
});
