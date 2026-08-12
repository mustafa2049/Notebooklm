import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { useTheme } from '@/store/SettingsContext';
import { Txt } from './primitives';

/**
 * Kaydırıcı — @react-native-community/slider yerine kendimiz çiziyoruz.
 * Sebep: o paket web'de ayrı bir uygulamaya düşüyor ve görünüm platformlar
 * arasında tutarsız oluyor; hem de fazladan bir native bağımlılık demek.
 *
 * Dokunma noktası mutlak sayfa koordinatı yerine `locationX` + `dx` ile
 * hesaplanır; böylece hem web'de fare hem telefonda parmak aynı kodla çalışır.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onSlidingComplete,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  onSlidingComplete?: (next: number) => void;
  label?: string;
  format?: (value: number) => string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startRatio = useRef(0);
  const latest = useRef(value);

  const clampToStep = (ratio: number) => {
    const raw = min + Math.max(0, Math.min(1, ratio)) * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, Number(stepped.toFixed(4))));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (widthRef.current <= 0) return;
          startRatio.current = event.nativeEvent.locationX / widthRef.current;
          latest.current = clampToStep(startRatio.current);
          onChange(latest.current);
        },
        onPanResponderMove: (_event, gesture) => {
          if (widthRef.current <= 0) return;
          const ratio = startRatio.current + gesture.dx / widthRef.current;
          const next = clampToStep(ratio);
          if (next !== latest.current) {
            latest.current = next;
            onChange(next);
          }
        },
        onPanResponderRelease: () => onSlidingComplete?.(latest.current),
        onPanResponderTerminate: () => onSlidingComplete?.(latest.current),
      }),
    // Kaydırıcı sınırları değişirse responder yeniden kurulmalı
    [min, max, step, onChange, onSlidingComplete]
  );

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const filled = Math.max(0, Math.min(1, ratio));

  return (
    <View style={{ paddingVertical: theme.space(2) }}>
      {label ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.space(2),
          }}
        >
          <Txt variant="body">{label}</Txt>
          <Txt variant="mono" style={{ color: theme.colors.accent, fontWeight: '700' }}>
            {format ? format(value) : value}
          </Txt>
        </View>
      ) : null}

      <View
        {...responder.panHandlers}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          widthRef.current = next;
          setWidth(next);
        }}
        // Dokunma alanı çubuktan yüksek: parmakla tam isabet gerekmesin
        style={{ height: 40, justifyContent: 'center' }}
      >
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.surfaceAlt,
            overflow: 'hidden',
          }}
        >
          <View
            style={{ width: `${filled * 100}%`, height: '100%', backgroundColor: theme.colors.accent }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: Math.max(0, filled * width - 11),
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: theme.colors.accent,
            borderWidth: 3,
            borderColor: theme.colors.bg,
          }}
        />
      </View>
    </View>
  );
}
