import type { ReadingThemeId } from './palettes';

/**
 * Akşam sıcak tonu — saf, testli.
 *
 * Belirlenen saatler arasında okuma teması kendiliğinden sıcak ve koyu bir
 * temaya (Gece, Sepya ya da Siyah) geçer, sabah kullanıcının kendi temasına
 * döner. Aralık gece yarısını aşabilir (21:00–07:00).
 */

export const EVENING_THEMES: { id: ReadingThemeId; label: string }[] = [
  { id: 'night', label: 'Gece' },
  { id: 'sepia', label: 'Sepya' },
  { id: 'black', label: 'Siyah' },
];

export const EVENING_STARTS = [19, 20, 21, 22, 23];
export const EVENING_ENDS = [5, 6, 7, 8, 9];

export interface EveningSettings {
  eveningEnabled: boolean;
  /** Başlangıç saati (0–23) */
  eveningStart: number;
  /** Bitiş saati (0–23); başlangıçtan küçükse ertesi sabah */
  eveningEnd: number;
  eveningTheme: ReadingThemeId;
}

/** Saat (dakikasıyla) aralıkta mı? Başlangıç dahil, bitiş hariç. */
export function inEveningWindow(date: Date, start: number, end: number): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const from = start * 60;
  const to = end * 60;
  if (from === to) return false;
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export function isEvening(settings: EveningSettings, date: Date): boolean {
  return settings.eveningEnabled && inEveningWindow(date, settings.eveningStart, settings.eveningEnd);
}

/** "21:00–07:00" */
export function eveningRangeLabel(start: number, end: number): string {
  const pad = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  return `${pad(start)}–${pad(end)}`;
}
