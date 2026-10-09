import { dayKey } from './summary';

/**
 * Kitap planı: "bu kitabı X günde bitir" — saf, testli.
 *
 * Plan bir bitiş günü ve kalan kelimeden ibaret; her gün için pay, **günün
 * başında kalan kelimenin kalan günlere bölünmesiyle** bulunur. Böylece geride
 * kalınca kalan pay kendiliğinden sonraki günlere yayılır, önde gidince de
 * küçülür — "dünü telafi et" diye ayrıca bir yük bindirilmez.
 *
 * Gün sayıları yerel takvim günüdür (bitiş günü dahil). Tarih aritmetiği gün
 * anahtarları ("2026-10-09") üzerinden yapılıyor: saat farkı ve yaz saati
 * geçişi gün sayısını bozmasın.
 */

export interface BookPlan {
  docId: string;
  /** Planın kurulduğu gün */
  startDay: string;
  /** Son gün (dahil) */
  targetDay: string;
  /** Plan kurulurken okunmuş kelime: ilerleme bundan sayılır */
  startWords: number;
  createdAt: number;
}

export type PlanState = 'ahead' | 'onTrack' | 'behind' | 'done' | 'overdue';

export const PLAN_STATE_LABEL: Record<PlanState, string> = {
  ahead: 'Öndesin',
  onTrack: 'Yolunda',
  behind: 'Geride',
  done: 'Bitti',
  overdue: 'Süre doldu',
};

export interface PlanStatus {
  state: PlanState;
  /** Bugün dahil kalan gün (süre dolduysa 0) */
  daysLeft: number;
  /** Kitapta kalan kelime */
  remainingWords: number;
  /** Bugünün payı: günün başında kalan ÷ kalan gün */
  todayTarget: number;
  /** Bugün bu kitaptan okunan kelime */
  todayRead: number;
  /** Bugünkü paydan kalan */
  todayLeft: number;
  /** Bugünkü paydan kalanın dakika karşılığı (doğal hızla) */
  todayMinutes: number;
}

/** Önde/geride sayılmak için yarım günlük pay kadar fark gerekir */
const MARGIN_DAYS = 0.5;

/** "2026-10-09" → o günün sırası (gün farkı almak için) */
function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** İki gün anahtarı arasındaki gün farkı (`to - from`) */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** `now` gününden `days` gün sonrasının anahtarı */
export function dayKeyAfter(now: number, days: number): string {
  const date = new Date(now);
  return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime());
}

/** "N günde bitir": bugün 1. gün, son gün bugünden N−1 gün sonra */
export function createPlan(input: {
  docId: string;
  days: number;
  readWords: number;
  now: number;
}): BookPlan {
  const days = Math.max(1, Math.round(input.days));
  return {
    docId: input.docId,
    startDay: dayKey(input.now),
    targetDay: dayKeyAfter(input.now, days - 1),
    startWords: Math.max(0, Math.round(input.readWords)),
    createdAt: input.now,
  };
}

/** Planın toplam gün sayısı (kurulduğu gün ve son gün dahil) */
export function planDays(plan: BookPlan): number {
  return daysBetween(plan.startDay, plan.targetDay) + 1;
}

export function planStatus(
  plan: BookPlan,
  book: {
    wordCount: number;
    /** Şu ana kadar okunan kelime (ilerlemeden) */
    readWords: number;
    finished: boolean;
    /** Bugün bu kitaptan okunan kelime (oturumlardan) */
    todayRead: number;
  },
  now: number,
  wpm: number
): PlanStatus {
  const today = dayKey(now);
  const readWords = Math.min(book.wordCount, Math.max(0, book.readWords));
  const remainingWords = Math.max(0, book.wordCount - readWords);
  const todayRead = Math.max(0, Math.round(book.todayRead));
  const daysLeft = Math.max(0, daysBetween(today, plan.targetDay) + 1);

  const base = { daysLeft, remainingWords, todayRead };
  if (book.finished || remainingWords === 0) {
    return { ...base, state: 'done', todayTarget: 0, todayLeft: 0, todayMinutes: 0 };
  }
  if (daysLeft === 0) {
    // Süre doldu: kalanın tamamı "bugünün" işi; kullanıcıya yeni tarih önerilir
    return {
      ...base,
      state: 'overdue',
      todayTarget: remainingWords,
      todayLeft: remainingWords,
      todayMinutes: minutes(remainingWords, wpm),
    };
  }

  // Günün başında kalan, kalan günlere bölünür (geride kalınca pay büyür)
  const readAtDayStart = Math.max(0, readWords - todayRead);
  const remainingAtDayStart = Math.max(0, book.wordCount - readAtDayStart);
  const todayTarget = Math.ceil(remainingAtDayStart / daysLeft);
  const todayLeft = Math.max(0, todayTarget - todayRead);

  // Önde/geride: planın ilk hâlindeki düz tempoya göre
  const totalDays = Math.max(1, planDays(plan));
  const perDay = Math.max(1, (book.wordCount - plan.startWords) / totalDays);
  const daysBeforeToday = Math.max(0, Math.min(totalDays, daysBetween(plan.startDay, today)));
  const expectedByYesterday = plan.startWords + perDay * daysBeforeToday;
  // Bugün okunan da sayılır: geride kalan, bugün okuyarak yetişebilir
  const state: PlanState =
    readWords >= expectedByYesterday + perDay * (1 + MARGIN_DAYS)
      ? 'ahead'
      : readWords + perDay * MARGIN_DAYS >= expectedByYesterday
        ? 'onTrack'
        : 'behind';

  return { ...base, state, todayTarget, todayLeft, todayMinutes: minutes(todayLeft, wpm) };
}

function minutes(words: number, wpm: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / Math.max(60, wpm)));
}

/** Bugün bu kitaptan okunan: o kitabın bugünkü oturumları */
export function wordsReadToday(
  sessions: { docId: string; at: number; words: number }[],
  docId: string,
  now: number
): number {
  const today = dayKey(now);
  let total = 0;
  for (const session of sessions) {
    if (session.docId === docId && dayKey(session.at) === today) total += session.words;
  }
  return total;
}
