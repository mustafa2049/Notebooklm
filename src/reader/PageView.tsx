import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { pageParagraphs, SAMPLE_PARAGRAPH, type Page } from '@/core/pages';
import type { Chunk } from '@/core/types';
import { useSettings } from '@/store/SettingsContext';
import { readingFontStyle } from '@/ui/theme';

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
  markedSentences,
  onAreaLayout,
  onContentHeight,
  onSampleHeight,
  layoutKey,
  onTurn,
  onLongPress,
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
  /** Alıntılanmış cümleler (cümle sırası) */
  markedSentences: Set<number>;
  onAreaLayout: (event: LayoutChangeEvent) => void;
  onContentHeight: (height: number) => void;
  /** Gizli örnek paragrafın yüksekliği (satır başına karakter ölçümü) */
  onSampleHeight: (height: number) => void;
  /** Sayfalama anahtarı: değişince içerik yeniden kurulup yeniden ölçülür */
  layoutKey: string;
  onTurn: (delta: 1 | -1) => void;
  onLongPress: () => void;
}) {
  const { theme } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  const paragraphs = useMemo(() => (page ? pageParagraphs(chunks, page) : []), [chunks, page]);

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
  const swiped = useRef(false);

  const onPressIn = (event: GestureResponderEvent) => {
    pressStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    swiped.current = false;
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
    onTurn(event.nativeEvent.pageX < windowWidth * PREVIOUS_ZONE ? -1 : 1);
  };

  const textStyle = { fontSize, lineHeight, color: theme.colors.text, ...readingFontStyle(theme) };

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onAreaLayout}>
      {/* Ölçüm: aynı yazı tipi ve genişlikte örnek paragraf, görünmez */}
      <View
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }}
      >
        <Text style={textStyle} onLayout={(event) => onSampleHeight(event.nativeEvent.layout.height)}>
          {SAMPLE_PARAGRAPH}
        </Text>
      </View>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        accessibilityHint="Sağa dokun ya da sola kaydır: sonraki sayfa. Sol kenara dokun: önceki sayfa. Uzun bas: alıntı ve kelime."
        style={[{ flex: 1 }, WEB_GESTURES]}
      >
        {/* Animasyonlu katman yerinde kalır; ölçülen içerik onun içinde ve
            sayfalama değişince yeniden kurulur (animasyonu bölmeden) */}
        <Animated.View style={{ opacity, transform: [{ translateX: shift }] }}>
          <View
            key={`${page?.start ?? -1}-${page?.end ?? -1}-${layoutKey}`}
            onLayout={(event) => onContentHeight(event.nativeEvent.layout.height)}
          >
          {paragraphs.map((paragraph, index) => (
            <Text
              key={`${paragraph.paragraphIndex}-${index}`}
              style={{
                ...textStyle,
                // Boşluk paragrafın üstünde: son paragrafın altına boşluk
                // eklenip sayfa gereksiz yere "taşmış" görünmesin
                marginTop: index === 0 ? 0 : paragraphGap,
              }}
            >
              {paragraph.sentences.map((sentence, sentenceIndex) => (
                <Text
                  key={sentence.sentenceIndex}
                  style={
                    markedSentences.has(sentence.sentenceIndex)
                      ? { backgroundColor: theme.colors.accentSoft }
                      : undefined
                  }
                >
                  {sentenceIndex === 0 ? sentence.text : ` ${sentence.text}`}
                </Text>
              ))}
            </Text>
          ))}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
