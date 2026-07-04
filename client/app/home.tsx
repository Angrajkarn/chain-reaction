// ============================================================
// Home Screen — Main menu with navigation buttons
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import Button from '../components/Button';
import ParticleBackground from '../components/ParticleBackground';
import SettingsModal from '../components/SettingsModal';

const { width: W } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <ParticleBackground />

      <SafeAreaView style={styles.safe}>
        {/* Header branding */}
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>⚛️</Text>
          <Text style={styles.title}>CHAIN</Text>
          <Text style={[styles.title, styles.titleAccent]}>REACTION</Text>
          <Text style={styles.tagline}>Private Multiplayer Strategy</Text>
        </View>

        {/* Menu buttons */}
        <View style={styles.menu}>
          <Button
            label="⚔️  Create Private Room"
            onPress={() => router.push('/create-room')}
            variant="primary"
            style={styles.menuBtn}
          />
          <Button
            label="🔗  Join Private Room"
            onPress={() => router.push('/join-room')}
            variant="secondary"
            style={styles.menuBtn}
          />
          <Button
            label="📱  Pass & Play (Offline)"
            onPress={() => router.push('/local-game')}
            variant="secondary"
            style={styles.menuBtn}
          />
          <Button
            label="📖  How to Play"
            onPress={() => router.push('/how-to-play')}
            variant="ghost"
            style={styles.menuBtn}
          />
          <Button
            label="⚙️  Settings"
            onPress={() => setSettingsOpen(true)}
            variant="ghost"
            style={styles.menuBtn}
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Made for Booblie ❤️</Text>
      </SafeAreaView>

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  branding: {
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 8,
    lineHeight: 42,
  },
  titleAccent: {
    color: COLORS.neonBlue,
    textShadowColor: COLORS.neonBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 2.5,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  menu: {
    width: '100%',
    gap: SPACING.sm,
    flex: 1,
    justifyContent: 'center',
  },
  menuBtn: {
    width: '100%',
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '500',
  },
});
