// ============================================================
// Zustand — Settings Store (persisted)
// ============================================================

import { create } from 'zustand';
import { Settings } from '../types';

interface SettingsState extends Settings {
  setSoundEnabled: (val: boolean) => void;
  setMusicEnabled: (val: boolean) => void;
  setHapticEnabled: (val: boolean) => void;
  setAnimationQuality: (val: 'low' | 'medium' | 'high') => void;
  setDarkMode: (val: boolean) => void;
  setGridSize: (val: '6x13' | '7x15' | '8x16') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  musicEnabled: false,
  hapticEnabled: true,
  animationQuality: 'high',
  darkMode: true,
  gridSize: '6x13', // Normal default is 6x13

  setSoundEnabled: (val) => set({ soundEnabled: val }),
  setMusicEnabled: (val) => set({ musicEnabled: val }),
  setHapticEnabled: (val) => set({ hapticEnabled: val }),
  setAnimationQuality: (val) => set({ animationQuality: val }),
  setDarkMode: (val) => set({ darkMode: val }),
  setGridSize: (val) => set({ gridSize: val }),
}));
