// ============================================================
// useSound — Mock no-op hook (completely silences all audio)
// Keeps all imports and hook invocation signatures intact so
// that compilation does not break.
// ============================================================

import { useCallback } from 'react';

export function useSound() {
  const playTap = useCallback((_player?: number) => {
    // No-op
  }, []);

  const playExplosion = useCallback(() => {
    // No-op
  }, []);

  const playVictory = useCallback(() => {
    // No-op
  }, []);

  const playDefeat = useCallback(() => {
    // No-op
  }, []);

  return { playTap, playExplosion, playVictory, playDefeat };
}
