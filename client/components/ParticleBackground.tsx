// ============================================================
// ParticleBackground — Animated glowing particles
// ============================================================

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const { width: W, height: H } = Dimensions.get('window');

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  const colors = [
    COLORS.neonBlue,
    COLORS.neonPurple,
    COLORS.player1,
    COLORS.player2,
    COLORS.neonYellow,
  ];

  return Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 4 + 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: Math.random() * 4000 + 3000,
    delay: Math.random() * 3000,
  }));
}

const PARTICLES = generateParticles(30);

function FloatingParticle({ particle }: { particle: Particle }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animOpacity = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const animTranslateY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -30,
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const animScale = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.5,
          duration: particle.duration * 0.8,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.5,
          duration: particle.duration * 0.8,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timeout = setTimeout(() => {
      Animated.parallel([animOpacity, animTranslateY, animScale]).start();
    }, particle.delay);

    return () => {
      clearTimeout(timeout);
      animOpacity.stop();
      animTranslateY.stop();
      animScale.stop();
    };
  }, [particle]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size,
          backgroundColor: particle.color,
          shadowColor: particle.color,
          shadowOpacity: 1,
          shadowRadius: particle.size * 3,
          shadowOffset: { width: 0, height: 0 },
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function ParticleBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={['#0a0a0f', '#12081e', '#050510', '#0a0a0f']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {PARTICLES.map((p, i) => (
        <FloatingParticle key={i} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    elevation: 0,
  },
});
