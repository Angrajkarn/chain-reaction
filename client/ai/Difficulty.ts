// ============================================================
// AI Difficulty — Defines the three difficulty levels
// ============================================================

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'impossible';

export interface DifficultyConfig {
  label: string;
  emoji: string;
  description: string;
  minDelayMs: number;
  maxDelayMs: number;
  minimaxDepth: number;
}

export const DIFFICULTY_CONFIGS: Record<AIDifficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    emoji: '🟢',
    description: 'Random moves with obvious mistakes. Good for beginners.',
    minDelayMs: 700,
    maxDelayMs: 1200,
    minimaxDepth: 0,
  },
  medium: {
    label: 'Medium',
    emoji: '🟡',
    description: 'Prefers expanding cells, avoids danger, occasionally blocks.',
    minDelayMs: 500,
    maxDelayMs: 900,
    minimaxDepth: 2,
  },
  hard: {
    label: 'Hard',
    emoji: '🔴',
    description: 'Minimax with Alpha-Beta pruning. Plans multiple moves ahead.',
    minDelayMs: 300,
    maxDelayMs: 600,
    minimaxDepth: 4,
  },
  impossible: {
    label: 'Impossible',
    emoji: '💀',
    description: 'AlphaZero-style self-play neural evaluation. Deep path lookahead.',
    minDelayMs: 200,
    maxDelayMs: 400,
    minimaxDepth: 5,
  },
};
