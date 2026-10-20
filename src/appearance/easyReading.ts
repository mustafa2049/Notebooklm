import type { ReadingFontId } from '@/ui/theme';
import type { ReadingThemeId, TextColorId } from './palettes';
import { LETTER_SPACINGS, LINE_SPACINGS, WORD_SPACINGS } from './typography';

/**
 * "Kolay okuma" — tek anahtarla okunaklılık önayarı. Saf, testli.
 *
 * Ayrı ayrı bulunması zor ayarları birlikte açar; açmadan önceki değerleri
 * saklar ve kapatınca onları geri yazar. Seçimlerin dayanağı:
 * - Büyük yazı ve geniş satır aralığı: göz satırı daha kolay takip eder.
 * - Disleksi dostu yazı tipi (Atkinson Hyperlegible): benzer harfler
 *   (I/l/1, b/d) birbirinden ayrışır.
 * - Geniş harf ve kelime aralığı: harflerin birbirini "kalabalıklaştırması"
 *   azalır (Zorzi ve ark., 2012 — disleksili çocuklarda okumayı hızlandırdı).
 * - Sola yaslı, heceleme kapalı: iki yana yaslamanın düzensiz boşlukları ve
 *   satır sonunda bölünen kelimeler okumayı keser.
 * - Göz yormayan zemin: beyaz zeminin parlaması yerine sepya; tam siyah
 *   zeminde harf hâlesi yerine koyu gri.
 */

export interface EasyFields {
  fontScale: number;
  lineSpacing: number;
  readingFont: ReadingFontId;
  justify: boolean;
  hyphenate: boolean;
  letterSpacing: number;
  wordSpacing: number;
  readingTheme: ReadingThemeId;
  textColor: TextColorId;
}

/** Kolay okumada yazı en az bu kadar büyük (daha büyükse dokunulmaz) */
export const EASY_FONT_SCALE = 1.2;

const WIDE_LINES = LINE_SPACINGS[LINE_SPACINGS.length - 1].value;
/** "Geniş" düzeyi (Çok geniş değil: o, kelimeleri birbirinden koparıyor) */
const WIDE_LETTERS = LETTER_SPACINGS.findIndex((option) => option.label === 'Geniş');
const WIDE_WORDS = WORD_SPACINGS.findIndex((option) => option.label === 'Geniş');

/** Göz yoran zeminin yumuşak karşılığı; zaten yumuşaksa aynısı */
export function easyTheme(theme: ReadingThemeId, appDark: boolean): ReadingThemeId {
  if (theme === 'white' || theme === 'light' || (theme === 'auto' && !appDark)) return 'sepia';
  if (theme === 'black') return 'dark';
  return theme;
}

function pick(settings: EasyFields): EasyFields {
  return {
    fontScale: settings.fontScale,
    lineSpacing: settings.lineSpacing,
    readingFont: settings.readingFont,
    justify: settings.justify,
    hyphenate: settings.hyphenate,
    letterSpacing: settings.letterSpacing,
    wordSpacing: settings.wordSpacing,
    readingTheme: settings.readingTheme,
    textColor: settings.textColor,
  };
}

/**
 * Kolay okumayı açar: yazılacak değerler (`patch`) ve kapatınca geri
 * yazılacak eski değerler (`backup`).
 */
export function enableEasyReading(settings: EasyFields, appDark: boolean): { patch: EasyFields; backup: EasyFields } {
  const readingTheme = easyTheme(settings.readingTheme, appDark);
  return {
    backup: pick(settings),
    patch: {
      fontScale: Math.max(settings.fontScale, EASY_FONT_SCALE),
      lineSpacing: Math.max(settings.lineSpacing, WIDE_LINES),
      readingFont: 'hyperlegible',
      justify: false,
      hyphenate: false,
      letterSpacing: Math.max(settings.letterSpacing, WIDE_LETTERS),
      wordSpacing: Math.max(settings.wordSpacing, WIDE_WORDS),
      readingTheme,
      // Zemin değiştiyse seçili yazı rengi yeni zeminde okunmayabilir
      textColor: readingTheme === settings.readingTheme ? settings.textColor : 'auto',
    },
  };
}

/** Kapatınca: açmadan önceki değerler (yedek yoksa hiçbir şey değişmez) */
export function disableEasyReading(backup: EasyFields | null | undefined): Partial<EasyFields> {
  return backup ? pick(backup) : {};
}

/** Kolay okumanın neyi değiştirdiği, kullanıcıya tek satırda */
export function easyReadingSummary(settings: EasyFields): string {
  const parts = [
    `yazı %${Math.round(settings.fontScale * 100)}`,
    'geniş satır, harf ve kelime aralığı',
    'disleksi dostu yazı tipi',
    'sola yaslı, kelimeler bölünmüyor',
  ];
  if (settings.readingTheme === 'sepia') parts.push('sepya zemin');
  return parts.join(' · ');
}
