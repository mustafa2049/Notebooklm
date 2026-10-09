/**
 * Sayfa modunda okuma süresi — saf, testli.
 *
 * Sayfa modunda tempo yok; kullanıcı kendi hızında okur. Süreyi sayfanın
 * ekranda kaldığı süreden çıkarıyoruz, ama iki kenar durumu var:
 * - Ekran açık kalıp kullanıcı başka işe dalarsa bu okuma değildir: bir
 *   sayfada sayılan süre, çok yavaş bir okumanın (50 kel/dk) süresiyle
 *   sınırlanır (en az 30 sn).
 * - Sayfaları hızla çevirmek okumak değildir: sayfa ancak 1000 kel/dk'dan
 *   yavaş geçildiyse kelimeleri sayılır.
 */

export const SLOWEST_WPM = 50;
export const FASTEST_WPM = 1000;
export const MIN_PAGE_CAP_MS = 30_000;

export interface PageCredit {
  ms: number;
  words: number;
}

/** Bir sayfada sayılabilecek en uzun süre. */
export function pageDwellCap(words: number): number {
  return Math.max(MIN_PAGE_CAP_MS, (words / SLOWEST_WPM) * 60_000);
}

/** Sayfanın okunmuş sayılması için gereken en kısa süre. */
export function minReadMs(words: number): number {
  return (words / FASTEST_WPM) * 60_000;
}

/** Sayfada geçen süreden okuma kredisi. */
export function pageCredit(dwellMs: number, words: number): PageCredit {
  const dwell = Math.max(0, dwellMs);
  return {
    ms: Math.min(dwell, pageDwellCap(words)),
    words: words > 0 && dwell >= minReadMs(words) ? words : 0,
  };
}
