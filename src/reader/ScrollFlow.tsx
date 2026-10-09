import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import type { ReadingLayout } from '@/appearance/typography';
import { chunkAt, locateLine, scrollSpeed, type ScrollParagraph } from '@/core/scroll';
import { typeset } from '@/core/typeset';
import { useSettings } from '@/store/SettingsContext';
import { readingFontStyle } from '@/ui/theme';

/**
 * Otomatik kaydırma modu: metin hedef hızda yukarı kayar, göz sabit bir okuma
 * çizgisinde kalır (sunucu ekranı gibi).
 *
 * Bütün kitap çizilmiyor: okunan yerin çevresindeki birkaç paragraflık bir
 * pencere var. Üstten çıkan paragraf pencereden atılırken kaydırma payı aynı
 * çizimde düzeltiliyor (`useLayoutEffect`), böylece metin yerinden zıplamıyor.
 * Kaydırma React'i her karede yeniden çizmeden, `Animated.Value` ile yapılıyor.
 */

/** Pencerede en az bu kadar kelime (ve en az 3 paragraf) çizili tutulur */
const WINDOW_WORDS = 700;
/** Okuma çizgisi: alanın üstten bu oranında */
export const READING_LINE = 0.33;
/** Konum bildirimi en sık bu aralıkla */
const REPORT_MS = 400;

export function ScrollFlow({
  paragraphs,
  startParagraph,
  playing,
  wpm,
  fontSize,
  lineHeight,
  layout,
  onToggle,
  onPosition,
  onEnd,
}: {
  paragraphs: ScrollParagraph[];
  /** Açılışta okuma çizgisinde olacak paragraf */
  startParagraph: number;
  playing: boolean;
  wpm: number;
  fontSize: number;
  lineHeight: number;
  layout: ReadingLayout;
  onToggle: () => void;
  /** Okuma çizgisindeki chunk (seyrek bildirilir) */
  onPosition: (chunkIndex: number) => void;
  /** Son paragraf okuma çizgisini geçti */
  onEnd: () => void;
}) {
  const { theme } = useSettings();
  const gap = lineHeight * 0.6;
  const [area, setArea] = useState(0);
  const [first, setFirst] = useState(Math.max(0, startParagraph));
  const heights = useRef(new Map<number, number>());
  /** Pencerenin üstünden itibaren kaydırılan piksel */
  const offset = useRef(0);
  const shift = useRef(new Animated.Value(0)).current;
  /** Atılmayı bekleyen üst paragrafların toplam yüksekliği */
  const pendingTrim = useRef(0);

  // Açılışta başlangıç paragrafı okuma çizgisinde dursun: üstüne pay bırak
  const lead = area * READING_LINE;

  const windowParagraphs = useMemo(() => {
    const list: ScrollParagraph[] = [];
    let words = 0;
    for (let i = first; i < paragraphs.length && (words < WINDOW_WORDS || list.length < 3); i++) {
      list.push(paragraphs[i]);
      words += paragraphs[i].words;
    }
    return list;
  }, [paragraphs, first]);

  useLayoutEffect(() => {
    if (pendingTrim.current === 0) return;
    offset.current -= pendingTrim.current;
    pendingTrim.current = 0;
    shift.setValue(-offset.current);
  }, [first, shift]);

  const latest = useRef({ wpm, onPosition, onEnd, windowParagraphs, gap, lead, area });
  latest.current = { wpm, onPosition, onEnd, windowParagraphs, gap, lead, area };

  const paragraphsRef = useRef(paragraphs);
  paragraphsRef.current = paragraphs;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = 0;
    let lastReport = 0;
    const step = (time: number) => {
      const { wpm: speedWpm, windowParagraphs: list, gap: spacing, lead: top, area: height } = latest.current;
      const dt = last ? Math.min(100, time - last) : 0;
      last = time;
      const measured = list
        .map((paragraph) => ({ height: heights.current.get(paragraph.index), words: paragraph.words }))
        .filter((item): item is { height: number; words: number } => item.height !== undefined);
      offset.current += scrollSpeed(speedWpm, measured, spacing) * dt;
      shift.setValue(-offset.current);

      // Okuma çizgisi pencerenin başından `offset` kadar aşağıda
      const located = locateLine(
        list.map((paragraph) => heights.current.get(paragraph.index)),
        spacing,
        offset.current
      );
      if (located && time - lastReport > REPORT_MS) {
        lastReport = time;
        latest.current.onPosition(chunkAt(list[located.offset], located.fraction));
      }
      const book = paragraphsRef.current;
      if (
        located &&
        located.offset === list.length - 1 &&
        located.fraction >= 1 &&
        list[list.length - 1] === book[book.length - 1]
      ) {
        latest.current.onEnd();
        return;
      }

      // Üstten tamamen çıkan paragraf pencereden atılır
      const firstHeight = heights.current.get(list[0]?.index ?? -1);
      if (
        pendingTrim.current === 0 &&
        firstHeight !== undefined &&
        list.length > 1 &&
        offset.current - top > firstHeight + spacing + height * 0.1
      ) {
        pendingTrim.current = firstHeight + spacing;
        setFirst((value) => value + 1);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, shift]);

  const options = { hyphenate: layout.hyphenate, extraWordSpace: layout.extraWordSpace };
  const textStyle = {
    fontSize,
    lineHeight,
    color: theme.colors.text,
    letterSpacing: fontSize * layout.letterSpacingEm,
    textAlign: layout.textAlign,
    ...readingFontStyle(theme),
  };
  const hyphenation =
    Platform.OS === 'android' && layout.hyphenate ? { android_hyphenationFrequency: 'normal' as const } : {};

  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(event: LayoutChangeEvent) => setArea(event.nativeEvent.layout.height)}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Kaydırmayı duraklat' : 'Kaydırmayı başlat'}
        style={{ flex: 1 }}
      >
        <Animated.View style={{ paddingTop: lead, transform: [{ translateY: shift }] }}>
          {windowParagraphs.map((paragraph) => (
            <View
              key={paragraph.index}
              style={{ marginBottom: gap }}
              onLayout={(event) => heights.current.set(paragraph.index, event.nativeEvent.layout.height)}
            >
              <Text style={textStyle} {...hyphenation}>
                {typeset(paragraph.text, options)}
              </Text>
            </View>
          ))}
        </Animated.View>
      </Pressable>
      {/* Okuma çizgisi: göz burada dursun */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: area * READING_LINE - 2,
          height: lineHeight + 4,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.colors.accent,
          backgroundColor: theme.colors.accentSoft,
          opacity: 0.35,
        }}
      />
    </View>
  );
}
