import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Chunk } from '@/core/types';
import { useSettings } from '@/store/SettingsContext';
import { fontStyle } from '@/ui/theme';

/**
 * RSVP (Rapid Serial Visual Presentation) — kelimeler tek bir noktada belirir.
 *
 * İşin püf noktası pivot harfin ekranda **sabit** bir yatay konumda kalması.
 * Bunu üç parçalı bir satırla çözüyoruz:
 *
 *   [ sol bölge: sağa yaslı ][ pivot harfi ][ sağ bölge: sola yaslı ]
 *
 * İki bölgenin genişlik oranı sabit olduğu için pivot harf her karede aynı
 * noktada kalır. Yöntem sabit genişlikli (monospace) font gerektirmiyor —
 * monospace okuma hızını düşürdüğü için bundan kaçınmak önemli.
 *
 * Pivot tam ortada değil %40'ta: Türkçede pivottan sonraki bölüm neredeyse
 * her zaman daha uzun (ekler sona geliyor), dolayısıyla sağ tarafa daha fazla
 * yer ayırmak aynı ekranda belirgin biçimde daha büyük yazı demek.
 */
const PIVOT_X = 0.4;

/** Oransal bir fontta ortalama karakter genişliği (em cinsinden). */
const CHAR_EM = 0.6;

export function RsvpView({ chunk }: { chunk: Chunk | undefined }) {
  const { theme, settings } = useSettings();
  const { width } = useWindowDimensions();

  if (!chunk) return <View style={styles.container} />;

  const text = chunk.text;
  const pivot = Math.max(0, Math.min(chunk.pivot, text.length - 1));
  const before = text.slice(0, pivot);
  const pivotChar = text[pivot] ?? '';
  const after = text.slice(pivot + 1);

  // Uzun kelimenin ilk parçalarında devam tiresi: gözün kelimenin bittiğini
  // sanmasını engelliyor
  const continues = Boolean(chunk.partOf && chunk.partOf.index < chunk.partOf.total - 1);

  /**
   * Pivot kilidi yalnızca tek kelimede anlamlı. Çok kelimeli bir grup, pivotu
   * sabit tutmak için gereken yarım genişliğe sığmıyor ve kırpılıyordu; grup
   * modunda bütünü ortalamak doğru davranış: göz grubun ortasına sabitlenip
   * yanları çevresel görüşle yakalıyor.
   */
  const lockPivot = chunk.tokens.length === 1 && !chunk.partOf;

  // Kelimenin tamamının ekrana sığması yetmez: pivot kilitliyken her iki
  // bölgenin kendi payına sığması gerekir, yoksa uzun kelimeler kenardan taşar.
  const base = 46 * settings.fontScale;
  const fitWhole = (width * 0.9) / Math.max(6, text.length * CHAR_EM);
  const fontSize = Math.max(
    18,
    lockPivot
      ? Math.min(
          base,
          fitWhole,
          (width * PIVOT_X * 0.9) / Math.max(1.5, before.length * CHAR_EM),
          (width * (1 - PIVOT_X) * 0.9) / Math.max(1.5, (after.length + 1) * CHAR_EM)
        )
      : Math.min(base, fitWhole)
  );

  const wordStyle = {
    fontSize,
    lineHeight: fontSize * 1.25,
    color: theme.colors.text,
    ...fontStyle(theme, '600'),
  };

  const guideHeight = fontSize * 0.3;
  const guideGap = fontSize * 0.2;
  const showGuides = settings.showPivotGuides && lockPivot;

  if (!lockPivot) {
    return (
      <View style={styles.container}>
        <Text numberOfLines={2} style={[wordStyle, styles.centered]}>
          {before}
          <Text style={{ color: theme.colors.pivot }}>{pivotChar}</Text>
          {after}
          {continues ? <Text style={{ color: theme.colors.textFaint }}>‑</Text> : null}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.side, { flex: PIVOT_X }]}>
          <Text numberOfLines={1} style={[wordStyle, styles.right]}>
            {before}
          </Text>
        </View>

        {/* Kılavuzlar pivot harfin kendi kolonunda: her pivot konumunda tam hizalı */}
        <View style={styles.pivotColumn}>
          <View
            style={[
              styles.guide,
              {
                height: guideHeight,
                marginBottom: guideGap,
                backgroundColor: showGuides ? theme.colors.border : 'transparent',
              },
            ]}
          />
          <Text numberOfLines={1} style={[wordStyle, { color: theme.colors.pivot }]}>
            {pivotChar}
          </Text>
          <View
            style={[
              styles.guide,
              {
                height: guideHeight,
                marginTop: guideGap,
                backgroundColor: showGuides ? theme.colors.border : 'transparent',
              },
            ]}
          />
        </View>

        <View style={[styles.side, { flex: 1 - PIVOT_X }]}>
          <Text numberOfLines={1} style={[wordStyle, styles.left]}>
            {after}
            {continues ? <Text style={{ color: theme.colors.textFaint }}>‑</Text> : null}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  side: {
    flexDirection: 'row',
  },
  pivotColumn: {
    alignItems: 'center',
  },
  right: {
    flex: 1,
    textAlign: 'right',
  },
  left: {
    flex: 1,
    textAlign: 'left',
  },
  centered: {
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  guide: {
    width: 2,
    borderRadius: 1,
  },
});
