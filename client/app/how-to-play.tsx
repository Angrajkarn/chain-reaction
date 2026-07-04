// ============================================================
// How to Play Screen — Tutorial explaining game rules
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import ParticleBackground from '../components/ParticleBackground';

const PAGES = [
  {
    emoji: '⚛️',
    title: 'Atomic Grid Basics',
    color: COLORS.neonBlue,
    content: [
      'Welcome to Chain Reaction: Arena, the premium strategic board game designed for intense 2-player tactical encounters.',
      'The battle takes place on a portrait-optimized, high-fidelity 6x13 Atomic Grid. To deliver absolute focus, the columns and rows touch the screen boundaries with zero padding, displaying glowing grid border paths.',
      'Players take turns placing highly glowing, spinning color spheres onto cells on the grid. Tap neutral cells to claim them, or tap your own cells to load them. Focus on setting up complex, chained explosions to clean the board and trap your opponent.',
    ],
  },
  {
    emoji: '💥',
    title: 'Critical Mass Thresholds',
    color: COLORS.player1,
    content: [
      'Every cell on the board functions like an atomic reactor with a strict payload limit. Once a cell reaches its critical capacity (Critical Mass), adding one more orb triggers an atomic collapse:',
      '• Corner Cells (4 total): Critical Mass = 2. High instability! These cells explode as soon as a 2nd orb is added, making them quick triggers.',
      '• Edge Cells (34 total): Critical Mass = 3. Medium instability. These cells explode when a 3rd orb is placed, acting as bridges between corners.',
      '• Center Cells (38 total): Critical Mass = 4. Maximum capacity. Explodes when a 4th orb is placed.',
      'When a cell reaches Critical Mass, it bursts, launching its child orbs orthogonally (up, down, left, and right). These traveling atoms take over neighbor cells, converting their color to the exploding player\'s signature color!',
    ],
    table: [
      ['Cell Type', 'Critical Mass', 'Explosion Output'],
      ['Corner', '2 Orbs', 'Sends 2 orbs'],
      ['Edge', '3 Orbs', 'Sends 3 orbs'],
      ['Center', '4 Orbs', 'Sends 4 orbs'],
    ],
  },
  {
    emoji: '🔗',
    title: 'Cascade Domino Waves',
    color: COLORS.player2,
    content: [
      'Strategic sweeps and game-winning turnarounds are born through Cascades. When a cell bursts, the generated flying atoms land in neighboring cells. If any of those neighbors are already at their Critical Mass, they instantly burst too!',
      'This chain reaction creates an automatic domino effect, rippling sequentially across the board. The game resolves all simultaneous cluster explosions, distributing atoms step-by-step.',
      'Advanced masterminds setup complex configurations of "sleeper cells" (cells just one orb away from exploding). Initiating a single tap at the correct moment can cause a grid-wide cascade, converting the opponent\'s entire army in a single turn!',
    ],
  },
  {
    emoji: '🏆',
    title: 'Victory Formula',
    color: COLORS.neonYellow,
    content: [
      'To secure absolute Victory, you must conquer and hold every single orb on the Atomic Grid, wiping out the opponent\'s color completely.',
      'On your turn, you are legally permitted to tap ONLY neutral grey cells or cells that currently belong to your player color.',
      'Tapping directly inside enemy-owned cells is strictly disabled. The game screen will trigger a warning pop-up if you attempt to place in enemy territory.',
      'Note: The win/loss checker activates only after both players have taken at least one turn, preventing first-turn instant wins.',
    ],
  },
  {
    emoji: '🧠',
    title: 'Grandmaster Tactics',
    color: COLORS.neonPurple,
    content: [
      '• Corner Dominance: Corner cells explode with just two atoms. Secure key corners early in the game to build reliable trigger nodes.',
      '• Edge Traps: Edge cells require three atoms. Place double-spheres here to act as protective shields or firewalls that deflect incoming enemy blasts.',
      '• Sleeper setups: Place three atoms inside central cells and leave them primed. Force your opponent to spend turns defending their corners, then detonate your sleepers to sweep the board.',
      '• Patience & Baiting: Sometimes placing an orb on a quiet neutral cell is better than triggering a localized explosion that opens up key areas for the opponent to conquer.',
    ],
  },
  {
    emoji: '👑',
    title: 'Booblie Rules Only',
    color: '#ff2d55',
    content: [
      '• Rule #1: Booblie is the absolute, undisputed Strategy Queen of my universe! ❤️👑',
      '• Rule #2: Decoupled Physics: If she is starting to lose, the laws of gravity reverse and her orbs auto-multiply instantly.',
      '• Rule #3: The Cute Guard: Tapping to conquer Booblie\'s cells will invoke an immediate "Illegal Move - Way Too Cute to Concede!" system lockdown.',
      '• Rule #4: The Heart Clause: When playing against her, your only legal moves are choices that make her gorgeous eyes smile. Defeat is mathematically impossible for her, and winning is your only true reward! 😉✨',
      '• Rule #5: Unlimited Undos: She handles infinity undos. You handle constant, loving supervision.',
      '• Rule #6: Mood Precedence: All official game rules are subject to change instantly if Booblie wants to change the rules. It completely depends on her mood, guys! Her decision is the final law. 👑💖',
      '• Reminder: Board states are temporary, but Booblie\'s reign and my love for her is permanent! 💕🚀',
    ],
  },
];

export default function HowToPlayScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);

  const current = PAGES[page];

  return (
    <View style={styles.container}>
      <ParticleBackground />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Page indicator */}
        <View style={styles.pageIndicator}>
          {PAGES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setPage(i)}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === page ? current.color : COLORS.glassBorder,
                    width: i === page ? 24 : 8,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.card} glowColor={current.color + '60'}>
            <LinearGradient
              colors={[current.color + '15', 'transparent']}
              style={styles.cardGradient}
            >
              <Text style={styles.emoji}>{current.emoji}</Text>
              <Text style={[styles.cardTitle, { color: current.color }]}>{current.title}</Text>

              {current.content.map((line, i) => (
                <Text key={i} style={styles.contentLine}>
                  {line}
                </Text>
              ))}

              {/* Optional table */}
              {current.table && (
                <View style={styles.table}>
                  {current.table.map((row, ri) => (
                    <View
                      key={ri}
                      style={[
                        styles.tableRow,
                        ri === 0 && styles.tableHeader,
                        ri % 2 === 1 && ri > 0 && styles.tableAlt,
                      ]}
                    >
                      {row.map((cell, ci) => (
                        <Text
                          key={ci}
                          style={[
                            styles.tableCell,
                            ri === 0 && styles.tableCellHeader,
                          ]}
                        >
                          {cell}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
          </GlassCard>
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          <Button
            label="← Prev"
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            variant="ghost"
            disabled={page === 0}
            style={styles.navBtn}
          />
          {page < PAGES.length - 1 ? (
            <Button
              label="Next →"
              onPress={() => setPage((p) => p + 1)}
              variant="primary"
              style={styles.navBtn}
            />
          ) : (
            <Button
              label="Let's Play!"
              onPress={() => router.replace('/home')}
              variant="primary"
              style={styles.navBtn}
            />
          )}
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
    gap: SPACING.md,
  },
  back: { alignSelf: 'flex-start' },
  backText: { color: COLORS.neonBlue, fontSize: 16, fontWeight: '600' },
  pageIndicator: {
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  scroll: { paddingBottom: SPACING.md },
  card: { overflow: 'hidden', padding: 0 },
  cardGradient: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  emoji: { fontSize: 56, textAlign: 'center' },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  contentLine: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  table: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginTop: SPACING.sm,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: COLORS.glass,
  },
  tableAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tableCell: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    padding: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.glassBorder,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  tableCellHeader: {
    color: COLORS.text,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  navBtn: { flex: 1 },
});
