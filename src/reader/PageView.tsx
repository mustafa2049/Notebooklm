import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
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
  page: Page | undefined;
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
  /** Sayfadaki satır sayısı (bant hareketi için) */
  onFocusLines?: (count: number) => void;
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
  // Heceleme ve kelime aralığı görünmez işaretlerle yapılıyor (bkz. core/typeset)
  const paragraphs = useMemo(() => {
    if (!page) return [];
    const options = { hyphenate: layout.hyphenate, extraWordSpace: layout.extraWordSpace };
    const marked = (core: string) => (vocab ? isVocabWord(vocab, core) : false);
    // Cümleler chunk parçalarıyla çiziliyor: tempo rehberi geçerli parçayı
    // vurgulayabilsin. Satır kırılımı aynı (parçalar satır içi)
    return pageParagraphs(chunks, page).map((paragraph) => ({
      ...paragraph,
      sentences: paragraph.sentences.map((sentence, sentenceIndex) => ({
        ...sentence,
        parts: sentence.parts.map((part, partIndex) => {
          const display = typeset(sentenceIndex === 0 && partIndex === 0 ? part.text : ` ${part.text}`, options);
          return { ...part, display, marks: vocab ? coreRanges(display, part.tokens, marked) : undefined };
        }),
      })),
    }));
  }, [chunks, page, layout.hyphenate, layout.extraWordSpace, vocab]);
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

  // ---- Uzun basılan kelime
  const contentRef = useRef<View>(null);
  const geometry = useRef<Map<string, ParagraphGeometry>>(new Map());
  const findToken = async (point: { x: number; y: number }): Promise<Token | null> => {
    let hit: { key: string; index: number } | null = null;
    if (Platform.OS === 'web') {
      hit = domHit(point.x - window.scrollX, point.y - window.scrollY, PARAGRAPH_ID);
    } else {
      const origin = await measureOrigin(contentRef.current);
      if (origin) {
        hit = hitFromGeometry(geometry.current, point.x - origin.x, point.y - origin.y, {
          fontSize,
          letterSpacing: fontSize * layout.letterSpacingEm,
          justify: layout.textAlign === 'justify',
        });
      }
    }
    const paragraph = hit ? paragraphs[Number(hit.key)] : undefined;
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

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onAreaLayout}>
      {/* Ölçüm: aynı yazı tipi ve genişlikte örnek paragraf, görünmez */}
      <View
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }}
      >
        <Text
          style={textStyle}
          {...hyphenation}
          onLayout={(event) => onSampleHeight(event.nativeEvent.layout.height)}
        >
          {sample}
        </Text>
      </View>
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
        <Animated.View style={{ opacity, transform: [{ translateX: shift }] }}>
          <PageContent
            key={`${page?.start ?? -1}-${page?.end ?? -1}-${layoutKey}`}
            paragraphs={paragraphs}
            textStyle={textStyle}
            hyphenation={hyphenation}
            lineHeight={lineHeight}
            paragraphGap={paragraphGap}
            markedSentences={markedSentences}
            flashSentence={flashSentence}
            activeChunk={activeChunk}
            syllableColor={syllableColor}
            markStyle={markStyle}
            lineFocus={lineFocus}
            onFocusLines={onFocusLines}
            onFollowLine={onFollowLine}
            onContentHeight={onContentHeight}
            contentRef={contentRef}
            geometry={geometry}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Paragraf köklerinin kimlik öneki (web'de kelime bulmak için) */
const PARAGRAPH_ID = 'rp';

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
  textStyle: TextStyle;
  hyphenation: object;
  lineHeight: number;
  paragraphGap: number;
  markedSentences: Set<number>;
  flashSentence: number | null;
  activeChunk: number | null;
  syllableColor: string | null;
  markStyle: TextStyle;
  lineFocus: { size: number; start: number; follow: boolean } | null;
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
    const middle = charMiddle(geometry, PARAGRAPH_ID, String(position.paragraph), position.offset);
    if (middle !== null) setActiveLine(lineAtY(tops, box.y + middle, lineHeight));
  }, [follow, activeChunk, paragraphs, boxes, tops, lineHeight, geometry]);
  const followed = follow && lineFocus && activeLine !== null ? followStart(activeLine, lineFocus.size, tops.length) : null;
  useEffect(() => {
    if (followed !== null) onFollowLine?.(followed);
  }, [followed, onFollowLine]);
  const band = lineFocus ? focusBand(tops, followed ?? lineFocus.start, lineFocus.size, lineHeight) : null;

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
          id={`${PARAGRAPH_ID}${index}`}
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
