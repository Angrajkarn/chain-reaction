// ============================================================
// Create Room Screen
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassCard from '../components/GlassCard';
import ParticleBackground from '../components/ParticleBackground';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { getSocket } from '../services/socket';

export default function CreateRoomScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const myName = useGameStore((s) => s.myName);
  const setMyName = useGameStore((s) => s.setMyName);
  const roomCode = useGameStore((s) => s.roomCode);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please enter your name');
      return;
    }
    setNameError('');
    setMyName(trimmed);
    setLoading(true);

    const gridSize = useSettingsStore.getState().gridSize;
    const parts = gridSize.split('x');
    const cols = parseInt(parts[0], 10) || 6;
    const rows = parseInt(parts[1], 10) || 13;

    const socket = getSocket();
    socket.emit('create-room', { playerName: trimmed, rows, cols });

    // Navigation handled by useSocket in _layout
    setTimeout(() => setLoading(false), 3000);
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
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Room</Text>
        <Text style={styles.subtitle}>Generate a private room and share the code</Text>

        {!roomCode ? (
          /* Pre-creation: name input */
          <GlassCard style={styles.card}>
            <Input
              label="Your Name"
              placeholder="Enter your name..."
              value={name}
              onChangeText={setName}
              maxLength={20}
              autoFocus
              error={nameError}
            />
            <Button
              label="Generate Room Code"
              onPress={handleCreate}
              loading={loading}
              style={styles.createBtn}
            />
          </GlassCard>
        ) : (
          /* Post-creation: show code and wait */
          <GlassCard style={styles.card} glowColor={COLORS.neonBlue}>
            <Text style={styles.codeLabel}>YOUR ROOM CODE</Text>
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

            <View style={styles.divider} />

            <View style={styles.waitingRow}>
              <View style={styles.waitingDot} />
              <Text style={styles.waitingText}>Waiting for opponent...</Text>
            </View>

            <Text style={styles.waitingHint}>
              Share this code with your opponent to start the game
            </Text>
          </GlassCard>
        )}
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
    gap: SPACING.lg,
  },
  back: { alignSelf: 'flex-start' },
  backText: { color: COLORS.neonBlue, fontSize: 16, fontWeight: '600' },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  card: { gap: SPACING.md },
  createBtn: { width: '100%', marginTop: SPACING.sm },
  codeLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
  },
  roomCode: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.neonBlue,
    letterSpacing: 12,
    textAlign: 'center',
    textShadowColor: COLORS.neonBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  codeActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  codeBtn: { flex: 1 },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
    marginVertical: SPACING.sm,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  waitingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.player2,
    shadowColor: COLORS.player2,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  waitingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  waitingHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
