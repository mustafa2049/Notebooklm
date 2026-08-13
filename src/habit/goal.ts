/**
 * Günlük hedef hesapları — saf fonksiyonlar, testli.
 *
 * Hedefin işi baskı kurmak değil, günü kapatılabilir kılmak: kalan kelime ve
 * yaklaşık kalan süre gösteriliyor ki kullanıcı "bugünlük bu kadar" diyebilsin.
 */

export interface GoalProgress {
  /** 0–1 arası tamamlanma (hedef yoksa 0) */
  ratio: number;
  /** Hedefe kalan kelime (hedef aşıldıysa 0) */
  remaining: number;
  done: boolean;
  /** Hedef tanımlı mı */
  active: boolean;
}

export function goalProgress(todayWords: number, goalWords: number): GoalProgress {
  if (goalWords <= 0) {
    return { ratio: 0, remaining: 0, done: false, active: false };
  }
  const ratio = Math.min(1, todayWords / goalWords);
  return {
    ratio,
    remaining: Math.max(0, goalWords - todayWords),
    done: todayWords >= goalWords,
    active: true,
  };
}

/** Kalan kelimenin hedef hızda kaç dakika süreceği (en az 1 dk). */
export function remainingMinutes(remaining: number, wpm: number): number {
  if (remaining <= 0 || wpm <= 0) return 0;
  return Math.max(1, Math.round(remaining / wpm));
}

/** 20:5 → "20:05" */
export function formatClock(hour: number, minute: number): string {
  const pad = (value: number) => String(Math.max(0, Math.floor(value))).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}`;
}
