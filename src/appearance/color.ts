/**
 * Renk hesapları — saf, testli.
 *
 * Kullanıcı okuma rengini serbestçe seçebiliyor; seçimin okunabilir kalıp
 * kalmadığını tahminle değil WCAG kontrast oranıyla ölçüyoruz. Oran 1:1 (aynı
 * renk) ile 21:1 (siyah–beyaz) arasında değişir; gövde metni için önerilen
 * alt sınır 4,5:1.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Rahat okunur gövde metni için WCAG AA sınırı */
export const COMFORT_CONTRAST = 4.5;
/** Bunun altında metin okunmaz sayılır ve uygulanmaz (WCAG'nin büyük yazı sınırı) */
export const MIN_CONTRAST = 3;

/** "#RGB", "#RRGGBB", başında # olmadan ve büyük/küçük harf fark etmeksizin. */
export function parseHex(value: string): Rgb | null {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Geçerliyse "#RRGGBB" biçimine getirir, değilse `null`. */
export function normalizeHex(value: string): string | null {
  const rgb = parseHex(value);
  return rgb ? toHex(rgb) : null;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG göreli parlaklık (0 = siyah, 1 = beyaz). Geçersiz renk siyah sayılır. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** İki renk arasındaki kontrast oranı (1–21), sıra fark etmez. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** `amount` 0 → `from`, 1 → `to`; aradaki değerler doğrusal karışım. */
export function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from) ?? { r: 0, g: 0, b: 0 };
  const b = parseHex(to) ?? { r: 0, g: 0, b: 0 };
  const t = Math.max(0, Math.min(1, amount));
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** Koyu zemin mi? Beyazla kontrastı siyahla kontrastından büyükse koyudur. */
export function isDarkColor(hex: string): boolean {
  return contrastRatio(hex, '#FFFFFF') > contrastRatio(hex, '#000000');
}

export type Readability = 'rahat' | 'zor' | 'okunmaz';

export function readability(ratio: number): Readability {
  if (ratio >= COMFORT_CONTRAST) return 'rahat';
  if (ratio >= MIN_CONTRAST) return 'zor';
  return 'okunmaz';
}
