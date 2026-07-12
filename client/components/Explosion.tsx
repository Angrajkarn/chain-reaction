// ============================================================
// Explosion — Chain reaction traveling orb animations
// Uses LinearGradient instead of SVG to prevent gradient ID issues
// ============================================================

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PLAYER_COLORS } from '../constants/colors';
import { Player } from '../types';
import { useSound } from '../hooks/useSound';

interface ExplosionProps {
  id: string;
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
  color,
  dark,
  size,
  dx,
  dy,
  progress,
}: {
  color: string;
  dark: string;
  size: number;
  dx: number;
  dy: number;
  progress: Animated.Value;
}) {
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });

  const r = Math.floor(size * 0.26);
  const d = r * 2;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: d,
        height: d,
        borderRadius: r,
        overflow: 'hidden',
        transform: [{ translateX }, { translateY }],
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={['#ffffff', color, dark]}
        start={{ x: 0.15, y: 0.08 }}
        end={{ x: 0.9, y: 0.95 }}
        style={{ width: d, height: d, borderRadius: r }}
      />
      {/* Specular highlight */}
      <View
        style={{
          position: 'absolute',
          width: r * 0.38,
          height: r * 0.38,
          borderRadius: r * 0.19,
          backgroundColor: 'rgba(255,255,255,0.55)',
          top: r * 0.16,
          left: r * 0.18,
        }}
      />
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
    // BUG-011: Use a single deduplication ref so onComplete fires exactly once,
    // whether animation finishes normally OR the component unmounts mid-animation.
    const calledRef = { value: false };
    const safeComplete = () => {
      if (!calledRef.value) {
        calledRef.value = true;
        onComplete();
      }
    };

    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 310,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ringScale, {
        toValue: 2.3,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 290,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start((result) => {
      if (result.finished) {
        safeComplete();
      }
    });

    return () => {
      // Unmount before animation finishes \u2014 safeComplete guarantees single call
      safeComplete();
    };
  }, []);


  const size = Math.min(cellWidth, cellHeight);

  const hasTop    = row > 0;
  const hasBottom = row < maxRows - 1;
  const hasLeft   = col > 0;
  const hasRight  = col < maxCols - 1;

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

      {/* Traveling spheres going to adjacent cells */}
      {hasTop && (
        <TravelingOrb color={color} dark={dark} size={size} dx={0} dy={-cellHeight} progress={progress} />
      )}
      {hasBottom && (
        <TravelingOrb color={color} dark={dark} size={size} dx={0} dy={cellHeight} progress={progress} />
      )}
      {hasLeft && (
        <TravelingOrb color={color} dark={dark} size={size} dx={-cellWidth} dy={0} progress={progress} />
      )}
      {hasRight && (
        <TravelingOrb color={color} dark={dark} size={size} dx={cellWidth} dy={0} progress={progress} />
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
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
});
