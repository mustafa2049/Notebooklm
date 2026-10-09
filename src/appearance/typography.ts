/**
 * Yazı boyutu ve satır aralığı seçenekleri — saf, testli.
 */

export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 2;
const FONT_SCALE_STEP = 0.1;

export const LINE_SPACINGS = [
  { label: 'Sıkı', value: 1.45 },
  { label: 'Normal', value: 1.7 },
  { label: 'Geniş', value: 2 },
];

/** Bir adım büyüt/küçült; kayan nokta birikmesin diye 0,1'e yuvarlanır. */
export function stepFontScale(current: number, direction: 1 | -1): number {
  const next = Math.round((current + direction * FONT_SCALE_STEP) * 10) / 10;
  return Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, next));
}

// ---- Sayfa düzeni

export type PageMarginId = 'narrow' | 'normal' | 'wide';

export const PAGE_MARGINS: { id: PageMarginId; label: string; px: number }[] = [
  { id: 'narrow', label: 'Dar', px: 12 },
  { id: 'normal', label: 'Normal', px: 24 },
  { id: 'wide', label: 'Geniş', px: 40 },
];

/**
 * Harf aralığı (yazı boyutunun katı). Disleksi araştırmalarında geniş harf
 * aralığı okumayı hızlandırıyor; WCAG'nin sınama değeri 0,12 em.
 */
export const LETTER_SPACINGS = [
  { label: 'Normal', em: 0 },
  { label: 'Geniş', em: 0.04 },
  { label: 'Çok geniş', em: 0.1 },
];

/** Kelime aralığı: her boşluğa eklenen ince boşluk sayısı (bkz. core/typeset) */
export const WORD_SPACINGS = [
  { label: 'Normal', thinSpaces: 0 },
  { label: 'Geniş', thinSpaces: 1 },
  { label: 'Çok geniş', thinSpaces: 2 },
];

export interface LayoutSettings {
  pageMargin: PageMarginId;
  justify: boolean;
  letterSpacing: number;
  wordSpacing: number;
  hyphenate: boolean;
}

export interface ReadingLayout {
  /** Metnin iki yanındaki boşluk (px) */
  marginPx: number;
  /** Harf aralığı, yazı boyutunun katı */
  letterSpacingEm: number;
  textAlign: 'left' | 'justify';
  hyphenate: boolean;
  extraWordSpace: number;
  /** Satır kırılmasını etkileyen her şey: değişince sayfalar yeniden kurulur */
  key: string;
}

const level = (value: number, count: number) =>
  Math.max(0, Math.min(count - 1, Math.round(Number.isFinite(value) ? value : 0)));

/** Ayarlardan okuma düzeni; kayıttaki bozuk/eski değerler sınırlara çekilir. */
export function readingLayout(settings: LayoutSettings): ReadingLayout {
  const margin = PAGE_MARGINS.find((option) => option.id === settings.pageMargin) ?? PAGE_MARGINS[1];
  const letter = LETTER_SPACINGS[level(settings.letterSpacing, LETTER_SPACINGS.length)];
  const word = WORD_SPACINGS[level(settings.wordSpacing, WORD_SPACINGS.length)];
  const layout = {
    marginPx: margin.px,
    letterSpacingEm: letter.em,
    textAlign: settings.justify ? ('justify' as const) : ('left' as const),
    hyphenate: settings.hyphenate,
    extraWordSpace: word.thinSpaces,
  };
  return {
    ...layout,
    key: [layout.marginPx, layout.letterSpacingEm, layout.textAlign, layout.hyphenate, layout.extraWordSpace].join('|'),
  };
}
