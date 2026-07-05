// ============================================================
// Root Layout — Expo Router + Socket initialization + Music
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { AppState, LogBox } from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { useSettingsStore } from '../store/settingsStore';
import { disconnectSocket, getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';

// Suppress deprecation warnings on console logs
LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'SafeAreaView has been deprecated',
]);

function SocketInitializer() {
  // Initialize socket event listeners at the root level
  useSocket(true);

  const bgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Give user 60 seconds before killing socket (handles phone locks,
        // notifications etc. without destroying an active game session)
        bgTimer.current = setTimeout(() => {
          disconnectSocket();
        }, 60_000);
      } else if (nextAppState === 'active') {
        // App came back to foreground — cancel pending disconnect
        if (bgTimer.current) {
          clearTimeout(bgTimer.current);
          bgTimer.current = null;
        }
        // If we lost the socket while backgrounded, reconnect to room
        const { roomCode, myPlayerNumber } = useGameStore.getState();
        if (roomCode && myPlayerNumber) {
          const socket = getSocket();
          if (!socket.connected) {
            socket.once('connect', () => {
              socket.emit('reconnect-to-room', { roomCode, playerNumber: myPlayerNumber });
            });
          }
        }
      }
    });

    return () => {
      subscription.remove();
      if (bgTimer.current) clearTimeout(bgTimer.current);
    };
  }, []);

  return null;
}

function MusicPlayer() {
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let active = true;

    async function setupMusic() {
      try {
        // Enforce audio output routes on iOS & Android
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const sound = new Audio.Sound();
        soundRef.current = sound;
        
        // Stable, open, S3-hosted Mixkit ambient EDM background track (CORS allowed)
        await sound.loadAsync(
          { uri: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3' },
          { shouldPlay: musicEnabled, isLooping: true, volume: 0.15 }
        );
      } catch (e) {
        // Fail silently
      }
    }

    setupMusic();

    return () => {
      active = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Sync music play state with musicEnabled setting in real-time
  useEffect(() => {
    if (soundRef.current) {
      if (musicEnabled) {
        soundRef.current.playAsync().catch(() => {});
      } else {
        soundRef.current.pauseAsync().catch(() => {});
      }
    }
  }, [musicEnabled]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <SocketInitializer />
      <MusicPlayer />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0f' },
          animation: 'fade',
        }}
      />
    </SafeAreaProvider>
  );
}
