// ============================================================
// Header — Game top bar showing players, turn, room code
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, PLAYER_COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';
import { PlayerInfo, Player } from '../types';

interface HeaderProps {
  players: PlayerInfo[];
  currentTurn: Player;
  roomCode: string;
  myPlayerNumber: Player | null;
}

function PlayerTag({
  player,
  isActive,
  isMe,
}: {
  player: PlayerInfo;
  isActive: boolean;
  isMe: boolean;
}) {
  const { primary } = PLAYER_COLORS[player.playerNumber];
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      Animated.timing(glow, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, glow]);

  return (
    <View style={[styles.playerTag, isActive && { borderColor: primary }]}>
      <Animated.View
        style={[
          styles.turnDot,
          { backgroundColor: primary, shadowColor: primary },
          { opacity: glow },
        ]}
      />
      <Text style={[styles.playerName, { color: isActive ? primary : COLORS.textMuted }]} numberOfLines={1}>
        {player.name}
        {isMe ? ' (You)' : ''}
      </Text>
      <Text style={[styles.playerLabel, { color: primary }]}>
        {PLAYER_COLORS[player.playerNumber].label}
      </Text>
    </View>
  );
}

export default function Header({
  players,
  currentTurn,
  roomCode,
  myPlayerNumber,
}: HeaderProps) {
  const p1 = players.find((p) => p.playerNumber === 1);
  const p2 = players.find((p) => p.playerNumber === 2);

  return (
    <View style={styles.container}>
      {/* Player 1 */}
      <View style={styles.playerSlot}>
        {p1 && (
          <PlayerTag
            player={p1}
            isActive={currentTurn === 1}
            isMe={myPlayerNumber === 1}
          />
        )}
      </View>

      {/* Center: Room Code */}
      <View style={styles.center}>
        <Text style={styles.roomLabel}>ROOM</Text>
        <Text style={styles.roomCode}>{roomCode}</Text>
      </View>

      {/* Player 2 */}
      <View style={[styles.playerSlot, styles.rightSlot]}>
        {p2 && (
          <PlayerTag
            player={p2}
            isActive={currentTurn === 2}
            isMe={myPlayerNumber === 2}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  playerSlot: {
    flex: 1,
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  playerTag: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    padding: SPACING.sm,
    gap: 2,
    maxWidth: 130,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  playerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  center: {
    alignItems: 'center',
  },
  roomLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  roomCode: {
    color: COLORS.neonBlue,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
});
