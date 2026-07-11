// ============================================================
// WinnerModal — Trophy animation + confetti + winner card
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, PLAYER_COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import { Player } from '../types';
import Button from './Button';

const { width: W } = Dimensions.get('window');

interface WinnerModalProps {
  visible: boolean;
  winner: Player | null;
  winnerName: string | null;
  isMe: boolean;
  onPlayAgain: () => void;
  onExit: () => void;
}

function ConfettiPiece({ x, color, delay }: { x: number; color: string; delay: number }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotateVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: Dimensions.get('window').height + 20,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(rotateVal, {
            toValue: 360,
            duration: 600,
            useNativeDriver: true,
          })
        ),
      ]),
    ]).start();
  }, [delay, translateY, opacity, rotateVal]);

  const rotate = rotateVal.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: 0, width: 8, height: 14, backgroundColor: color, borderRadius: 2 },
        {
          transform: [{ translateY }, { rotate }],
          opacity,
        },
      ]}
    />
  );
}

export default function WinnerModal({
  visible,
  winner,
  winnerName,
  isMe,
  onPlayAgain,
  onExit,
}: WinnerModalProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const trophyBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();

      Animated.sequence([
        Animated.delay(300),
        Animated.loop(
          Animated.sequence([
            Animated.timing(trophyBounce, {
              toValue: 1.15,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(trophyBounce, {
              toValue: 1.0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      scale.setValue(0);
      trophyBounce.setValue(1);
    }
  }, [visible, scale, trophyBounce]);

  // Stable confetti positions — generated once per winner, not on re-render
  const confetti = React.useMemo(() => {
    if (!winner) return [];
    const { primary, glow } = PLAYER_COLORS[winner];
    const colors = [primary, COLORS.neonBlue, COLORS.neonPurple, COLORS.neonYellow, glow];
    return Array.from({ length: 20 }, (_, i) => ({
      x: Math.random() * W,
      color: colors[i % colors.length],
      delay: Math.random() * 500,
    }));
  }, [winner]);

  if (!visible || !winner) return null;

  const { primary } = PLAYER_COLORS[winner];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Confetti */}
        {confetti.map((c, i) => (
          <ConfettiPiece key={i} x={c.x} color={c.color} delay={c.delay} />
        ))}

        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
            style={styles.cardGradient}
          >
            {/* Trophy */}
            <Animated.Text style={[styles.trophy, { transform: [{ scale: trophyBounce }] }]}>🏆</Animated.Text>

            {/* Win/Lose message */}
            <Text style={[styles.resultLabel, { color: primary }]}>
              {isMe ? 'VICTORY!' : 'DEFEATED'}
            </Text>

            <Text style={styles.winnerText}>
              <Text style={{ color: primary }}>{winnerName ?? `Player ${winner}`}</Text>
              {' wins!'}
            </Text>

            <View style={styles.divider} />

            <View style={styles.buttons}>
              <Button
                label="Play Again"
                onPress={onPlayAgain}
                variant="primary"
                style={styles.btn}
              />
              <Button
                label="Exit"
                onPress={onExit}
                variant="ghost"
                style={styles.btn}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: W * 0.82,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  trophy: {
    fontSize: 72,
  },
  resultLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  winnerText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
    width: '80%',
    marginVertical: SPACING.sm,
  },
  buttons: {
    flexDirection: 'column',
    gap: SPACING.sm,
    width: '100%',
  },
  btn: {
    width: '100%',
  },
});
