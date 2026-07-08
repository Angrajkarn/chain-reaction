// ============================================================
// Root Layout — Expo Router + Socket initialization + Music
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, LogBox } from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { disconnectSocket, getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';

// Suppress deprecation warnings on console logs
LogBox.ignoreLogs([
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
        // Always attempt to rejoin room when coming back to foreground,
        // whether the socket is already connected or had to reconnect.
        const { roomCode, myPlayerNumber } = useGameStore.getState();
        if (roomCode && myPlayerNumber) {
          const socket = getSocket();
          const doReconnect = () => {
            socket.emit('reconnect-to-room', { roomCode, playerNumber: myPlayerNumber });
          };
          if (socket.connected) {
            doReconnect();
          } else {
            socket.once('connect', doReconnect);
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <SocketInitializer />
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
