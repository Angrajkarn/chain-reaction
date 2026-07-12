// ============================================================
// AI Difficulty Selection Screen
// ============================================================

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import { AIDifficulty, DIFFICULTY_CONFIGS } from '../ai/Difficulty';
import ParticleBackground from '../components/ParticleBackground';

const DIFFICULTIES: AIDifficulty[] = ['easy', 'medium', 'hard', 'impossible'];

const ACCENT: Record<AIDifficulty, string> = {
  easy: '#32D74B',
  medium: '#FFE600',
  hard: '#FF2D55',
  impossible: '#BE00FF',
};

export default function AIDifficultyScreen() {
  const router = useRouter();

  const scaleAnims = useRef(
    DIFFICULTIES.reduce((acc, d) => {
      acc[d] = new Animated.Value(1);
      return acc;
    }, {} as Record<AIDifficulty, Animated.Value>)
  ).current;

  const handleSelect = (difficulty: AIDifficulty) => {
    // Pulse animation then navigate
    Animated.sequence([
      Animated.timing(scaleAnims[difficulty], {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[difficulty], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push({ pathname: '/ai-game', params: { difficulty } });
    });
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.heading}>
            <Text style={styles.icon}>🤖</Text>
            <Text style={styles.title}>Play with AI</Text>
            <Text style={styles.subtitle}>Choose your challenge level</Text>
          </View>
        </View>

        {/* Difficulty cards */}
        <View style={styles.cards}>
          {DIFFICULTIES.map((d) => {
            const cfg = DIFFICULTY_CONFIGS[d];
            const accent = ACCENT[d];
            return (
              <Animated.View
                key={d}
                style={[styles.cardWrapper, { transform: [{ scale: scaleAnims[d] }] }]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.card, { borderColor: accent + '55' }]}
                  onPress={() => handleSelect(d)}
                >
                  {/* Left accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: accent }]} />

                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardEmoji}>{cfg.emoji}</Text>
                      <Text style={[styles.cardLabel, { color: accent }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.cardDesc}>{cfg.description}</Text>
                  </View>

                  <View style={styles.cardArrow}>
                    <Text style={[styles.arrowText, { color: accent }]}>›</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Footer note */}
        <Text style={styles.footer}>
          Human plays as <Text style={{ color: COLORS.player1 }}>RED</Text> · AI plays as{' '}
          <Text style={{ color: COLORS.player2 }}>GREEN</Text>
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safe: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    justifyContent: 'space-between',
  },
  header: {
    gap: SPACING.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  heading: {
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  cards: {
    gap: SPACING.md,
  },
  cardWrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  cardArrow: {
    paddingRight: SPACING.md,
  },
  arrowText: {
    fontSize: 30,
    fontWeight: '300',
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
