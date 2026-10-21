import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native';
import type { ReadingLayout } from '@/appearance/typography';
import { chunkPosition, focusBand, followStart, lineAtY, lineTops, type ParagraphBox } from '@/core/lineFocus';
import { pageParagraphs, SAMPLE_PARAGRAPH, type Page, type PageParagraph, type PageSentence } from '@/core/pages';
import { spreadBand, type Spread } from '@/core/spreads';
import { typeset } from '@/core/typeset';
import type { Chunk, Token } from '@/core/types';
import { coreRanges, isVocabWord, type VocabIndex } from '@/core/vocabMarks';
import { hitFromGeometry, plainIndex, tokenAtPlainIndex, type ParagraphGeometry } from '@/core/wordHit';
import { useSettings } from '@/store/SettingsContext';
import { readingFontStyle } from '@/ui/theme';
import { MarkedText, vocabMarkStyle, type MarkRanges } from './MarkedText';
import { charMiddle, domHit, measureOrigin, textLayout } from './textHit';

/**
 * Web'de yatay kaydırmayı tarayıcı kendisi yorumluyordu (ör. "geri git"
 * hareketi) ve sürüklemek metin seçiyordu; sayfa alanında ikisi de kapalı.
 */
const WEB_GESTURES = (Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none' } : {}) as object;

/** Sol kenarın bu oranına dokunmak önceki sayfa; kalanı sonraki */
const PREVIOUS_ZONE = 0.3;
/** Bu kadar yatay kaydırma sayfa çevirir */
const SWIPE_DISTANCE = 40;
/** Çift sayfada iki sütun arası */
const SPREAD_GUTTER = 48;

/**
 * Sayfa modu: metin kitap gibi, paragraflarıyla, sayfa sayfa.
 *
 * Tempo yok; sayfayı kullanıcı çevirir. Sayfanın tamamı tek bir dokunma alanı:
 * sol kenara dokunmak önceki, kalanı sonraki sayfa; yatay kaydırma da çevirir;
 * uzun basmak araç panelini (alıntı, kelime) açar. Tek alan kullanılıyor çünkü
 * metnin içine ayrı dokunulabilir parçalar koymak kaydırmayı bölüyordu.
 *
 * Sayfanın gerçek yüksekliği her çizimde bildirilir; alanı aşarsa sayfalama
 * kapasiteyi küçültür (bkz. `usePagination`) — metin hiçbir zaman kesilmez.
 */
export function PageView({
  chunks,
  page,
  twoColumns = false,
  direction,
  turnId,
  fontSize,
  lineHeight,
  paragraphGap,
  layout,
  markedSentences,
  flashSentence = null,
  activeChunk = null,
  syllableColor = null,
  vocab = null,
  lineFocus = null,
  onFocusLines,
  onFocusMove,
  onFollowLine,
  onCenterTap,
  onTap,
  onAreaLayout,
  onContentHeight,
  onSampleHeight,
  layoutKey,
  onTurn,
  onLongPress,
  onWordLongPress,
}: {
  chunks: Chunk[];
  /** Sayfa; çift sayfada iki sayfanın birleşimi (`split` sağ sayfanın başı) */
  page: Spread | undefined;
  /** Geniş ekranda çift sayfa: alan iki sütun, sayfalama sütun genişliğiyle */
  twoColumns?: boolean;
  /** Son çevirmenin yönü (kayma animasyonu için) */
  direction: 1 | -1;
  /**
   * Kullanıcı her sayfa çevirdiğinde artar. Animasyon buna bağlı: yeniden
   * sayfalama (yazı boyutu, ölçüm) sayfanın başını değiştirse de kaydırmaz.
   */
  turnId: number;
  fontSize: number;
  lineHeight: number;
  /** Paragraflar arası boşluk — sayfalama da aynı değeri kullanıyor */
  paragraphGap: number;
  /** Hizalama, harf/kelime aralığı, heceleme (ölçüm paragrafına da uygulanır) */
  layout: ReadingLayout;
  /** Alıntılanmış cümleler (cümle sırası) */
  markedSentences: Set<number>;
  /** Aramadan gelinen cümle: sayfa çevrilene kadar belirgin */
  flashSentence?: number | null;
  /** Tempo rehberinin bulunduğu chunk (rehber kapalıyken null) */
  activeChunk?: number | null;
  /** Hece renklendirme açıksa ikinci hecelerin rengi */
  syllableColor?: string | null;
  /** Defterdeki kelimeler (işaretleme kapalıysa `null`): altları çizilir */
  vocab?: VocabIndex | null;
  /**
   * Satır odağı: bandın boyu (satır), ilk satırı (`LAST` = son satırlar) ve
   * rehberi izleyip izlemediği (rehber oynarken). Kapalıysa `null`.
   */
  lineFocus?: { size: number; start: number; follow: boolean } | null;
  /** Sayfadaki satır sayısı (bant hareketi için); çift sayfada sol ve sağ sütunun */
  onFocusLines?: (left: number, right: number) => void;
  /** Satır odağı açıkken dokunuş sayfa yerine bandı oynatır */
  onFocusMove?: (delta: 1 | -1) => void;
  /** Rehberi izleyen bandın ilk satırı: rehber durunca elle aynı yerden sürer */
  onFollowLine?: (start: number) => void;
  /** Verilirse sayfanın ortasına dokunmak bunu çağırır (tam ekranda menüler) */
  onCenterTap?: () => void;
  /** Dokunma: `true` dönerse sayfa çevrilmez (ör. rehber duraklatıldı) */
  onTap?: () => boolean;
  onAreaLayout: (event: LayoutChangeEvent) => void;
  onContentHeight: (height: number) => void;
  /** Gizli örnek paragrafın yüksekliği (satır başına karakter ölçümü) */
  onSampleHeight: (height: number) => void;
  /** Sayfalama anahtarı: değişince içerik yeniden kurulup yeniden ölçülür */
  layoutKey: string;
  onTurn: (delta: 1 | -1) => void;
  /** Uzun basma: kelime bulunamazsa (boşluk, ölçü yok) */
  onLongPress: () => void;
  /** Uzun basılan kelime (verilirse önce bu denenir) */
  onWordLongPress?: (token: Token) => void;
}) {
  const { theme } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  // Çift sayfada iki sütun: sol [start, split), sağ [split, end)
  const split = page?.split;
  const columns = useMemo<PageParagraphs[]>(() => {
    if (!page) return [];
    const ranges = split === undefined ? [page] : [{ start: page.start, end: split }, { start: split, end: page.end }];
    return ranges.map((range) => buildParagraphs(chunks, range, layout, vocab));
  }, [chunks, page, split, layout, vocab]);
  const spread = columns.length === 2;
  const markStyle = useMemo(() => vocabMarkStyle(theme.colors.accent), [theme.colors.accent]);
  const sample = useMemo(
    () => typeset(SAMPLE_PARAGRAPH, { hyphenate: layout.hyphenate, extraWordSpace: layout.extraWordSpace }),
    [layout.hyphenate, layout.extraWordSpace]
  );

  // ---- Kısa kayma/solma; sistemde "hareketi azalt" açıksa yok
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);
  const opacity = useRef(new Animated.Value(1)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const animation = useRef(0);
  useEffect(() => {
    if (turnId === 0 || reduceMotion) return;
    const id = ++animation.current;
    const useNativeDriver = Platform.OS !== 'web';
    opacity.setValue(0.35);
    shift.setValue(direction * 18);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 170, useNativeDriver }),
      Animated.timing(shift, { toValue: 0, duration: 170, useNativeDriver }),
    ]).start(({ finished }) => {
      // Yarıda kesilen animasyon metni soluk ya da kaymış bırakmasın
      if (!finished && id === animation.current) {
        opacity.setValue(1);
        shift.setValue(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  // ---- Dokunma ve kaydırma
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  /** Son dokunuşun yeri: uzun basmada hangi kelime olduğu buradan bulunur */
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const onPressIn = (event: GestureResponderEvent) => {
    pressStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    pressPoint.current = pressStart.current;
    swiped.current = false;
  };

  // ---- Uzun basılan kelime (çift sayfada sütun başına ayrı ölçüler)
  const leftRef = useRef<View>(null);
  const rightRef = useRef<View>(null);
  const leftGeometry = useRef<Map<string, ParagraphGeometry>>(new Map());
  const rightGeometry = useRef<Map<string, ParagraphGeometry>>(new Map());
  const findToken = async (point: { x: number; y: number }): Promise<Token | null> => {
    let hit: { key: string; index: number } | null = null;
    let column = 0;
    if (Platform.OS === 'web') {
      // Sağ sütunun kimlikleri "rpr3": önek "rp" ile anahtar "r3" olur
      hit = domHit(point.x - window.scrollX, point.y - window.scrollY, PARAGRAPH_ID);
      if (hit?.key.startsWith('r')) {
        column = 1;
        hit = { ...hit, key: hit.key.slice(1) };
      }
    } else {
      const [leftOrigin, rightOrigin] = await Promise.all([
        measureOrigin(leftRef.current),
        spread ? measureOrigin(rightRef.current) : Promise.resolve(null),
      ]);
      column = rightOrigin && point.x >= rightOrigin.x ? 1 : 0;
      const origin = column === 1 ? rightOrigin : leftOrigin;
      if (origin) {
        hit = hitFromGeometry((column === 1 ? rightGeometry : leftGeometry).current, point.x - origin.x, point.y - origin.y, {
          fontSize,
          letterSpacing: fontSize * layout.letterSpacingEm,
          justify: layout.textAlign === 'justify',
        });
      }
    }
    const paragraph = hit ? columns[column]?.[Number(hit.key)] : undefined;
    if (!hit || !paragraph) return null;
    const display = paragraph.sentences.flatMap((sentence) => sentence.parts.map((part) => part.display)).join('');
    const ordinal = tokenAtPlainIndex(
      paragraph.tokens.map((token) => token.text),
      plainIndex(display, hit.index)
    );
    const token = paragraph.tokens[ordinal];
    return token?.core ? token : null;
  };
  const handleLongPress = () => {
    const point = pressPoint.current;
    if (!onWordLongPress || !point) {
      onLongPress();
      return;
    }
    findToken(point)
      .then((token) => (token ? onWordLongPress(token) : onLongPress()))
      .catch(() => onLongPress());
  };
  const onPressOut = (event: GestureResponderEvent) => {
    const start = pressStart.current;
    pressStart.current = null;
    if (!start) return;
    const dx = event.nativeEvent.pageX - start.x;
    const dy = event.nativeEvent.pageY - start.y;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      // Sola kaydırmak (parmak sola) sonraki sayfa — kitap gibi
      onTurn(dx < 0 ? 1 : -1);
    }
  };
  const onPress = (event: GestureResponderEvent) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (onTap?.()) return;
    const x = event.nativeEvent.pageX;
    // Tam ekranda orta bölge menüleri açar/kapatır; kenarlar sayfa (ya da satır) çevirir
    if (onCenterTap && x >= windowWidth * PREVIOUS_ZONE && x <= windowWidth * (1 - PREVIOUS_ZONE)) {
      onCenterTap();
      return;
    }
    const delta = x < windowWidth * PREVIOUS_ZONE ? -1 : 1;
    // Satır odağında dokunuş bandı bir satır oynatır; sayfa sonunda sayfa döner
    if (lineFocus && onFocusMove) onFocusMove(delta);
    else onTurn(delta);
  };

  const textStyle = {
    fontSize,
    lineHeight,
    color: theme.colors.text,
    letterSpacing: fontSize * layout.letterSpacingEm,
    textAlign: layout.textAlign,
    ...readingFontStyle(theme),
  };
  // Android yumuşak tireyi ancak heceleme açıkken dikkate alıyor
  const hyphenation =
    Platform.OS === 'android' && layout.hyphenate ? { android_hyphenationFrequency: 'normal' as const } : {};

  // ---- Satır odağı iki sütunda: satır sayıları sütunlardan gelir, bant tek
  // sırada (önce sol sütun) ilerler (bkz. core/spreads)
  const hasRight = columns.length === 2;
  const [columnLines, setColumnLines] = useState<[number, number]>([0, 0]);
  const leftLines = useCallback((count: number) => setColumnLines((c) => (c[0] === count ? c : [count, c[1]])), []);
  const rightLines = useCallback((count: number) => setColumnLines((c) => (c[1] === count ? c : [c[0], count])), []);
  const focusOn = lineFocus !== null;
  useEffect(() => {
    if (focusOn) onFocusLines?.(columnLines[0], hasRight ? columnLines[1] : 0);
  }, [focusOn, columnLines, hasRight, onFocusLines]);
  const followRight = useCallback((start: number) => onFollowLine?.(columnLines[0] + start), [onFollowLine, columnLines]);
  const columnFocus = (column: 0 | 1): ColumnFocus | null => {
    if (!lineFocus) return null;
    if (!hasRight) return lineFocus;
    if (lineFocus.follow) {
      // Rehber hangi sütundaysa bant orada; öbür sütun tümüyle karartılır
      const active = activeChunk !== null && split !== undefined && activeChunk >= split ? 1 : 0;
      return column === active ? lineFocus : { ...lineFocus, follow: false, dimAll: true };
    }
    const band = spreadBand(lineFocus.start, columnLines[0], columnLines[1], lineFocus.size);
    return column === band.column ? { ...lineFocus, start: band.start } : { ...lineFocus, dimAll: true };
  };

  const content = (column: 0 | 1, range: Page) => (
    <PageContent
      key={`${range.start}-${range.end}-${layoutKey}`}
      paragraphs={columns[column] ?? []}
      idPrefix={column === 1 ? RIGHT_COLUMN_ID : PARAGRAPH_ID}
      textStyle={textStyle}
      hyphenation={hyphenation}
      lineHeight={lineHeight}
      paragraphGap={paragraphGap}
      markedSentences={markedSentences}
      flashSentence={flashSentence}
      activeChunk={activeChunk}
      syllableColor={syllableColor}
      markStyle={markStyle}
      lineFocus={columnFocus(column)}
      onFocusLines={column === 1 ? rightLines : leftLines}
      onFollowLine={column === 1 ? followRight : onFollowLine}
      onContentHeight={onContentHeight}
      contentRef={column === 1 ? rightRef : leftRef}
      geometry={column === 1 ? rightGeometry : leftGeometry}
    />
  );

  // Ölçüm: aynı yazı tipi ve genişlikte (çift sayfada sütun genişliğinde) örnek paragraf, görünmez
  const sampleView = (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }}
    >
      <Text style={textStyle} {...hyphenation} onLayout={(event) => onSampleHeight(event.nativeEvent.layout.height)}>
        {sample}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={twoColumns ? undefined : onAreaLayout}>
      {twoColumns ? null : sampleView}
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={450}
        accessibilityHint="Sağa dokun ya da sola kaydır: sonraki sayfa. Sol kenara dokun: önceki sayfa. Kelimeye uzun bas: anlamı."
        style={[{ flex: 1 }, WEB_GESTURES]}
      >
        {/* Animasyonlu katman yerinde kalır; ölçülen içerik onun içinde ve
            sayfalama değişince yeniden kurulur (animasyonu bölmeden) */}
        <Animated.View
          style={[{ opacity, transform: [{ translateX: shift }] }, twoColumns ? { flex: 1, flexDirection: 'row' } : null]}
        >
          {twoColumns ? (
            <>
              {/* Sayfalama sol sütunun ölçüsüyle: iki sütun aynı genişlikte */}
              <View style={{ flex: 1 }} onLayout={onAreaLayout}>
                {sampleView}
                {page ? content(0, { start: page.start, end: split ?? page.end }) : null}
              </View>
              <View style={{ width: SPREAD_GUTTER, alignItems: 'center' }}>
                <View style={{ flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />
              </View>
              <View style={{ flex: 1 }}>{page && split !== undefined ? content(1, { start: split, end: page.end }) : null}</View>
            </>
          ) : page ? (
            content(0, page)
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Paragraf köklerinin kimlik öneki (web'de kelime bulmak için); sağ sütunda `rpr` */
const PARAGRAPH_ID = 'rp';
const RIGHT_COLUMN_ID = 'rpr';

/**
 * Sayfanın (ya da sütunun) paragrafları. Heceleme ve kelime aralığı görünmez
 * işaretlerle yapılıyor (bkz. core/typeset). Cümleler chunk parçalarıyla
 * çiziliyor: tempo rehberi geçerli parçayı vurgulayabilsin; satır kırılımı
 * aynı (parçalar satır içi).
 */
function buildParagraphs(chunks: Chunk[], range: Page, layout: ReadingLayout, vocab: VocabIndex | null): PageParagraphs {
  const options = { hyphenate: layout.hyphenate, extraWordSpace: layout.extraWordSpace };
  const marked = (core: string) => (vocab ? isVocabWord(vocab, core) : false);
  return pageParagraphs(chunks, range).map((paragraph) => ({
    ...paragraph,
    sentences: paragraph.sentences.map((sentence, sentenceIndex) => ({
      ...sentence,
      parts: sentence.parts.map((part, partIndex) => {
        const display = typeset(sentenceIndex === 0 && partIndex === 0 ? part.text : ` ${part.text}`, options);
        return { ...part, display, marks: vocab ? coreRanges(display, part.tokens, marked) : undefined };
      }),
    })),
  }));
}

/** Sütunun satır odağı; `dimAll`: bant öbür sütunda, bu sütun tümüyle karartılır */
type ColumnFocus = { size: number; start: number; follow: boolean; dimAll?: boolean };

/** Sayfanın paragrafları; her parça çizilecek biçimiyle (`typeset`) */
type PageParagraphs = (Omit<PageParagraph, 'sentences'> & {
  sentences: (Omit<PageSentence, 'parts'> & {
    parts: (PageSentence['parts'][number] & { display: string; marks?: MarkRanges })[];
  })[];
})[];

/**
 * Sayfanın çizilen içeriği. Sayfaya anahtarlı: paragraf yerleşimleri (satır
 * odağı ve kelime bulma için) sayfa değişince kendiliğinden sıfırlanır.
 */
function PageContent({
  paragraphs,
  idPrefix,
  textStyle,
  hyphenation,
  lineHeight,
  paragraphGap,
  markedSentences,
  flashSentence,
  activeChunk,
  syllableColor,
  markStyle,
  lineFocus,
  onFocusLines,
  onFollowLine,
  onContentHeight,
  contentRef,
  geometry,
}: {
  paragraphs: PageParagraphs;
  /** Paragraf kimliklerinin öneki (web'de kelime bulma; sütuna göre) */
  idPrefix: string;
  textStyle: TextStyle;
  hyphenation: object;
  lineHeight: number;
  paragraphGap: number;
  markedSentences: Set<number>;
  flashSentence: number | null;
  activeChunk: number | null;
  syllableColor: string | null;
  markStyle: TextStyle;
  lineFocus: ColumnFocus | null;
  onFocusLines?: (count: number) => void;
  onFollowLine?: (start: number) => void;
  onContentHeight: (height: number) => void;
  /** Telefonda kelime bulmak için: içerik alanı ve paragrafların ölçüleri */
  contentRef: React.RefObject<View | null>;
  geometry: React.MutableRefObject<Map<string, ParagraphGeometry>>;
}) {
  const { theme } = useSettings();
  const [boxes, setBoxes] = useState<Record<number, ParagraphBox>>({});
  // Önceki sayfanın ölçüleri bu sayfanın kelimeleriyle karışmasın
  useEffect(() => {
    const map = geometry.current;
    return () => map.clear();
  }, [geometry]);
  const tops = useMemo(() => lineTops(Object.values(boxes), lineHeight), [boxes, lineHeight]);
  const focusOn = lineFocus !== null;
  useEffect(() => {
    if (focusOn) onFocusLines?.(tops.length);
  }, [focusOn, tops.length, onFocusLines]);

  // Rehber oynarken bant, vurgulanan parçanın satırını izler (vurguyla aynı
  // karede kaysın diye çizimden önce ölçülür)
  const follow = Boolean(lineFocus?.follow);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!follow || activeChunk === null || !tops.length) return;
    const position = chunkPosition(paragraphs, activeChunk);
    const box = position ? boxes[position.paragraph] : undefined;
    if (!position || !box) return;
    const middle = charMiddle(geometry, idPrefix, String(position.paragraph), position.offset);
    if (middle !== null) setActiveLine(lineAtY(tops, box.y + middle, lineHeight));
  }, [follow, activeChunk, paragraphs, boxes, tops, lineHeight, geometry, idPrefix]);
  const followed = follow && lineFocus && activeLine !== null ? followStart(activeLine, lineFocus.size, tops.length) : null;
  useEffect(() => {
    if (followed !== null) onFollowLine?.(followed);
  }, [followed, onFollowLine]);
  const band =
    lineFocus && !lineFocus.dimAll ? focusBand(tops, followed ?? lineFocus.start, lineFocus.size, lineHeight) : null;

  const measure = (index: number) => (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    const key = String(index);
    geometry.current.set(key, { ...geometry.current.get(key), x, y, width, height });
    setBoxes((current) => {
      const previous = current[index];
      if (previous && Math.abs(previous.y - y) < 0.5 && Math.abs(previous.height - height) < 0.5) return current;
      return { ...current, [index]: { y, height } };
    });
  };
  // Karartma: okunan satırların dışı zemin rengiyle örtülür (dokunuşu engellemez)
  const shade = { position: 'absolute' as const, left: 0, right: 0, backgroundColor: theme.colors.bg, opacity: 0.78 };

  return (
    <View ref={contentRef} onLayout={(event) => onContentHeight(event.nativeEvent.layout.height)}>
      {paragraphs.map((paragraph, index) => (
        <Text
          key={`${paragraph.paragraphIndex}-${index}`}
          id={`${idPrefix}${index}`}
          {...hyphenation}
          {...textLayout(geometry, String(index))}
          onLayout={measure(index)}
          style={{
            ...textStyle,
            // Boşluk paragrafın üstünde: son paragrafın altına boşluk
            // eklenip sayfa gereksiz yere "taşmış" görünmesin
            marginTop: index === 0 ? 0 : paragraphGap,
          }}
        >
          {paragraph.sentences.map((sentence) => (
            <Text
              key={sentence.sentenceIndex}
              style={
                sentence.sentenceIndex === flashSentence
                  ? { backgroundColor: theme.colors.highlight }
                  : markedSentences.has(sentence.sentenceIndex)
                    ? { backgroundColor: theme.colors.accentSoft }
                    : undefined
              }
            >
              {sentence.parts.map((part) => (
                <PagePart
                  key={part.chunkIndex}
                  text={part.display}
                  active={part.chunkIndex === activeChunk}
                  color={theme.colors.highlight}
                  syllableColor={syllableColor}
                  marks={part.marks}
                  markStyle={markStyle}
                />
              ))}
            </Text>
          ))}
        </Text>
      ))}
      {lineFocus?.dimAll ? (
        <View
          pointerEvents="none"
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={{ ...shade, top: -4000, height: 12000 }}
        />
      ) : null}
      {band ? (
        <>
          <View
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            style={{ ...shade, top: band.top - 4000, height: 4000 }}
          />
          <View
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            style={{ ...shade, top: band.bottom, height: 4000 }}
          />
        </>
      ) : null}
    </View>
  );
}

/**
 * Cümlenin bir chunk'lık parçası. `memo`: rehber ilerledikçe yalnızca eski ve
 * yeni geçerli parça yeniden çizilir, sayfanın kalanı değil.
 */
const PagePart = React.memo(function PagePart({
  text,
  active,
  color,
  syllableColor,
  marks,
  markStyle,
}: {
  text: string;
  active: boolean;
  color: string;
  syllableColor: string | null;
  marks?: MarkRanges;
  markStyle: TextStyle;
}) {
  if (!active) {
    return (
      <Text>
        <MarkedText text={text} marks={marks} markStyle={markStyle} syllableColor={syllableColor} />
      </Text>
    );
  }
  // Baştaki boşluk vurgunun dışında: yalnızca kelimeler boyansın
  const lead = /^[\s\u2009]*/.exec(text)?.[0] ?? '';
  return (
    <Text>
      {lead}
      <Text style={{ backgroundColor: color }}>
        <MarkedText
          text={text.slice(lead.length)}
          marks={marks?.map(([start, end]) => [start - lead.length, end - lead.length] as const)}
          markStyle={markStyle}
          syllableColor={syllableColor}
        />
      </Text>
    </Text>
  );
});
