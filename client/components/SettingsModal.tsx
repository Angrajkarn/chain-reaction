// ============================================================
// SettingsModal — Overlay with toggles for sound/haptics/etc.
// ============================================================

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../store/settingsStore';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS } from '../constants/theme';

const { width: W } = Dimensions.get('window');

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function SettingRow({ label, subtitle, value, onChange }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.glassBorder, true: COLORS.neonBlue + '80' }}
        thumbColor={value ? COLORS.neonBlue : COLORS.textMuted}
      />
    </View>
  );
}

type Quality = 'low' | 'medium' | 'high';

function QualitySelector({
  value,
  onChange,
}: {
  value: Quality;
  onChange: (v: Quality) => void;
}) {
  const OPTIONS: Quality[] = ['low', 'medium', 'high'];
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>Animation Quality</Text>
      </View>
      <View style={styles.qualityGroup}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.qualityBtn,
              value === opt && { borderColor: COLORS.neonBlue, backgroundColor: COLORS.neonBlue + '20' },
            ]}
          >
            <Text
              style={[
                styles.qualityLabel,
                value === opt ? { color: COLORS.neonBlue } : { color: COLORS.textMuted },
              ]}
            >
              {opt.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface GridSizeSelectorProps {
  value: '6x13' | '7x15' | '8x16';
  onChange: (v: '6x13' | '7x15' | '8x16') => void;
}

function GridSizeSelector({ value, onChange }: GridSizeSelectorProps) {
  const OPTIONS: ('6x13' | '7x15' | '8x16')[] = ['6x13', '7x15', '8x16'];
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>Grid Size / Boxes</Text>
        <Text style={styles.rowSubtitle}>Board size (cols x rows)</Text>
      </View>
      <View style={styles.qualityGroup}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.qualityBtn,
              value === opt && { borderColor: COLORS.neonBlue, backgroundColor: COLORS.neonBlue + '20' },
            ]}
          >
            <Text
              style={[
                styles.qualityLabel,
                value === opt ? { color: COLORS.neonBlue } : { color: COLORS.textMuted },
              ]}
            >
              {opt === '6x13' ? '6x13' : opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const {
    soundEnabled, setSoundEnabled,
    musicEnabled, setMusicEnabled,
    hapticEnabled, setHapticEnabled,
    animationQuality, setAnimationQuality,
    darkMode, setDarkMode,
    gridSize, setGridSize,
  } = useSettingsStore();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={['rgba(0,212,255,0.05)', 'rgba(0,0,0,0)']}
            style={styles.header}
          >
            <Text style={styles.title}>⚙️ Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.content}>
            <SettingRow
              label="Sound Effects"
              subtitle="Tap, explosion, victory sounds"
              value={soundEnabled}
              onChange={setSoundEnabled}
            />
            <SettingRow
              label="Background Music"
              subtitle="Ambient game music"
              value={musicEnabled}
              onChange={setMusicEnabled}
            />
            <SettingRow
              label="Haptic Feedback"
              subtitle="Vibration on tap and explosion"
              value={hapticEnabled}
              onChange={setHapticEnabled}
            />
            <SettingRow
              label="Dark Mode"
              subtitle="Always on for best experience"
              value={darkMode}
              onChange={setDarkMode}
            />
            <QualitySelector
              value={animationQuality}
              onChange={setAnimationQuality}
            />
            <GridSizeSelector
              value={gridSize}
              onChange={setGridSize}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: '#12081e',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: SPACING.sm,
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    gap: SPACING.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  qualityGroup: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  qualityBtn: {
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  qualityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
