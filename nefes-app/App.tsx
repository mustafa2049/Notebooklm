import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PHASES } from './src/breathing';
import { useBreathing } from './src/useBreathing';

const MIN_SCALE = 0.6;
const MAX_SCALE = 1;
const MIN_CIRCLE_SIZE = 160;
const MAX_CIRCLE_SIZE = 280;
const KEEP_AWAKE_TAG = 'nefes';

const COLORS = {
  background: '#0B1622',
  text: '#E8F1F5',
  muted: '#8AA3B5',
  accent: '#5CC8C2',
  accentSoft: 'rgba(92, 200, 194, 0.22)',
  line: 'rgba(232, 241, 245, 0.16)',
  onAccent: '#0B1622',
};

export default function App() {
  const { status, phaseIndex, phase, secondsLeft, completedCycles, phaseRemainingMs, start, pause, reset } =
    useBreathing();
  const [scale] = useState(() => new Animated.Value(MIN_SCALE));
  const { width, height } = useWindowDimensions();
  // Leave room for the header, phase steps and buttons (~380pt) on short screens.
  const circleSize = Math.max(MIN_CIRCLE_SIZE, Math.min(MAX_CIRCLE_SIZE, width - 64, height - 380));

  // Grow while inhaling, shrink while exhaling, stay put while holding.
  useEffect(() => {
    if (status === 'idle') {
      scale.setValue(MIN_SCALE);
      return;
    }
    if (status === 'paused') return;

    const { key } = PHASES[phaseIndex];
    if (key === 'holdIn' || key === 'holdOut') {
      scale.setValue(key === 'holdIn' ? MAX_SCALE : MIN_SCALE);
      return;
    }
    const animation = Animated.timing(scale, {
      toValue: key === 'inhale' ? MAX_SCALE : MIN_SCALE,
      duration: phaseRemainingMs,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
    // phaseRemainingMs is only read when a phase starts or resumes; depending on it would restart the animation on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, phaseIndex, completedCycles, scale]);

  useEffect(() => {
    if (status !== 'running') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [status, phaseIndex]);

  useEffect(() => {
    if (status !== 'running') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [status]);

  const isIdle = status === 'idle';
  const primaryLabel = status === 'running' ? 'Duraklat' : status === 'paused' ? 'Devam' : 'Başla';
  const circleShape = { width: circleSize, height: circleSize, borderRadius: circleSize / 2 };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Kutu Nefesi</Text>
        <Text style={styles.subtitle}>4 sn al · 4 sn tut · 4 sn ver · 4 sn tut</Text>
      </View>

      <View style={styles.main}>
        <View style={[styles.circleArea, { width: circleSize, height: circleSize }]}>
          <View style={[styles.ring, circleShape]} />
          <Animated.View style={[styles.circle, circleShape, { transform: [{ scale }] }]} />
          <View style={styles.circleContent}>
            <Text style={styles.phaseLabel}>{isIdle ? 'Hazır' : phase.label}</Text>
            {!isIdle && <Text style={styles.countdown}>{secondsLeft}</Text>}
          </View>
        </View>

        <View style={styles.steps}>
          {PHASES.map((p, i) => {
            const active = !isIdle && i === phaseIndex;
            return (
              <View key={p.key} style={[styles.step, active && styles.stepActive]}>
                <Text style={[styles.stepText, active && styles.stepTextActive]}>{p.label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.cycles}>Tamamlanan tur: {completedCycles}</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          onPress={status === 'running' ? pause : start}
          style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isIdle}
          onPress={reset}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            isIdle && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.secondaryButtonText}>Sıfırla</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  circleArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.line,
  },
  circle: {
    position: 'absolute',
    backgroundColor: COLORS.accentSoft,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  circleContent: {
    alignItems: 'center',
  },
  phaseLabel: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '600',
  },
  countdown: {
    color: COLORS.accent,
    fontSize: 64,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  step: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  stepActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stepText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  stepTextActive: {
    color: COLORS.onAccent,
    fontWeight: '600',
  },
  cycles: {
    color: COLORS.muted,
    fontSize: 15,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    color: COLORS.onAccent,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 17,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.8,
  },
});
