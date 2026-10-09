import React, { useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import type { ReadingLayout } from '@/appearance/typography';
import { buildPages, pageIndexFor } from '@/core/pages';
import { bionicPrefixLength } from '@/core/syllable';
import { THIN_SPACE, typeset, type TypesetOptions } from '@/core/typeset';
import type { Chunk } from '@/core/types';
import { useSettings } from '@/store/SettingsContext';
import { readingFontStyle, type Theme } from '@/ui/theme';

/**
 * Akış hâlindeki iki mod: **Bionic** ve **Yürüyen Vurgu**.
 *
 * İkisi de metni normal paragraf düzeninde gösterir, fark yalnızca kelimelerin
 * nasıl boyandığında; bu yüzden tek bileşen. Metin sayfalara bölünür
 * (bkz. `core/pages`) ve vurgu sayfanın sonuna gelince sayfa değişir.
 */
export function FlowView({
  chunks,
  index,
  variant,
  layout,
  markedSentences,
  activeSentence,
}: {
  chunks: Chunk[];
  index: number;
  variant: 'bionic' | 'highlight';
  /** Hizalama, harf/kelime aralığı, heceleme (Aa → Sayfa düzeni) */
  layout: ReadingLayout;
  /** Alıntı defterine eklenmiş cümleler (cümle sırası) */
  markedSentences?: Set<number>;
  /** Sesli okumada seslendirilen cümle: bütün cümle vurgulanır */
  activeSentence?: number;
}) {
  const { theme, settings } = useSettings();
  const [box, setBox] = useState({ width: 0, height: 0 });

  const fontSize = 20 * settings.fontScale;
  const lineHeight = fontSize * settings.lineSpacing;

  /**
   * Sayfaya kaç kelime konacağını **ölçerek** belirliyoruz. Sabit bir sayı
   * (örn. 70) küçük ekranda ya da büyük yazı boyutunda taşıyor, taşan metin de
   * kontrollerin üstüne biniyordu.
   */
  const wordsPerPage = useMemo(() => {
    if (box.height < lineHeight * 2 || box.width < 80) return 20;
    const lines = Math.floor(box.height / lineHeight);
    // Ortalama Türkçe kelime ~6,5 harf + boşluk; harf genişliği yazı tipine,
    // harf aralığına ve kelime aralığına (ince boşluk ≈ 0,2 em) göre
    const wordWidth =
      7.5 * fontSize * (theme.readingFont.charEm + 0.02 + layout.letterSpacingEm) +
      layout.extraWordSpace * 0.2 * fontSize;
    const perLine = Math.max(1, box.width / wordWidth);
    // 0.8: satır sonlarında kalan boşluk payı (kelimeler satıra tam oturmaz)
    return Math.max(8, Math.floor(lines * perLine * 0.8));
  }, [box, fontSize, lineHeight, theme.readingFont.charEm, layout.letterSpacingEm, layout.extraWordSpace]);

  const pages = useMemo(() => buildPages(chunks, wordsPerPage), [chunks, wordsPerPage]);
  const page = pages[pageIndexFor(pages, index)];

  const visible = useMemo(() => {
    if (!page) return [];
    return chunks.slice(page.start, page.end).map((chunk, offset) => ({
      chunk,
      chunkIndex: page.start + offset,
    }));
  }, [chunks, page]);

  const baseColor =
    variant === 'highlight' && settings.dimSurrounding
      ? theme.colors.textFaint
      : theme.colors.textDim;

  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) =>
          Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
            ? current
            : { width, height }
        );
      }}
      // Ölçüm payı yanılırsa metin arayüzün üstüne binmesin
      style={{ flex: 1, overflow: 'hidden', justifyContent: 'center' }}
    >
      <Text
        style={{
          fontSize,
          lineHeight,
          color: baseColor,
          letterSpacing: fontSize * layout.letterSpacingEm,
          textAlign: layout.textAlign,
          ...readingFontStyle(theme),
        }}
        {...(Platform.OS === 'android' && layout.hyphenate ? { android_hyphenationFrequency: 'normal' as const } : {})}
      >
        {visible.map(({ chunk, chunkIndex }) => (
          <ChunkSpan
            key={chunkIndex}
            chunk={chunk}
            current={
              activeSentence === undefined
                ? chunkIndex === index
                : chunk.sentenceIndex === activeSentence
            }
            read={chunkIndex < index}
            variant={variant}
            theme={theme}
            bionicRatio={settings.bionicRatio}
            baseColor={baseColor}
            hyphenate={layout.hyphenate}
            extraWordSpace={layout.extraWordSpace}
            marked={markedSentences?.has(chunk.sentenceIndex) ?? false}
          />
        ))}
      </Text>
    </View>
  );
}

/**
 * `React.memo`: okuyucu her kelimede yeniden render oluyor. Bir sayfada onlarca
 * kelime var; hepsini her karede baştan çizmek yerine yalnızca durumu değişen
 * iki kelimeyi (eski ve yeni geçerli kelime) güncelliyoruz.
 */
const ChunkSpan = React.memo(function ChunkSpan({
  chunk,
  current,
  read,
  variant,
  theme,
  bionicRatio,
  baseColor,
  marked,
  hyphenate,
  extraWordSpace,
}: {
  chunk: Chunk;
  hyphenate: boolean;
  extraWordSpace: number;
  marked: boolean;
  current: boolean;
  read: boolean;
  variant: 'bionic' | 'highlight';
  theme: Theme;
  bionicRatio: number;
  baseColor: string;
}) {
  // Geçerli kelime her iki modda da açıkça belli olmalı: vurgu modunda zemin,
  // bionic modda accent rengi (zemin, kalın harflerle birlikte gürültü yapıyor)
  const color = current
    ? variant === 'bionic'
      ? theme.colors.accent
      : theme.colors.text
    : read
      ? theme.colors.textDim
      : baseColor;

  const background =
    current && variant === 'highlight'
      ? theme.colors.highlight
      : marked
        ? theme.colors.accentSoft
        : undefined;

  // Bionic'te kelime koyu/açık iki parçaya bölündüğü için heceleme yok;
  // kelime aralığı yine uygulanıyor
  const space = `${THIN_SPACE.repeat(extraWordSpace)} `;
  if (variant === 'bionic') {
    return (
      <Text style={{ color, backgroundColor: background }}>
        {chunk.tokens.map((token, i) => (
          <BionicWord
            key={i}
            word={i < chunk.tokens.length - 1 ? `${token.text}${space}` : token.text}
            ratio={bionicRatio}
            theme={theme}
            color={color}
            boldColor={current ? theme.colors.accent : theme.colors.text}
          />
        ))}
        {space}
      </Text>
    );
  }

  const options: TypesetOptions = { hyphenate, extraWordSpace };
  return (
    <Text style={{ color, backgroundColor: background }}>{typeset(`${chunk.text} `, options)}</Text>
  );
});

/** Kelimenin ilk hecesini koyulaştırır — göz kelimeyi tamamını taramadan tanır. */
function BionicWord({
  word,
  ratio,
  theme,
  color,
  boldColor,
}: {
  word: string;
  ratio: number;
  theme: Theme;
  color: string;
  boldColor: string;
}) {
  const split = bionicPrefixLength(word.trimEnd(), ratio);
  return (
    <Text>
      <Text style={{ color: boldColor, ...readingFontStyle(theme, '800') }}>{word.slice(0, split)}</Text>
      <Text style={{ color }}>{word.slice(split)}</Text>
    </Text>
  );
}
