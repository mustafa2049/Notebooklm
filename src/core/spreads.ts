import { LAST, stepFocus } from './lineFocus';
import type { Page } from './pages';

/**
 * Çift sayfa (geniş ekranda kitap gibi yan yana iki sayfa) — saf, testli.
 *
 * Sayfalama sütun genişliğiyle yapılır; okuyucu sayfaları ikişer birleştirip
 * bütün mantığını (çevirme, tempo rehberinin kendiliğinden çevirmesi,
 * ilerleme, yer imi) bu birleşik sayfalar üzerinde çalıştırır. `split`, sağ
 * sayfanın başladığı chunk; tek kalan son sayfada yok.
 */

export interface Spread extends Page {
  /** Sağ sayfanın başı (yoksa yalnızca sol sayfa) */
  split?: number;
}

/** Bu genişlikten (ve yataydan) itibaren çift sayfa */
export const SPREAD_MIN_WIDTH = 900;

export function pairPages(pages: Page[]): Spread[] {
  const spreads: Spread[] = [];
  for (let i = 0; i < pages.length; i += 2) {
    const left = pages[i];
    const right = pages[i + 1];
    spreads.push(right ? { start: left.start, end: right.end, split: right.start } : { start: left.start, end: left.end });
  }
  return spreads;
}

/** Etiket için sayfa numaraları: 3. yayılım → "5–6"; tek kalan son sayfa → "7" */
export function spreadPages(index: number, pageCount: number): string {
  const first = index * 2 + 1;
  return first + 1 <= pageCount ? `${first}–${first + 1}` : `${first}`;
}

/**
 * Satır odağı iki sütunda: satırlar tek sırada (önce sol sütun, sonra sağ).
 * Bant sütun sınırını aşmaz: sol sütunun son konumundan bir adım sağ
 * sütunun başına atlar. `start`, birleşik sıradaki ilk satır (`LAST` = sağ
 * sütunun son satırları).
 */
export function spreadBand(
  start: number,
  left: number,
  right: number,
  size: number
): { column: 0 | 1; start: number } {
  if (right <= 0) return { column: 0, start };
  if (start < 0) return { column: 1, start: LAST };
  if (start < left) return { column: 0, start: Math.min(start, Math.max(0, left - size)) };
  return { column: 1, start: start - left };
}

/** Bandı bir satır oynatır; iki sütunun dışına çıkınca sayfa çevrilir */
export function stepSpreadFocus(
  start: number,
  left: number,
  right: number,
  size: number,
  delta: 1 | -1
): { start: number } | { turn: 1 | -1 } {
  if (right <= 0) return stepFocus(start, left, size, delta);
  const leftLast = Math.max(0, left - size);
  const rightLast = left + Math.max(0, right - size);
  let current = start < 0 ? rightLast : start;
  // Sütun sınırına taşan konum sol sütunun son konumuna çekilir
  if (current > leftLast && current < left) current = leftLast;
  current = Math.min(current, rightLast);
  let next = current + delta;
  if (delta > 0 && current === leftLast && left > 0) next = left;
  if (delta < 0 && current === left) next = leftLast;
  if (next < 0) return { turn: -1 };
  if (next > rightLast) return { turn: 1 };
  return { start: next };
}
