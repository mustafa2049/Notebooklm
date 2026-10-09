import { daysBetween, dayKeyAfter } from './bookPlan';
import { BOOK_MIN_WORDS } from './books';
import { dayKey } from './summary';

/**
 * Okuma meydan okumaları — saf, testli.
 *
 * Her meydan okuma bir süre (gün) ve bir hedeften ibaret; ilerleme oturumlardan
 * ve bitirilen kitaplardan **hesaplanır**, ayrıca sayılmaz. Süre bitmeden hedef
 * tutturulursa "tamam"; kalan günlerde artık yetişmesi mümkün değilse "kaçtı"
 * (kullanıcı yeniden başlatabilir). Süre başladığı gün dahil sayılır.
 */

export type ChallengeId = 'streak7' | 'daily15' | 'hours3' | 'words20k' | 'book30' | 'books90';

export type ChallengeMeasure = 'readingDays' | 'longDays' | 'minutes' | 'words' | 'books';

export interface ChallengeDef {
  id: ChallengeId;
  title: string;
  detail: string;
  days: number;
  target: number;
  measure: ChallengeMeasure;
  /** İlerleme etiketindeki birim */
  unit: string;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'streak7', title: '7 gün üst üste', detail: 'Bir hafta boyunca her gün biraz oku.', days: 7, target: 7, measure: 'readingDays', unit: 'gün' },
  { id: 'daily15', title: 'İki haftada 10 gün', detail: '14 günün en az 10’unda 15’er dakika oku.', days: 14, target: 10, measure: 'longDays', unit: 'gün' },
  { id: 'hours3', title: 'Haftada 3 saat', detail: 'Yedi gün içinde toplam 3 saat oku.', days: 7, target: 180, measure: 'minutes', unit: 'dk' },
  { id: 'words20k', title: 'Haftada 20 bin kelime', detail: 'Yedi gün içinde 20.000 kelime oku.', days: 7, target: 20000, measure: 'words', unit: 'kelime' },
  { id: 'book30', title: '30 günde bir kitap', detail: '5.000 kelimeden uzun bir kitabı 30 günde bitir.', days: 30, target: 1, measure: 'books', unit: 'kitap' },
  { id: 'books90', title: '3 ayda 3 kitap', detail: '90 gün içinde üç kitap bitir.', days: 90, target: 3, measure: 'books', unit: 'kitap' },
];

/** "Uzun gün" sayılmak için o günkü okuma süresi */
export const LONG_DAY_MS = 15 * 60_000;

export interface ChallengeEntry {
  id: ChallengeId;
  startedAt: number;
  /** Tamamlandığı an (bir kez yazılır; geçmişte kalsın) */
  completedAt?: number;
  /** Kullanıcı bıraktı */
  abandonedAt?: number;
}

export type ChallengeStatus = 'active' | 'done' | 'missed' | 'abandoned';

export interface ChallengeProgress {
  def: ChallengeDef;
  entry: ChallengeEntry;
  startDay: string;
  /** Son gün (dahil) */
  endDay: string;
  /** Bugün dahil kalan gün (bittiyse 0) */
  daysLeft: number;
  value: number;
  ratio: number;
  status: ChallengeStatus;
}

interface Data {
  sessions: { at: number; ms: number; words: number }[];
  /** Bitirilen kitaplar (kütüphane + günlük) */
  books: { wordCount: number; finishedAt: number }[];
}

export function challengeDef(id: ChallengeId): ChallengeDef | undefined {
  return CHALLENGES.find((def) => def.id === id);
}

function measure(def: ChallengeDef, data: Data, startDay: string, endDay: string): number {
  const inWindow = (at: number) => {
    const key = dayKey(at);
    return key >= startDay && key <= endDay;
  };
  const sessions = data.sessions.filter((session) => inWindow(session.at));
  switch (def.measure) {
    case 'readingDays':
      return new Set(sessions.filter((s) => s.ms > 0).map((s) => dayKey(s.at))).size;
    case 'longDays': {
      const byDay = new Map<string, number>();
      for (const session of sessions) byDay.set(dayKey(session.at), (byDay.get(dayKey(session.at)) ?? 0) + session.ms);
      return [...byDay.values()].filter((ms) => ms >= LONG_DAY_MS).length;
    }
    case 'minutes':
      return Math.floor(sessions.reduce((sum, s) => sum + s.ms, 0) / 60_000);
    case 'words':
      return sessions.reduce((sum, s) => sum + s.words, 0);
    case 'books':
      return data.books.filter((book) => book.wordCount >= BOOK_MIN_WORDS && inWindow(book.finishedAt)).length;
  }
}

export function challengeProgress(entry: ChallengeEntry, data: Data, now: number): ChallengeProgress | null {
  const def = challengeDef(entry.id);
  if (!def) return null;
  const startDay = dayKey(entry.startedAt);
  const endDay = dayKeyAfter(entry.startedAt, def.days - 1);
  const today = dayKey(now);
  const daysLeft = Math.max(0, daysBetween(today, endDay) + 1);
  const value = measure(def, data, startDay, endDay);
  const ratio = Math.min(1, value / def.target);

  let status: ChallengeStatus;
  if (entry.completedAt !== undefined || value >= def.target) status = 'done';
  else if (entry.abandonedAt !== undefined) status = 'abandoned';
  else if (daysLeft === 0 || !stillPossible(def, value, daysLeft, data, today)) status = 'missed';
  else status = 'active';

  return { def, entry, startDay, endDay, daysLeft, value, ratio, status };
}

/**
 * Gün sayan meydan okumalarda kalan günler yetmiyorsa erkenden "kaçtı" denir
 * (bugün henüz okunmadıysa bugün de sayılır). Süre/kelime/kitap hedefleri
 * son güne kadar açık kalır.
 */
function stillPossible(def: ChallengeDef, value: number, daysLeft: number, data: Data, today: string): boolean {
  if (def.measure !== 'readingDays' && def.measure !== 'longDays') return true;
  const todayMs = data.sessions
    .filter((session) => dayKey(session.at) === today)
    .reduce((sum, session) => sum + session.ms, 0);
  const todayCounted = def.measure === 'readingDays' ? todayMs > 0 : todayMs >= LONG_DAY_MS;
  // Bugün sayıldıysa bugün bir gün daha kazandırmaz
  const remainingDays = todayCounted ? daysLeft - 1 : daysLeft;
  return value + remainingDays >= def.target;
}

/** "3 / 7 gün", "120 / 180 dk", "12.400 / 20.000 kelime" */
export function progressLabel(progress: ChallengeProgress): string {
  const format = (value: number) => Math.round(value).toLocaleString('tr-TR');
  return `${format(Math.min(progress.value, progress.def.target))} / ${format(progress.def.target)} ${progress.def.unit}`;
}

/** Aynı meydan okuma aynı anda bir kez sürer */
export function canStart(entries: ChallengeEntry[], id: ChallengeId, data: Data, now: number): boolean {
  return !entries.some((entry) => entry.id === id && challengeProgress(entry, data, now)?.status === 'active');
}
