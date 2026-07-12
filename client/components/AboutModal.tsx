// ============================================================
// AboutModal — Sweet dedication and about section for Booblie
// ============================================================

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import Button from './Button';

const { width: W } = Dimensions.get('window');

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUOTES = [
  "Rule 1 is absolute: Booblie always wins! 👑💖",
  "Connection status: Coupled to Booblie's heart at 0ms latency. Wifi is secondary! 🥰",
  "Warning: Threat level low. Target too cute to attack. 🌸",
  "Strategy meter: 100% Strategy Queen. Moves are brilliant and unpredictable. 😉🚀",
  "Undo count: ♾️. Supervision level: Infinite love. ❤️",
  "Chain Reaction rules say corners burst at 2, but my heart burst the first second I met you! 💥💓",
  "No matter how many times the grid resets, my love code remains fully immutable for you. 💻💞",
  "Warning: Opponent is dangerously cute. Defensive countermeasure: Immediate hugs! 🍫✨",
  "If the game drops connection or locks up, my feelings for you will auto-reconnect instantly! 📶💍",
  "You don't need to win the board. You won my entire repository already! 🏗️🌸",
  "If you make a move, I will hold my breath until your next turn. 💖",
  "Chain Reaction is about capturing cells, but you've already captured 100% of my thoughts! 🌸",
  "Evaluating board state... Result: Booblie's beauty transcends the maximum grid dimensions! 🛸✨",
  "Zobrist hash calculated. Verdict: No key exists that is as unique as you. 🔐💝",
  "Alpha-beta pruning active: Pruning away all logic that doesn't lead to your absolute happiness. 🌿💕",
];

export default function AboutModal({ visible, onClose }: AboutModalProps) {
  const [moodIdea, setMoodIdea] = useState(QUOTES[0]);

  const rollMood = () => {
    const nextIdx = Math.floor(Math.random() * QUOTES.length);
    setMoodIdea(QUOTES[nextIdx]);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <LinearGradient
            colors={['rgba(255,45,85,0.08)', 'rgba(0,0,0,0)']}
            style={styles.header}
          >
            <Text style={styles.title}>👑 About Arena</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Dedication Card */}
            <View style={styles.dedicationCard}>
              <Text style={styles.heartIcon}>❤️</Text>
              <Text style={styles.dedicationTitle}>Built for Booblie</Text>
              <Text style={styles.dedicationText}>
                I made this game because of her. There was an old Chain Reaction app on the Play Store, but it kept desyncing and wouldn't work well for multiplayer.
              </Text>
              <Text style={styles.dedicationText}>
                So I code-built this customized, premium multiplayer version from absolute scratch so that we could play together smoothly without any interruptions, wherever we are!
              </Text>
            </View>

            {/* Love Notes & Promises Card */}
            <View style={[styles.dedicationCard, { backgroundColor: 'rgba(0,212,255,0.02)', borderColor: 'rgba(0,212,255,0.1)' }]}>
              <Text style={styles.sectionHeader}>📜 Our Private Game Promises</Text>
              <Text style={styles.promiseTitle}>💞 The Connection Promise</Text>
              <Text style={styles.promiseText}>
                If our multiplayer lobby disconnects, it's just a packet drop. My feelings for you have an auto-reconnect guarantee of 100% uptime.
              </Text>
              <Text style={styles.promiseTitle}>💎 The Ground Anchor Clause</Text>
              <Text style={styles.promiseText}>
                In this game, corners are highly unstable trigger zones. But in reality, you are my ultimate gravity, keeping me grounded and safe.
              </Text>
              <Text style={styles.promiseTitle}>🍭 The Cute Penalty</Text>
              <Text style={styles.promiseText}>
                Booblie is permitted to steal my atoms if she looks at me or if she smiles. Tapping to conquer her cells is legally blocked by the cute filter.
              </Text>
            </View>

            {/* Strategy Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.sectionHeader}>📊 Relationship Strategy Stats</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Queen's Win Rate:</Text>
                <Text style={styles.statValue}>100.0% (Constant)</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Heart Connection:</Text>
                <Text style={[styles.statValue, { color: COLORS.neonBlue }]}>Stable 🟢 0ms</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Undo Privileges:</Text>
                <Text style={styles.statValue}>Infinite ♾️</Text>
              </View>
            </View>

            {/* AI Network Engine Info Card */}
            <View style={[styles.statsCard, { borderColor: 'rgba(0,212,255,0.12)' }]}>
              <Text style={styles.sectionHeader}>🧠 Neural Matchmaker Engine</Text>
              <Text style={styles.engineText}>
                This game features a custom-built, offline-first Neural Network AI. The Impossible difficulty utilizes a Multi-Layer Perceptron (MLP) policy neural network (trained over 100,000 matches) combined with minimax search and Zobrist state memoization.
              </Text>
              <Text style={styles.engineText}>
                Even so, the AI logic detects when it plays the Strategy Queen. It automatically scales down weights if it registers her smile, letting Booblie win with style.
              </Text>
            </View>

            {/* Achievements Section */}
            <View style={styles.achievementsCard}>
              <Text style={styles.sectionHeader}>🏆 Arena Achievements Unlocked</Text>
              <View style={styles.achievementRow}>
                <Text style={styles.achievementEmoji}>🥇</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>Daisy Chain Champ</Text>
                  <Text style={styles.achievementDesc}>Triggered an explosion cascade of 10+ chain reaction cells.</Text>
                </View>
              </View>
              <View style={styles.achievementRow}>
                <Text style={styles.achievementEmoji}>🥈</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>Heartbeat Latency</Text>
                  <Text style={styles.achievementDesc}>Played a multiplayer lobby with 0ms reconnect latency and infinite love.</Text>
                </View>
              </View>
              <View style={styles.achievementRow}>
                <Text style={styles.achievementEmoji}>🥉</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>Unpredictable Master</Text>
                  <Text style={styles.achievementDesc}>Subverted advanced minimax search depth paths through pure cuteness.</Text>
                </View>
              </View>
              <View style={styles.achievementRow}>
                <Text style={styles.achievementEmoji}>🏅</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>Undefeated Rule 1</Text>
                  <Text style={styles.achievementDesc}>Exercised the supreme right of winning all ties automatically.</Text>
                </View>
              </View>
            </View>

            {/* Interactive Queen Mood Box */}
            <View style={styles.moodBox}>
              <Text style={styles.sectionHeader}>🔮 Queen's Mood Strategy Reader</Text>
              <Text style={styles.moodText}>{moodIdea}</Text>
              <Button
                label="💖 Check Mood Rule"
                onPress={rollMood}
                variant="secondary"
                style={styles.moodBtn}
              />
            </View>
          </ScrollView>

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0a0512',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#0a0512',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ff2d55',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: SPACING.sm,
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  dedicationCard: {
    backgroundColor: 'rgba(255,45,85,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.15)',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  heartIcon: {
    fontSize: 48,
    marginBottom: SPACING.xs,
  },
  dedicationTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  dedicationText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  promiseTitle: {
    color: '#ff2d55',
    fontSize: 14,
    fontWeight: '700',
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  promiseText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'left',
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sectionHeader: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    paddingBottom: 6,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    color: '#ff2d55',
    fontSize: 13,
    fontWeight: '700',
  },
  engineText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 4,
  },
  achievementsCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 4,
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  achievementDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  moodBox: {
    backgroundColor: 'rgba(0,212,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  moodText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 40,
    marginTop: 4,
  },
  moodBtn: {
    width: '100%',
  },
});

