// ============================================================
// useSound — Tactile tuk-tuk sound effects using Expo AV
// ============================================================

import { useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';

// Publicly hosted stable click audio with full permissive CORS headers (Metronome Woodblock click)
const TUK_SOUND_URL = 'https://daveceddia.com/freebies/react-metronome/click1.wav';
const FALLBACK_TUK_SOUND_URL = 'https://cdn.jsdelivr.net/gh/google/blockly@master/media/disconnect.mp3';

let isAudioModeConfigured = false;

/**
 * Configure global audio mode once to avoid hardware lags on every sound trigger.
 */
async function ensureAudioMode() {
  if (isAudioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isAudioModeConfigured = true;
  } catch (err) {
    console.warn('[useSound] Failed to configure audio mode:', err);
  }
}

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  // Set up audio mode immediately when the hook is loaded
  useEffect(() => {
    ensureAudioMode();
  }, []);

  const playTuk = useCallback(
    async () => {
      if (!soundEnabled) return;

      try {
        await ensureAudioMode();

        let soundObj;
        try {
          soundObj = await Audio.Sound.createAsync(
            { uri: TUK_SOUND_URL },
            { shouldPlay: true, volume: 1.0 } // Play at maximum volume for a strong look/feel
          );
        } catch (primaryErr) {
          // Resilient fallback to Blockly's disconnect clack CDN if primary is rate-limited/offline
          soundObj = await Audio.Sound.createAsync(
            { uri: FALLBACK_TUK_SOUND_URL },
            { shouldPlay: true, volume: 1.0 }
          );
        }

        const { sound } = soundObj;

        // Terminate and unload sound from memory when done playing
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
      } catch (err) {
        // Fail silently
      }
    },
    [soundEnabled]
  );

  // Map all actions to the single organic "tuk" sound
  const playTap = useCallback((player?: number) => {
    playTuk();
  }, [playTuk]);

  const playExplosion = useCallback(() => {
    playTuk();
  }, [playTuk]);

  // Keep a slightly longer level chime for victory/defeat if desired, or map to tuk
  const playVictory = useCallback(() => {
    playTuk();
  }, [playTuk]);

  const playDefeat = useCallback(() => {
    playTuk();
  }, [playTuk]);

  return { playTap, playExplosion, playVictory, playDefeat };
}
