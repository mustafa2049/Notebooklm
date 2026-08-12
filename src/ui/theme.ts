import { Platform, type TextStyle } from 'react-native';

export interface Theme {
  dark: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textDim: string;
    textFaint: string;
    accent: string;
    accentSoft: string;
    /** RSVP pivot harfinin rengi */
    pivot: string;
    /** Vurgu modunda okunan grubun zemini */
    highlight: string;
    success: string;
    warning: string;
    danger: string;
  };
  radius: { sm: number; md: number; lg: number; pill: number };
  space: (n: number) => number;
  font: {
    regular: string | undefined;
    bold: string | undefined;
    mono: string;
    /**
     * Özel font kullanılıyor mu. Android'de özel bir font ailesinde `fontWeight`
     * çalışmaz — kalın için ayrı dosya seçmek gerekir. Bu bayrak `fontStyle`
     * yardımcısının hangi yolu izleyeceğini belirler.
     */
    custom: boolean;
  };
}

/**
 * Okuma uygulamasında renk seçimi işlevseldir, süs değil:
 * - Koyu arka plan tam siyah değil (#0B0D10): OLED ekranda tam siyah zeminde
 *   beyaz metin, harf kenarlarında hâle (halation) yapıp okumayı yoruyor.
 *   Tam siyahı yalnızca kullanıcı odak modunu açtığında kullanıyoruz.
 * - Accent sıcak turuncu: uzun okumada mavi ışıktan daha az yorucu.
 * - Pivot rengi accent'ten ayrı ve daha doygun: gözün sabitlendiği tek nokta o.
 */
const DARK: Theme['colors'] = {
  bg: '#0B0D10',
  surface: '#14181D',
  surfaceAlt: '#1B2027',
  border: '#272E38',
  text: '#E9EDF2',
  textDim: '#98A3B0',
  textFaint: '#5D6875',
  accent: '#F97C4A',
  accentSoft: '#3A2318',
  pivot: '#FF5C39',
  highlight: '#2A3340',
  success: '#3DD68C',
  warning: '#FFB020',
  danger: '#F4574C',
};

const LIGHT: Theme['colors'] = {
  // Kâğıt tonu: saf beyaz yerine hafif sıcak, uzun okumada daha rahat
  bg: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EEE8',
  border: '#DFDAD1',
  text: '#16191D',
  textDim: '#5D6875',
  textFaint: '#96A0AC',
  accent: '#D9541F',
  accentSoft: '#FBE7DC',
  pivot: '#D02F0C',
  highlight: '#FBE7DC',
  success: '#1F9D5B',
  warning: '#B7791F',
  danger: '#C6362C',
};

const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'Roboto', default: undefined });

/** Disleksi dostu font — Türkçe kapsaması tam olan "Next" sürümü. */
export const HYPERLEGIBLE_REGULAR = 'AtkinsonHyperlegibleNext_400Regular';
export const HYPERLEGIBLE_BOLD = 'AtkinsonHyperlegibleNext_700Bold';

export function createTheme(options: {
  dark: boolean;
  focusMode?: boolean;
  hyperlegible?: boolean;
}): Theme {
  const colors = { ...(options.dark ? DARK : LIGHT) };
  if (options.dark && options.focusMode) {
    colors.bg = '#000000';
    colors.surface = '#0A0C0F';
  }

  const custom = Boolean(options.hyperlegible);

  return {
    dark: options.dark,
    colors,
    radius: { sm: 8, md: 14, lg: 22, pill: 999 },
    space: (n: number) => n * 4,
    font: {
      regular: custom ? HYPERLEGIBLE_REGULAR : SYSTEM_FONT,
      bold: custom ? HYPERLEGIBLE_BOLD : SYSTEM_FONT,
      mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      custom,
    },
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
  const bold = weight === 'bold' || (typeof weight === 'string' && Number(weight) >= 600);
  if (theme.font.custom) {
    return { fontFamily: bold ? theme.font.bold : theme.font.regular };
  }
  return { fontFamily: theme.font.regular, fontWeight: weight };
}
