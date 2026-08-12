import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { useTheme } from '@/store/SettingsContext';
import { Txt } from './primitives';

export interface Bar {
  label: string;
  value: number;
  /** Vurgulanacak sütun (bugün) */
  emphasis?: boolean;
}

/**
 * Günlük okuma grafiği. Kasıtlı olarak sade: eksen etiketi, ızgara ve gölge
 * yok — okunması gereken tek şey "hangi gün ne kadar okudum".
 */
export function BarChart({ bars, height = 120 }: { bars: Bar[]; height?: number }) {
  const theme = useTheme();
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const gap = 4;
  const width = 100; // yüzde tabanlı viewBox: kapsayıcıya uyum sağlar
  const barWidth = (width - gap * (bars.length - 1)) / bars.length;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Line
          x1={0}
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke={theme.colors.border}
          strokeWidth={1}
        />
        {bars.map((bar, index) => {
          // Sıfır olan günler de görünsün: en az 2 birim yükseklik
          const barHeight = bar.value > 0 ? Math.max(3, (bar.value / max) * (height - 6)) : 2;
          return (
            <Rect
              // Etiketler tekrar edebilir (14 günde aynı gün adı iki kez geçer)
              key={index}
              x={index * (barWidth + gap)}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              rx={1.5}
              fill={
                bar.value === 0
                  ? theme.colors.surfaceAlt
                  : bar.emphasis
                    ? theme.colors.accent
                    : theme.colors.textFaint
              }
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.space(1.5) }}>
        <Txt variant="dim" style={{ fontSize: 11 }}>
          {bars[0]?.label}
        </Txt>
        <Txt variant="dim" style={{ fontSize: 11 }}>
          {bars[bars.length - 1]?.label}
        </Txt>
      </View>
    </View>
  );
}
