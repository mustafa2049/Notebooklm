import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useTheme } from '@/store/SettingsContext';
import { formatNumber } from './format';
import { Txt } from './primitives';

export interface LinePoint {
  /** Eksen altında görünen kısa etiket (örn. "12 Eki") */
  label: string;
  value: number;
}

/**
 * Tek seriden çizgi grafik (ölçümler boyunca efektif hız).
 *
 * Tek seri olduğu için lejant yok — başlık seriyi adlandırıyor. Çizgi 2 px,
 * noktalar ≥ 8 px, ızgara tek bir silik taban çizgisi. Son değer doğrudan
 * etiketli; diğer noktalara dokununca değeri görünür (dokunma alanı noktadan
 * büyük). Ölçek sıfırdan değil verinin aralığından başlıyor ama bu, alt
 * etikette açıkça yazıyor: küçük değişimleri görmek için gerekli.
 */
export function LineChart({
  points,
  height = 140,
  unit,
}: {
  points: LinePoint[];
  height?: number;
  unit: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) return null;

  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Tek nokta ya da düz seri: aralığı genişlet ki çizgi ortada dursun
  const pad = Math.max(10, (rawMax - rawMin) * 0.2);
  const min = Math.max(0, rawMin - pad);
  const max = rawMax + pad;

  const inset = 12;
  const plotWidth = Math.max(1, width - inset * 2);
  const x = (index: number) =>
    points.length === 1 ? width / 2 : inset + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) => inset + (1 - (value - min) / (max - min)) * (height - inset * 2);

  const shown = active ?? points.length - 1;

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityLabel={`Ölçümler: ${points
          .map((point) => `${point.label} ${Math.round(point.value)} ${unit}`)
          .join(', ')}`}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line
              x1={0}
              y1={height - 0.5}
              x2={width}
              y2={height - 0.5}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
            {points.length > 1 ? (
              <Polyline
                points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')}
                fill="none"
                stroke={theme.colors.accent}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={x(index)}
                cy={y(point.value)}
                r={index === shown ? 5.5 : 4}
                fill={index === shown ? theme.colors.accent : theme.colors.surface}
                stroke={theme.colors.accent}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}
        {/* Dokunma alanları: noktadan büyük, SVG'nin üstünde */}
        {width > 0
          ? points.map((point, index) => (
              <Pressable
                key={index}
                onPress={() => setActive(index)}
                accessibilityLabel={`${point.label}: ${Math.round(point.value)} ${unit}`}
                style={{
                  position: 'absolute',
                  left: x(index) - 18,
                  top: y(point.value) - 18,
                  width: 36,
                  height: 36,
                }}
              />
            ))
          : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: theme.space(1.5),
          gap: theme.space(2),
        }}
      >
        <Txt variant="dim" style={{ fontSize: 11 }}>
          {points[0].label}
        </Txt>
        <Txt variant="body" style={{ fontSize: 12 }}>
          {points[shown].label}: {formatNumber(points[shown].value)} {unit}
        </Txt>
        <Txt variant="dim" style={{ fontSize: 11 }}>
          {points[points.length - 1].label}
        </Txt>
      </View>
    </View>
  );
}
