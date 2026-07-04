// ============================================================
// Orb — Glowing energy sphere with continuous animation & color transitions
// count: 1 = single center, 2 = orbiting pair, 3 = triangle orbit
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { PLAYER_COLORS } from '../constants/colors';
import { Player } from '../types';

interface OrbProps {
  count: number;
  owner: Player;
  size: number;
}

const ORBIT_RATIO = 0.08; // Small orbit ratio makes spheres overlap and clump ("attached")

function SingleOrb({
  color,
  dark,
  r,
  owner,
}: {
  color: string;
  dark: string;
  r: number;
  owner: Player;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const d = r * 2;
  const gradientId = `g_single_${owner}`;

  return (
    <Animated.View
      style={[{
        width: d,
        height: d,
        borderRadius: r,
        overflow: 'hidden',
        transform: [{ scale: pulse }]
      }]}
    >
      <Svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{ width: d, height: d }}>
        <Defs>
          {/* Fully bright 3D gradient with no muddy grey/black stops */}
          <RadialGradient id={gradientId} cx="30%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="25%" stopColor={color} stopOpacity="1" />
            <Stop offset="80%" stopColor={dark} stopOpacity="1" />
            <Stop offset="100%" stopColor={dark} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

function OrbDot({
  color,
  dark,
  r,
  x,
  y,
  id,
  owner,
}: {
  color: string;
  dark: string;
  r: number;
  x: number;
  y: number;
  id: string | number;
  owner: Player;
}) {
  const d = r * 2;
  const gradientId = `g_orbit_${id}_${owner}`;
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
      }}
    >
      <Svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{ width: d, height: d }}>
        <Defs>
          {/* Fully bright 3D gradient with no muddy grey/black stops */}
          <RadialGradient id={gradientId} cx="30%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="25%" stopColor={color} stopOpacity="1" />
            <Stop offset="80%" stopColor={dark} stopOpacity="1" />
            <Stop offset="100%" stopColor={dark} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

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
    <View style={[styles.container, { width: size, height: size, aspectRatio: 1, alignSelf: 'center' }]}>
      {count === 1 && <SingleOrb color={color} dark={dark} r={r} owner={owner} />}

      {count === 2 && (
        <Animated.View style={{ width: size, height: size, aspectRatio: 1, alignSelf: 'center', transform: [{ rotate: spin }] }}>
          <OrbDot color={color} dark={dark} r={r} x={cx + orbit - r} y={cy - r} id={1} owner={owner} />
          <OrbDot color={color} dark={dark} r={r} x={cx - orbit - r} y={cy - r} id={2} owner={owner} />
        </Animated.View>
      )}

      {count >= 3 && (
        <Animated.View style={{ width: size, height: size, aspectRatio: 1, alignSelf: 'center', transform: [{ rotate: spin }] }}>
          <OrbDot color={color} dark={dark} r={r} x={cx + orbit - r} y={cy - r} id={1} owner={owner} />
          <OrbDot color={color} dark={dark} r={r} x={cx - 0.5 * orbit - r} y={cy + 0.866 * orbit - r} id={2} owner={owner} />
          <OrbDot color={color} dark={dark} r={r} x={cx - 0.5 * orbit - r} y={cy - 0.866 * orbit - r} id={3} owner={owner} />
        </Animated.View>
      )}
    </View>
  );
}

export default function Orb({ count, owner, size }: OrbProps) {
  const [activeOwner, setActiveOwner] = useState<Player>(owner);
  const [prevOwner, setPrevOwner] = useState<Player | null>(null);
  
  const transitionVal = useRef(new Animated.Value(1)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // Spin rotation loop for count > 1
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

  // Handle color morph transition when owner changes (takes time, e.g. 400ms fading)
  useEffect(() => {
    if (owner !== activeOwner) {
      setPrevOwner(activeOwner);
      setActiveOwner(owner);
      transitionVal.setValue(0);

      Animated.timing(transitionVal, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setPrevOwner(null);
      });
    }
  }, [owner, activeOwner]);

  const scale = transitionVal.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.12, 1], // Subtle swell/settle transition
  });

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {prevOwner !== null ? (
        <>
          {/* Previous owner fading out */}
          <Animated.View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              opacity: transitionVal.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              transform: [{ scale }],
            }}
          >
            <OrbLayout count={count} owner={prevOwner} size={size} spinValue={spinValue} />
          </Animated.View>

          {/* Current owner fading in */}
          <Animated.View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              opacity: transitionVal.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [{ scale }],
            }}
          >
            <OrbLayout count={count} owner={activeOwner} size={size} spinValue={spinValue} />
          </Animated.View>
        </>
      ) : (
        /* Static stable state rendering */
        <Animated.View style={{ width: size, height: size }}>
          <OrbLayout count={count} owner={activeOwner} size={size} spinValue={spinValue} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
