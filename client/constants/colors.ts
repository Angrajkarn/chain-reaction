// ============================================================
// Neon Sci-Fi Color Palette
// ============================================================

export const COLORS = {
  // Backgrounds
  bg: '#0a0a0f',
  bgCard: 'rgba(255, 255, 255, 0.04)',
  bgCardBorder: 'rgba(255, 255, 255, 0.10)',

  // Player colors — classic Chain Reaction glossy sphere palette
  player1: '#FF2D55',       // Classic bright glowing Red
  player1Glow: '#FF5A7A80',
  player1Dark: '#8B0A2A',
  player2: '#32D74B',       // Classic bright glowing Green
  player2Glow: '#6BFF8A80',
  player2Dark: '#0A5C1E',

  // Neon accents
  neonBlue: '#00D4FF',
  neonPurple: '#BE00FF',
  neonYellow: '#FFE600',
  neonOrange: '#FF6B00',

  // UI
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.60)',
  textMuted: 'rgba(255, 255, 255, 0.35)',

  // Cell
  cellBg: 'rgba(255, 255, 255, 0.03)',
  cellBorder: 'rgba(0, 212, 255, 0.20)',
  cellBorderActive: 'rgba(0, 212, 255, 0.60)',

  // Gradient stops
  gradientStart: '#0a0a0f',
  gradientMid: '#12081e',
  gradientEnd: '#050510',

  // Glass
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',
};

export const PLAYER_COLORS: Record<1 | 2, { primary: string; glow: string; dark: string; label: string }> = {
  1: {
    primary: COLORS.player1,
    glow: COLORS.player1Glow,
    dark: COLORS.player1Dark,
    label: 'RED',
  },
  2: {
    primary: COLORS.player2,
    glow: COLORS.player2Glow,
    dark: COLORS.player2Dark,
    label: 'GREEN',
  },
};
