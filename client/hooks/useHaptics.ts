// ============================================================
// useHaptics — Haptic feedback wrapper
// ============================================================

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

export function useHaptics() {
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);

  const lightTap = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hapticEnabled]);

  const mediumBump = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [hapticEnabled]);

  const heavyPulse = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [hapticEnabled]);

  const successNotify = useCallback(() => {
    if (!hapticEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [hapticEnabled]);

  return { lightTap, mediumBump, heavyPulse, successNotify };
}
