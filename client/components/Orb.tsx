// ============================================================
// Orb — 3D energy sphere rendered via LinearGradient (no SVG)
// Eliminates all SVG gradient ID collision issues on Android.
// count: 1 = pulsing center, 2 = orbiting pair, 3 = triangle orbit
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PLAYER_COLORS } from '../constants/colors';
import { Player } from '../types';

interface OrbProps {
  count: number;
  owner: Player;
  size: number;
}

const ORBIT_RATIO = 0.08;

// ─── Single pulsing orb ──────────────────────────────────────
function SingleOrb({ color, dark, r }: { color: string; dark: string; r: number }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const d = r * 2;

  return (
    <Animated.View
      style={{
        width: d,
        height: d,
        borderRadius: r,
        overflow: 'hidden',
        transform: [{ scale: pulse }],
        elevation: 5,
      }}
    >
      {/* 3D sphere gradient: white highlight → player color → dark edge */}
      <LinearGradient
        colors={['#ffffff', color, dark]}
        start={{ x: 0.15, y: 0.08 }}
        end={{ x: 0.9, y: 0.95 }}
        style={{ width: d, height: d, borderRadius: r }}
      />
      {/* Inner specular highlight for glass-ball look */}
      <View
        style={{
          position: 'absolute',
          width: r * 0.42,
          height: r * 0.42,
          borderRadius: r * 0.21,
          backgroundColor: 'rgba(255,255,255,0.6)',
          top: r * 0.18,
          left: r * 0.2,
        }}
      />
    </Animated.View>
  );
}

// ─── Orbiting sphere dot ─────────────────────────────────────
function OrbDot({
  color,
  dark,
  r,
  x,
  y,
}: {
  color: string;
  dark: string;
  r: number;
  x: number;
  y: number;
}) {
  const d = r * 2;
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: d,
        height: d,
        borderRadius: r,
        overflow: 'hidden',
        elevation: 4,
      }}
    >
      <LinearGradient
        colors={['#ffffff', color, dark]}
        start={{ x: 0.15, y: 0.08 }}
        end={{ x: 0.9, y: 0.95 }}
        style={{ width: d, height: d, borderRadius: r }}
      />
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
    </View>
  );
}

// ─── Layout for a given count + owner ────────────────────────
interface OrbLayoutProps {
  count: number;
  owner: Player;
  size: number;
  spinValue: Animated.Value;
}

function OrbLayout({ count, owner, size, spinValue }: OrbLayoutProps) {
  const { primary: color, dark } = PLAYER_COLORS[owner];
  const r = Math.floor(size * 0.26);
  const orbit = Math.floor(size * ORBIT_RATIO);
  const cx = size / 2;
  const cy = size / 2;

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (count <= 0) return null;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {count === 1 && <SingleOrb color={color} dark={dark} r={r} />}

      {count === 2 && (
        <Animated.View
          style={{
            width: size,
            height: size,
            alignSelf: 'center',
            transform: [{ rotate: spin }],
          }}
        >
          <OrbDot color={color} dark={dark} r={r} x={cx + orbit - r} y={cy - r} />
          <OrbDot color={color} dark={dark} r={r} x={cx - orbit - r} y={cy - r} />
        </Animated.View>
      )}

      {count >= 3 && (
        <Animated.View
          style={{
            width: size,
            height: size,
            alignSelf: 'center',
            transform: [{ rotate: spin }],
          }}
        >
          <OrbDot color={color} dark={dark} r={r} x={cx + orbit - r} y={cy - r} />
          <OrbDot color={color} dark={dark} r={r} x={cx - 0.5 * orbit - r} y={cy + 0.866 * orbit - r} />
          <OrbDot color={color} dark={dark} r={r} x={cx - 0.5 * orbit - r} y={cy - 0.866 * orbit - r} />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main Orb component ──────────────────────────────────────
export default function Orb({ count, owner, size }: OrbProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  // Spin loop for 2+ orb counts
  useEffect(() => {
    if (count > 1) {
      const anim = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    }
  }, [count, spinValue]);

  return (
    <View style={{ width: size, height: size }}>
      <OrbLayout count={count} owner={owner} size={size} spinValue={spinValue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
