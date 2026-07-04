// ============================================================
// Join Room Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import GlassCard from '../components/GlassCard';
import ParticleBackground from '../components/ParticleBackground';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socket';
import { ROOM_CODE_LENGTH } from '../constants/config';

export default function JoinRoomScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setMyName = useGameStore((s) => s.setMyName);

  useEffect(() => {
    const socket = getSocket();

    const onJoinError = ({ message }: { message: string }) => {
      setError(message);
      setLoading(false);
    };

    socket.on('join-error', onJoinError);
    socket.on('__join-error-local', onJoinError);

    return () => {
      socket.off('join-error', onJoinError);
      socket.off('__join-error-local', onJoinError);
    };
  }, []);

  const handleJoin = () => {
    setError('');

    const trimCode = code.trim();
    const trimName = name.trim();

    if (trimCode.length !== ROOM_CODE_LENGTH) {
      setError(`Room code must be exactly ${ROOM_CODE_LENGTH} digits`);
      return;
    }
    if (!/^\d+$/.test(trimCode)) {
      setError('Room code must contain numbers only');
      return;
    }
    if (!trimName) {
      setError('Please enter your name');
      return;
    }

    setMyName(trimName);
    setLoading(true);

    const socket = getSocket();
    socket.emit('join-room', { roomCode: trimCode, playerName: trimName });

    // Navigation to game handled by useSocket listener in _layout
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Join Room</Text>
        <Text style={styles.subtitle}>Enter the numeric room code shared by your opponent</Text>

        <GlassCard style={styles.card}>
          <Input
            label="Room Code"
            placeholder="e.g. 582910"
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
            maxLength={ROOM_CODE_LENGTH}
            autoCorrect={false}
            keyboardType="number-pad"
          />
          <Input
            label="Your Name"
            placeholder="Enter your name..."
            value={name}
            onChangeText={setName}
            maxLength={20}
          />

          {error ? (
            <Text style={styles.errorText}>⚠️ {error}</Text>
          ) : null}

          <Button
            label="Join Game"
            onPress={handleJoin}
            loading={loading}
            disabled={code.length !== ROOM_CODE_LENGTH || !name.trim()}
            style={styles.joinBtn}
          />
        </GlassCard>

        <Text style={styles.hint}>
          Only users with the room code can join. No public matchmaking.
        </Text>
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
    justifyContent: 'center',
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
  errorText: {
    color: COLORS.player1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  joinBtn: { width: '100%' },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
