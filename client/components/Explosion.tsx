// ============================================================
// Explosion — Chain reaction traveling orbit animations
// ============================================================

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { PLAYER_COLORS } from '../constants/colors';
import { Player } from '../types';
import { useSound } from '../hooks/useSound';

interface ExplosionProps {
  id: string; // Unique ID to isolate SVG RadialGradients from color bleeding collisions
  player: Player;
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
  maxRows: number;
  maxCols: number;
  onComplete: () => void;
}

function TravelingOrb({
  explosionId,
  color,
  dark,
  size,
  dx,
  dy,
  progress,
}: {
  explosionId: string;
  color: string;
  dark: string;
  size: number;
  dx: number;
  dy: number;
  progress: Animated.Value;
}) {
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dx],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dy],
  });

  // Radius matches the static orb exactly (diameter ~52% of cell size) to prevent size deviations
  const r = Math.floor(size * 0.26);
  const d = r * 2;
  const gradId = `g_travel_${explosionId}_${dx}_${dy}`;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: d,
        height: d,
        borderRadius: r,
        overflow: 'hidden',
        transform: [{ translateX }, { translateY }],
      }}
    >
      <Svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{ width: d, height: d }}>
        <Defs>
          {/* Fully bright 3D gradient matching static orbs without black edge shading */}
          <RadialGradient id={gradId} cx="30%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="25%" stopColor={color} stopOpacity="1" />
            <Stop offset="80%" stopColor={dark} stopOpacity="1" />
            <Stop offset="100%" stopColor={dark} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

export default function Explosion({
  id,
  player,
  row,
  col,
  cellWidth,
  cellHeight,
  maxRows,
  maxCols,
  onComplete,
}: ExplosionProps) {
  const { primary: color, dark, glow } = PLAYER_COLORS[player];
  const { playExplosion } = useSound();

  const progress = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    playExplosion();
    const finishedRef = { value: false };

    // Snappier animation speed (320ms) for high-performance responsive feeling
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ringScale, {
        toValue: 2.2,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start((result) => {
      if (result.finished) {
        finishedRef.value = true;
        onComplete();
      }
    });

    // Safety: if component unmounts before animation finishes (fast chain),
    // force-call onComplete to prevent cascade from freezing.
    return () => {
      if (!finishedRef.value) {
        onComplete();
      }
    };
  }, [progress, ringScale, ringOpacity]);

  const size = Math.min(cellWidth, cellHeight);

  // Check dynamic grid boundaries
  const hasTop = row > 0;
  const hasBottom = row < maxRows - 1;
  const hasLeft = col > 0;
  const hasRight = col < maxCols - 1;

  return (
    <View style={[styles.container, StyleSheet.absoluteFillObject]}>
      {/* Shockwave expanding ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            borderColor: glow,
            shadowColor: color,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* Traveling spheres going to valid adjacent cells */}
      {hasTop && (
        <TravelingOrb
          explosionId={id}
          color={color}
          dark={dark}
          size={size}
          dx={0}
          dy={-cellHeight}
          progress={progress}
        />
      )}
      {hasBottom && (
        <TravelingOrb
          explosionId={id}
          color={color}
          dark={dark}
          size={size}
          dx={0}
          dy={cellHeight}
          progress={progress}
        />
      )}
      {hasLeft && (
        <TravelingOrb
          explosionId={id}
          color={color}
          dark={dark}
          size={size}
          dx={-cellWidth}
          dy={0}
          progress={progress}
        />
      )}
      {hasRight && (
        <TravelingOrb
          explosionId={id}
          color={color}
          dark={dark}
          size={size}
          dx={cellWidth}
          dy={0}
          progress={progress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
