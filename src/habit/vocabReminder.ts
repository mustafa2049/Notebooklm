import { dueCount, type ReviewItem } from '@/train/review';

/**
 * Kelime tekrar bildirimi — saf, testli.
 *
 * Planlanmış bildirimin metni sonradan değişmiyor; "6 kelime" gibi bir sayı
 * ancak planlarken hesaplanabilir. Bu yüzden önümüzdeki günlerin her biri
 * için o gün, o saatte tekrar zamanı gelmiş kelime sayısı hesaplanıp tek
 * seferlik bildirimler kuruluyor (sayısı 0 olan gün atlanır). Uygulama her
 * açıldığında ve defter değiştiğinde (kayıt, tekrar, oyun) yeniden planlanır.
 */

export interface PlannedReminder {
  /** Bildirimin zamanı (ms) */
  at: number;
  /** O anda tekrar zamanı gelmiş kelime sayısı */
  count: number;
}

/** Bu kadar gün ileriye planlanır (uygulama açılmasa da bir hafta hatırlatır) */
export const PLAN_DAYS = 7;

export function planVocabReminders(
  entries: ReviewItem[],
  now: number,
  hour: number,
  days = PLAN_DAYS
): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  // Bugünün saati geçtiyse yarından başlar; toplam `days` gün
  const today = new Date(now);
  today.setHours(hour, 0, 0, 0);
  const first = today.getTime() > now + 60_000 ? 0 : 1;
  for (let offset = first; offset < first + days; offset++) {
    const at = new Date(now);
    at.setDate(at.getDate() + offset);
    at.setHours(hour, 0, 0, 0);
    const count = dueCount(entries, at.getTime());
    if (count > 0) plan.push({ at: at.getTime(), count });
  }
  return plan;
}

export function vocabReminderBody(count: number): string {
  return count === 1
    ? 'Bir kelimenin tekrar zamanı geldi. Bir dakikanı ayır, unutmadan pekiştir.'
    : `${count} kelimenin tekrar zamanı geldi. Bir iki dakikanı ayır, unutmadan pekiştir.`;
}
