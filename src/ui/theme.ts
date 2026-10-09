import { Platform, type TextStyle } from 'react-native';
import {
  APP_DARK,
  APP_LIGHT,
  readingColors,
  type ColorSet,
  type ReadingInput,
} from '@/appearance/palettes';

export interface FontSet {
  regular: string | undefined;
  bold: string | undefined;
  /**
   * Özel font kullanılıyor mu. Android'de özel bir font ailesinde `fontWeight`
   * çalışmaz — kalın için ayrı dosya seçmek gerekir. Bu bayrak `fontStyle`
   * yardımcısının hangi yolu izleyeceğini belirler.
   */
  custom: boolean;
  /** Sayfa kapasitesi tahmini için: harflerin ortalama genişliği (em) */
  charEm: number;
}

export interface Theme {
  dark: boolean;
  colors: ColorSet;
  radius: { sm: number; md: number; lg: number; pill: number };
  space: (n: number) => number;
  font: FontSet & { mono: string };
  /** Okunan metnin yazı tipi (arayüzden ayrı seçilebiliyor) */
  readingFont: FontSet;
}

const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'Roboto', default: undefined });

/** Disleksi dostu font — Türkçe kapsaması tam olan "Next" sürümü. */
export const HYPERLEGIBLE_REGULAR = 'AtkinsonHyperlegibleNext_400Regular';
export const HYPERLEGIBLE_BOLD = 'AtkinsonHyperlegibleNext_700Bold';

/**
 * Tırnaklı (kitap) yazı tipi: platformun hazır fontu — ek dosya indirilmiyor.
 * Web'de yedekli liste: Georgia yoksa Times, o da yoksa tarayıcının serif'i.
 */
const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

export type ReadingFontId = 'auto' | 'sans' | 'serif' | 'hyperlegible';

const FONTS: Record<Exclude<ReadingFontId, 'auto'>, FontSet> = {
  sans: { regular: SYSTEM_FONT, bold: SYSTEM_FONT, custom: false, charEm: 0.5 },
  serif: { regular: SERIF_FONT, bold: SERIF_FONT, custom: false, charEm: 0.5 },
  hyperlegible: { regular: HYPERLEGIBLE_REGULAR, bold: HYPERLEGIBLE_BOLD, custom: true, charEm: 0.56 },
};

/** `auto`: uygulamanın yazı tipi (disleksi dostu anahtarı açıksa o). */
export function resolveReadingFont(id: ReadingFontId, hyperlegible: boolean): FontSet {
  if (id === 'auto') return hyperlegible ? FONTS.hyperlegible : FONTS.sans;
  return FONTS[id];
}

export function createTheme(options: {
  dark: boolean;
  focusMode?: boolean;
  hyperlegible?: boolean;
}): Theme {
  const colors = { ...(options.dark ? APP_DARK : APP_LIGHT) };
  if (options.dark && options.focusMode) {
    colors.bg = '#000000';
    colors.surface = '#0A0C0F';
  }

  const font = options.hyperlegible ? FONTS.hyperlegible : FONTS.sans;

  return {
    dark: options.dark,
    colors,
    radius: { sm: 8, md: 14, lg: 22, pill: 999 },
    space: (n: number) => n * 4,
    font: {
      ...font,
      mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    readingFont: font,
  };
}

export interface ReadingTheme extends Theme {
  /** Seçilen yazı rengi zeminde okunmadığı için temanın rengi kullanılıyor */
  textFallback: boolean;
}

/**
 * Okuma ekranlarının teması: uygulama temasının üstüne okuma renkleri ve
 * okuma yazı tipi. Okuyucu, antrenman ve ölçüm bununla çiziliyor.
 */
export function createReadingTheme(
  base: Theme,
  input: Omit<ReadingInput, 'appDark'> & { readingFont: ReadingFontId; hyperlegible: boolean }
): ReadingTheme {
  const result = readingColors({ ...input, appDark: base.dark });
  return {
    ...base,
    dark: result.dark,
    colors: result.colors,
    readingFont: resolveReadingFont(input.readingFont, input.hyperlegible),
    textFallback: result.textFallback,
  };
}

/**
 * Yazı tipi + kalınlık stilini birlikte üretir.
 *
 * Gerekçe: Android'de özel bir font ailesi kullanıldığında `fontWeight`
 * yok sayılır; kalın metin için ayrı font dosyasını aile adıyla seçmek gerekir.
 * Sistem fontunda ise tersine, `fontWeight` doğru yoldur.
 */
export function fontStyle(theme: Theme, weight: TextStyle['fontWeight'] = 'normal'): TextStyle {
  return styleFor(theme.font, weight);
}

/** Okunan metin için aynı kural, okuma yazı tipiyle. */
export function readingFontStyle(theme: Theme, weight: TextStyle['fontWeight'] = 'normal'): TextStyle {
  return styleFor(theme.readingFont, weight);
}

function styleFor(font: FontSet, weight: TextStyle['fontWeight']): TextStyle {
  const bold = weight === 'bold' || (typeof weight === 'string' && Number(weight) >= 600);
  if (font.custom) {
    return { fontFamily: bold ? font.bold : font.regular };
  }
  return { fontFamily: font.regular, fontWeight: weight };
}

/** Bir yazı tipi kimliğinin seçenek etiketinde kullanılacak stili (önizleme). */
export function fontPreviewStyle(id: Exclude<ReadingFontId, 'auto'>): TextStyle {
  return styleFor(FONTS[id], 'normal');
}
