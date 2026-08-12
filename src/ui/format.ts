/** Türkçe biçimlendirme yardımcıları (binlik ayırıcı nokta, süre kısaltmaları). */

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('tr-TR');
}

/** 95000 → "1 dk 35 sn", 4200000 → "1 sa 10 dk" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
  if (minutes > 0) return seconds > 0 ? `${minutes} dk ${seconds} sn` : `${minutes} dk`;
  return `${seconds} sn`;
}

/** Kalan süre gibi yerlerde kısa gösterim: "~4 dk" */
export function formatShortDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return '1 dk’dan az';
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

export function formatPercent(ratio: number): string {
  return `%${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}`;
}

/** Uzun metinlerden kütüphane için başlık türetir. */
export function deriveTitle(text: string, fallback = 'Adsız metin'): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return fallback;
  const clipped = firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine;
  return clipped;
}
