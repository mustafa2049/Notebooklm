import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { buildFlowPages, charsPerLineFromSample, type Page } from '@/core/pages';
import type { Chunk } from '@/core/types';

/**
 * Tahmin bilerek iyimser başlıyor: sayfa taşarsa kapasite adım adım küçülüyor
 * ve sığan en büyük değere oturuyor. Kötümser başlamak sayfaları yarı boş
 * bırakıyordu (küçültme var, büyütme yok — salınım olmasın diye).
 */
const START_FACTOR = 1;
const SHRINK = 0.95;
const MIN_FACTOR = 0.3;

export interface Pagination {
  pages: Page[];
  /** Alan ölçüldü mü (ölçülmeden sayfalar anlamlı değil) */
  ready: boolean;
  onAreaLayout: (event: LayoutChangeEvent) => void;
  /** Çizilen sayfanın gerçek yüksekliği; alanı aşarsa kapasite küçülür */
  onContentHeight: (height: number) => void;
  /** Gizli örnek paragrafın yüksekliği: satır başına karakteri ölçer */
  onSampleHeight: (height: number) => void;
  /**
   * Sayfalama her değiştiğinde değişen anahtar. Sayfa görünümü içeriği bununla
   * yeniden kurar ki yükseklik her seferinde yeniden ölçülsün — aynı sayfa aynı
   * yükseklikte kalınca ölçüm gelmiyor, pay sıfırlanınca taşma gözden kaçıyordu.
   */
  layoutKey: string;
}

/**
 * Sayfa modunun sayfaları.
 *
 * Sayfalar tahmini yüksekliğe göre kuruluyor (`buildFlowPages`), sonra
 * **ölçülüyor**: çizilen sayfa alana sığmadıysa pay %5 küçülüp sayfalar
 * yeniden kuruluyor. Uzun kelimeler, büyük yazı ya da geniş satır aralığı yüzünden
 * metnin kesilmesi böylece önleniyor. Yazı boyutu, tipi, satır aralığı ya da
 * alan değişince pay baştan başlıyor.
 */
export function usePagination(
  chunks: Chunk[],
  metrics: { fontSize: number; lineHeight: number; charEm: number; paragraphGap: number },
  enabled: boolean
): Pagination {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [factor, setFactor] = useState(START_FACTOR);
  const [sampleHeight, setSampleHeight] = useState(0);
  const { fontSize, lineHeight, charEm, paragraphGap } = metrics;
  const charsPerLine = charsPerLineFromSample(sampleHeight, lineHeight);

  // Ölçüler değişince pay baştan (yükseklik hariç: aşağıda)
  useEffect(() => {
    setFactor(START_FACTOR);
  }, [area.width, fontSize, lineHeight, charEm, paragraphGap, charsPerLine]);

  /** Son çizilen sayfanın yüksekliği: alan sonradan ölçülürse/küçülürse yeniden bakılır */
  const contentHeight = useRef(0);
  useEffect(() => {
    if (area.height > 0 && contentHeight.current > area.height + 0.5) {
      setFactor((current) => Math.max(MIN_FACTOR, current * SHRINK));
    }
  }, [area.height]);

  const ready = enabled && area.width > 0 && area.height > 0;

  const pages = useMemo(
    () =>
      ready
        ? buildFlowPages(chunks, { ...area, fontSize, lineHeight, charEm, paragraphGap, charsPerLine }, factor)
        : [],
    [ready, chunks, area, fontSize, lineHeight, charEm, paragraphGap, charsPerLine, factor]
  );

  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((current) =>
      Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1 ? current : { width, height }
    );
  }, []);

  const areaRef = useRef(area);
  areaRef.current = area;
  const onContentHeight = useCallback((height: number) => {
    contentHeight.current = height;
    const limit = areaRef.current.height;
    if (limit > 0 && height > limit + 0.5) {
      setFactor((current) => Math.max(MIN_FACTOR, current * SHRINK));
    }
  }, []);

  const onSampleHeight = useCallback((height: number) => {
    setSampleHeight((current) => (Math.abs(current - height) < 0.5 ? current : height));
  }, []);

  const layoutKey = [area.width, area.height, fontSize, lineHeight, charsPerLine ?? 0, factor].join(':');

  return { pages, ready, onAreaLayout, onContentHeight, onSampleHeight, layoutKey };
}
