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

export type GoalUnit = 'minutes' | 'words';

export interface DailyGoalStatus extends GoalProgress {
  unit: GoalUnit;
  /** Bugün yapılan (dakika ya da kelime) */
  doneValue: number;
  goalValue: number;
  /** Hedefe kalan süre, dakika (kelime hedefinde hedef hızına göre tahmin) */
  minutesLeft: number;
}

/**
 * Günlük hedefin durumu, birimden bağımsız. Dakika hedefinde yalnızca okuma
 * süresi sayılır (oynatma ya da kendi hızında okuma); duraklamalar sayılmaz.
 */
export function dailyGoalStatus(input: {
  unit: GoalUnit;
  goalMinutes: number;
  goalWords: number;
  todayMs: number;
  todayWords: number;
  wpm: number;
}): DailyGoalStatus {
  if (input.unit === 'minutes') {
    const doneMinutes = input.todayMs / 60000;
    const progress = goalProgress(doneMinutes, input.goalMinutes);
    return {
      ...progress,
      unit: 'minutes',
      doneValue: Math.floor(doneMinutes),
      goalValue: input.goalMinutes,
      remaining: Math.ceil(progress.remaining),
      minutesLeft: Math.ceil(progress.remaining),
    };
  }
  const progress = goalProgress(input.todayWords, input.goalWords);
  return {
    ...progress,
    unit: 'words',
    doneValue: input.todayWords,
    goalValue: input.goalWords,
    minutesLeft: remainingMinutes(progress.remaining, input.wpm),
  };
}
