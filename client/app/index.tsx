// ============================================================
// Splash Screen — Animated glowing logo with rotating atoms
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const ATOM_SIZE = 180;

function RotatingRing({
  radius,
  color,
  duration,
  delay,
  tiltX,
}: {
  radius: number;
  color: string;
  duration: number;
  delay: number;
  tiltX: number;
}) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const timeout = setTimeout(() => {
      anim.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      anim.stop();
    };
  }, [duration, delay]);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const d = radius * 2;

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: d, height: d, alignItems: 'center', justifyContent: 'center' },
        {
          transform: [{ rotateX: `${tiltX}deg` }, { rotate }],
        },
      ]}
    >
      <Svg width={d} height={d} style={{ position: 'absolute' }}>
        <Ellipse
          cx={radius}
          cy={radius}
          rx={radius - 4}
          ry={radius * 0.35}
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.7}
          fill="none"
        />
        {/* Orbiting orb */}
        <Circle cx={radius * 2 - 10} cy={radius} r={5} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Navigate to home after 3s
    const timer = setTimeout(() => {
      router.replace('/home');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.gradientEnd, COLORS.gradientMid, COLORS.gradientStart]}
      style={styles.container}
    >
      {/* Atom Logo */}
      <Animated.View style={[styles.atomContainer, { opacity, transform: [{ scale }] }]}>
        <RotatingRing radius={ATOM_SIZE / 2} color={COLORS.neonBlue} duration={2000} delay={0} tiltX={70} />
        <RotatingRing radius={ATOM_SIZE / 2} color={COLORS.player1} duration={2500} delay={300} tiltX={20} />
        <RotatingRing radius={ATOM_SIZE / 2} color={COLORS.player2} duration={1800} delay={150} tiltX={50} />

        {/* Nucleus */}
        <View style={styles.nucleus}>
          <Svg width={50} height={50}>
            <Circle cx={25} cy={25} r={22} fill={COLORS.neonBlue} fillOpacity={0.15} />
            <Circle cx={25} cy={25} r={14} fill={COLORS.neonBlue} fillOpacity={0.3} />
            <Circle cx={25} cy={25} r={7} fill={COLORS.neonBlue} />
          </Svg>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.title}>CHAIN</Text>
        <Text style={[styles.title, styles.titleAccent]}>REACTION</Text>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Made for Booblie Only ❤️
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  atomContainer: {
    width: ATOM_SIZE,
    height: ATOM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nucleus: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    gap: 0,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 8,
    lineHeight: 44,
  },
  titleAccent: {
    color: COLORS.neonBlue,
    textShadowColor: COLORS.neonBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    letterSpacing: 3,
    fontWeight: '600',
  },
});
