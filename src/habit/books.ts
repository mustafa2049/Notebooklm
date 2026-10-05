import { dayKeyBefore, totalsByDay, type SessionLike } from './summary';

/**
 * Kitap bitirme tahmini ve yıllık hedef — saf fonksiyonlar, testli.
 *
 * Tahmin gerçek temponla yapılıyor: son iki haftada **okuduğun günlerde**
 * günde ortalama kaç kelime okuduğun. Okumadığın günleri ortalamaya katmak
 * tahmini gereksiz karamsar yapardı; tahmin "okuduğun günlerde bu tempoyla"
 * diye okunmalı.
 */

/** Bundan kısa dokümanlar (yapıştırılan makaleler) yıllık "kitap" sayılmaz. */
export const BOOK_MIN_WORDS = 5000;
const WINDOW_DAYS = 14;

export function averageWordsPerReadingDay(sessions: SessionLike[], now: number): number | null {
  const byDay = totalsByDay(sessions);
  let total = 0;
  let days = 0;
  for (let offset = 0; offset < WINDOW_DAYS; offset++) {
    const entry = byDay.get(dayKeyBefore(now, offset));
    if (entry && entry.words > 0) {
      total += entry.words;
      days += 1;
    }
  }
  return days > 0 ? total / days : null;
}

/** Kalan kelime bu tempoyla kaç okuma gününde biter; veri yoksa `null`. */
export function finishEstimateDays(
  remainingWords: number,
  sessions: SessionLike[],
  now: number
): number | null {
  if (remainingWords <= 0) return 0;
  const perDay = averageWordsPerReadingDay(sessions, now);
  if (!perDay) return null;
  return Math.max(1, Math.ceil(remainingWords / perDay));
}

export interface BookLike {
  wordCount: number;
  finished: boolean;
  /** Bitirildiği an (yoksa ilerlemenin son güncellenme anı) */
  finishedAt?: number;
}

export function booksFinishedInYear(books: BookLike[], now: number): number {
  const year = new Date(now).getFullYear();
  return books.filter(
    (book) =>
      book.finished &&
      book.wordCount >= BOOK_MIN_WORDS &&
      book.finishedAt !== undefined &&
      new Date(book.finishedAt).getFullYear() === year
  ).length;
}

/**
 * Yıllık hedefe göre durum: yılın geçen kısmına oranla beklenen kitap sayısı.
 * "Geride" demek yerine kaç kitap kaldığını ve kalan haftaları veriyoruz.
 */
export function yearlyGoalStatus(
  finished: number,
  goal: number,
  now: number
): { remaining: number; weeksLeft: number; onTrack: boolean } {
  const date = new Date(now);
  const start = new Date(date.getFullYear(), 0, 1).getTime();
  const end = new Date(date.getFullYear() + 1, 0, 1).getTime();
  const elapsed = (now - start) / (end - start);
  const weeksLeft = Math.max(0, Math.ceil((end - now) / (7 * 24 * 60 * 60 * 1000)));
  return {
    remaining: Math.max(0, goal - finished),
    weeksLeft,
    onTrack: finished >= Math.floor(goal * elapsed),
  };
}
