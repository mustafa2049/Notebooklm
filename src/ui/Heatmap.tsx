import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/store/SettingsContext';
import { Txt } from './primitives';

/**
 * Takvim ısı haritası: her kare bir gün, sütunlar haftalar (pazartesi üstte).
 *
 * Sıralı tek ton: okunan dakika arttıkça vurgu rengi koyulaşır (az → çok).
 * Okunmayan gün nötr zemin, gelecek günler boş. Renk tek başına bilgi
 * taşımasın diye dokunulan günün tarihi ve dakikası altta yazıyor.
 */

const WEEKDAY_LABELS = ['Pt', '', 'Ça', '', 'Cu', '', 'Pz'];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** Dakika eşikleri: 0 / <5 / <15 / <30 / 30+ */
function level(ms: number): number {
  const minutes = ms / 60000;
  if (minutes <= 0) return 0;
  if (minutes < 5) return 1;
  if (minutes < 15) return 2;
  if (minutes < 30) return 3;
  return 4;
}

const OPACITY = [0, 0.3, 0.55, 0.8, 1];

function describeDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

export function Heatmap({ days }: { days: { day: string; ms: number; future: boolean }[] }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const weeks = Math.ceil(days.length / 7);
  const gap = 3;

  const chosen = days.find((entry) => entry.day === selected);

  return (
    <View style={{ gap: theme.space(2) }}>
      <View style={{ flexDirection: 'row', gap }}>
        <View style={{ gap, marginRight: 2 }}>
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={index} style={{ height: 14, justifyContent: 'center' }}>
              <Txt variant="dim" style={{ fontSize: 9, lineHeight: 11 }}>
                {label}
              </Txt>
            </View>
          ))}
        </View>
        {Array.from({ length: weeks }, (_, week) => (
          <View key={week} style={{ flex: 1, gap }}>
            {days.slice(week * 7, week * 7 + 7).map((entry) => {
              const value = level(entry.ms);
              return (
                <Pressable
                  key={entry.day}
                  disabled={entry.future}
                  onPress={() => setSelected(entry.day)}
                  accessibilityLabel={`${describeDay(entry.day)}: ${Math.round(entry.ms / 60000)} dakika`}
                  hitSlop={2}
                  style={{
                    height: 14,
                    borderRadius: 3,
                    backgroundColor: entry.future
                      ? 'transparent'
                      : value === 0
                        ? theme.colors.surfaceAlt
                        : theme.colors.accent,
                    opacity: entry.future || value === 0 ? 1 : OPACITY[value],
                    borderWidth: selected === entry.day ? 1.5 : 0,
                    borderColor: theme.colors.text,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="dim" style={{ fontSize: 11 }}>
          {chosen
            ? `${describeDay(chosen.day)} · ${Math.round(chosen.ms / 60000)} dk`
            : 'Bir güne dokun'}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Txt variant="dim" style={{ fontSize: 11, marginRight: 2 }}>
            az
          </Txt>
          {OPACITY.map((opacity, index) => (
            <View
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: index === 0 ? theme.colors.surfaceAlt : theme.colors.accent,
                opacity: index === 0 ? 1 : opacity,
              }}
            />
          ))}
          <Txt variant="dim" style={{ fontSize: 11, marginLeft: 2 }}>
            çok
          </Txt>
        </View>
      </View>
    </View>
  );
}
