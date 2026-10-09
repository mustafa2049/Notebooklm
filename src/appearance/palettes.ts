import { COMFORT_CONTRAST, contrastRatio, isDarkColor, MIN_CONTRAST, mix, normalizeHex } from './color';

/**
 * Uygulama ve okuma renk takımları — saf, testli (React Native içe aktarmaz).
 *
 * Okuma görünümü uygulama temasından ayrı: arayüz koyu kalırken metin sepya
 * zeminde okunabilir. Hazır temaların hepsi elle seçildi ve testler yazı/zemin
 * kontrastının en az 7:1 olduğunu doğruluyor; kullanıcının serbest seçtiği
 * renkler ise kontrast oranıyla denetleniyor.
 */

export interface ColorSet {
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
}

/**
 * Okuma uygulamasında renk seçimi işlevseldir, süs değil:
 * - Koyu arka plan tam siyah değil (#0B0D10): OLED ekranda tam siyah zeminde
 *   beyaz metin, harf kenarlarında hâle (halation) yapıp okumayı yoruyor.
 *   Tam siyahı yalnızca kullanıcı odak modunu ya da "Siyah" temayı seçince
 *   kullanıyoruz.
 * - Accent sıcak turuncu: uzun okumada mavi ışıktan daha az yorucu.
 * - Pivot rengi accent'ten ayrı ve daha doygun: gözün sabitlendiği tek nokta o.
 */
export const APP_DARK: ColorSet = {
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

export const APP_LIGHT: ColorSet = {
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

// ------------------------------------------------------------ okuma temaları

export type ReadingThemeId =
  | 'auto'
  | 'dark'
  | 'black'
  | 'night'
  | 'light'
  | 'white'
  | 'sepia'
  | 'green'
  | 'custom';

/** Arayüzdeki sıra ve adlar */
export const READING_THEMES: { id: ReadingThemeId; label: string }[] = [
  { id: 'auto', label: 'Uygulama' },
  { id: 'dark', label: 'Koyu' },
  { id: 'black', label: 'Siyah' },
  { id: 'night', label: 'Gece' },
  { id: 'light', label: 'Açık' },
  { id: 'white', label: 'Beyaz' },
  { id: 'sepia', label: 'Sepya' },
  { id: 'green', label: 'Yeşil' },
  { id: 'custom', label: 'Özel' },
];

/** Türetilen temaların tohumları: zemin, yazı ve vurgu; gerisi karıştırmayla. */
const SEEDS: Record<'black' | 'night' | 'white' | 'sepia' | 'green', { bg: string; text: string; accent: string }> = {
  // Tam siyah (OLED): yazı saf beyaz değil, hâle etkisini azaltmak için hafif kısık
  black: { bg: '#000000', text: '#D9DEE4', accent: '#F97C4A' },
  // Gece: sıcak koyu zemin, krem yazı — akşam okumasında mavi ışık az
  night: { bg: '#17140F', text: '#E8DCC4', accent: '#E3894B' },
  white: { bg: '#FFFFFF', text: '#15171A', accent: '#C2461A' },
  sepia: { bg: '#F4ECD8', text: '#3B2F22', accent: '#A5471B' },
  green: { bg: '#E3EEDF', text: '#1E2B20', accent: '#2C7048' },
};

/** Özel tema için varsayılan renkler */
export const DEFAULT_CUSTOM_BG = '#1C1F25';
export const DEFAULT_CUSTOM_TEXT = '#EFE3C8';

/** Zeminde en iyi okunan nötr yazı rengi (beyaza yakın ya da siyaha yakın). */
export function autoTextFor(bg: string): string {
  const light = '#F2F4F7';
  const dark = '#14171A';
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

/** Zeminde en az 3:1 okunan vurgu rengi: tercih edilen ya da yedek. */
function accentFor(bg: string, preferred: string): string {
  const candidates = [preferred, isDarkColor(bg) ? '#FFB38A' : '#8A2E0B'];
  return candidates.reduce((best, candidate) =>
    contrastRatio(bg, candidate) > contrastRatio(bg, best) ? candidate : best
  );
}

/** Zemin + yazı + (isteğe bağlı) vurgudan tam renk takımı türetir. */
export function deriveColors(bg: string, text: string, accent?: string): ColorSet {
  const dark = isDarkColor(bg);
  const accentColor = accentFor(bg, accent ?? (dark ? '#F97C4A' : '#C2461A'));
  return {
    bg,
    // Açık zeminde kartlar zeminden biraz daha açık, koyuda biraz daha açık ton
    surface: dark ? mix(bg, text, 0.06) : mix(bg, '#FFFFFF', 0.55),
    surfaceAlt: mix(bg, text, dark ? 0.1 : 0.06),
    border: mix(bg, text, dark ? 0.18 : 0.14),
    text,
    textDim: mix(text, bg, 0.3),
    textFaint: mix(text, bg, 0.55),
    accent: accentColor,
    accentSoft: mix(bg, accentColor, dark ? 0.2 : 0.16),
    pivot: dark ? '#FF5C39' : '#C02A0A',
    highlight: mix(bg, text, dark ? 0.16 : 0.1),
    success: dark ? '#3DD68C' : '#1F7A47',
    warning: dark ? '#FFB020' : '#9A6413',
    danger: dark ? '#F4574C' : '#B42F25',
  };
}

// ------------------------------------------------------------- yazı renkleri

export type TextColorId =
  | 'auto'
  | 'white'
  | 'cream'
  | 'gray'
  | 'amber'
  | 'black'
  | 'graphite'
  | 'brown'
  | 'navy'
  | 'custom';

export const TEXT_COLORS: { id: Exclude<TextColorId, 'auto' | 'custom'>; label: string; hex: string }[] = [
  { id: 'white', label: 'Beyaz', hex: '#FFFFFF' },
  { id: 'cream', label: 'Krem', hex: '#EFE3C8' },
  { id: 'gray', label: 'Gri', hex: '#B8BFC8' },
  { id: 'amber', label: 'Kehribar', hex: '#F2C46D' },
  { id: 'black', label: 'Siyah', hex: '#000000' },
  { id: 'graphite', label: 'Grafit', hex: '#3C4148' },
  { id: 'brown', label: 'Kahve', hex: '#4B3524' },
  { id: 'navy', label: 'Lacivert', hex: '#1F2F57' },
];

/**
 * Zeminde rahat okunan (≥ 4,5:1) hazır yazı renkleri. Okunmayacak renkler
 * listede hiç gösterilmez — seçip sonra şaşırmak yerine.
 */
export function textColorChoices(bg: string): typeof TEXT_COLORS {
  return TEXT_COLORS.filter((color) => contrastRatio(bg, color.hex) >= COMFORT_CONTRAST);
}

// ------------------------------------------------------------- birleştirme

export interface ReadingInput {
  readingTheme: ReadingThemeId;
  textColor: TextColorId;
  customBg: string;
  customText: string;
  /** Uygulama teması koyu mu (`auto` okuma teması bunu izler) */
  appDark: boolean;
  /** Okuyucunun odak modu: koyu zeminde tam siyah */
  focusMode: boolean;
}

export interface ReadingColors {
  colors: ColorSet;
  dark: boolean;
  /**
   * Seçilen yazı rengi bu zeminde okunmuyor; temanın kendi yazı rengi
   * kullanıldı. Arayüz bunu bir cümleyle söyler.
   */
  textFallback: boolean;
}

function themeColors(input: ReadingInput): ColorSet {
  switch (input.readingTheme) {
    case 'auto':
      return input.appDark ? withFocus(APP_DARK, input.focusMode) : APP_LIGHT;
    case 'dark':
      return withFocus(APP_DARK, input.focusMode);
    case 'light':
      return APP_LIGHT;
    case 'custom': {
      const bg = normalizeHex(input.customBg) ?? DEFAULT_CUSTOM_BG;
      return deriveColors(bg, autoTextFor(bg));
    }
    default: {
      const seed = SEEDS[input.readingTheme];
      return seed ? deriveColors(seed.bg, seed.text, seed.accent) : APP_DARK;
    }
  }
}

function withFocus(colors: ColorSet, focusMode: boolean): ColorSet {
  return focusMode ? { ...colors, bg: '#000000', surface: '#0A0C0F' } : colors;
}

/** Yazı rengini değiştirir; soluk tonlar yeni renkten türetilir. */
function withText(colors: ColorSet, text: string): ColorSet {
  return {
    ...colors,
    text,
    textDim: mix(text, colors.bg, 0.3),
    textFaint: mix(text, colors.bg, 0.55),
  };
}

/** Okuma ekranlarının renk takımı. */
export function readingColors(input: ReadingInput): ReadingColors {
  const base = themeColors(input);
  const dark = isDarkColor(base.bg);

  const wanted =
    input.textColor === 'auto'
      ? input.readingTheme === 'custom'
        ? normalizeHex(input.customText)
        : null
      : input.textColor === 'custom'
        ? normalizeHex(input.customText)
        : (TEXT_COLORS.find((color) => color.id === input.textColor)?.hex ?? null);

  if (!wanted) return { colors: base, dark, textFallback: false };

  // Hazır renklerde rahat okuma şartı; serbest seçimde en az okunur sınır
  const custom = input.textColor === 'custom' || input.readingTheme === 'custom';
  const required = custom ? MIN_CONTRAST : COMFORT_CONTRAST;
  if (contrastRatio(wanted, base.bg) < required) {
    return { colors: base, dark, textFallback: true };
  }
  return { colors: withText(base, wanted), dark, textFallback: false };
}

/** Renk seçicinin hızlı seçenekleri: koyular, açıklar, yazıya uygun tonlar. */
export const PICKER_SWATCHES = [
  '#000000', '#0B0D10', '#1C1F25', '#17140F', '#2A2118', '#102018', '#0F1A2E', '#2B1B2E',
  '#FFFFFF', '#FAF8F4', '#F4ECD8', '#E8DCC0', '#E3EEDF', '#E3ECF5', '#F3E6EA', '#EDE7F6',
  '#D9DEE4', '#B8BFC8', '#EFE3C8', '#F2C46D', '#9FD3A4', '#9CC3F0', '#3C4148', '#4B3524',
];
