// ============================================================
// Home Screen — Main menu with navigation buttons
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import Button from '../components/Button';
import ParticleBackground from '../components/ParticleBackground';
import SettingsModal from '../components/SettingsModal';
import AboutModal from '../components/AboutModal';
import { TouchableOpacity } from 'react-native';
import { fetchGreetingMessage } from '../services/api';

const { width: W } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchGreetingMessage().then((msg) => {
      if (msg) {
        setGreeting(msg);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }).start();
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <ParticleBackground />

      <SafeAreaView style={styles.safe}>
        {/* Top bar with three-dots button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setAboutOpen(true)} style={styles.dotsButton}>
            <Text style={styles.dotsText}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Header branding */}
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>⚛️</Text>
          <Text style={styles.title}>CHAIN</Text>
          <Text style={[styles.title, styles.titleAccent]}>REACTION</Text>
          <Text style={styles.tagline}>Private Multiplayer Strategy</Text>
        </View>

        {/* Server Greeting Banner */}
        {greeting && (
          <Animated.View style={[styles.greetingBanner, { opacity: fadeAnim }]}>
            <Text style={styles.greetingEmoji}>💌</Text>
            <Text style={styles.greetingText}>{greeting}</Text>
          </Animated.View>
        )}

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
            label="🤖  Play with AI"
            onPress={() => router.push('/ai-difficulty')}
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
      <AboutModal visible={aboutOpen} onClose={() => setAboutOpen(false)} />
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
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  topBar: {
    position: 'absolute',
    top: 55,
    right: 12,
    zIndex: 10,
  },
  dotsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsText: {
    color: COLORS.textSecondary,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -4,
  },
  branding: {
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1.2,
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
  greetingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255, 75, 43, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 43, 0.30)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    width: '100%',
    marginBottom: SPACING.xs,
  },
  greetingEmoji: {
    fontSize: 18,
  },
  greetingText: {
    flex: 1,
    color: 'rgba(255, 200, 180, 0.90)',
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.4,
  },
});
