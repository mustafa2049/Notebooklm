/**
 * Okuma oturumlarından özet — saf fonksiyonlar, testli.
 *
 * `storage/stats.ts` yalnızca okuyup yazıyor; hesap burada. Böylece seri gibi
 * kenar durumu bol kurallar ağa ve depoya dokunmadan test edilebiliyor.
 */

export interface SessionLike {
  /** Oturumun bittiği an */
  at: number;
  ms: number;
  words: number;
  /** `test`: seviye testinde kendi hızında okuma */
  mode: string;
}

export interface DailyTotal {
  day: string;
  words: number;
  ms: number;
}

export interface StatsSummary {
  totalWords: number;
  totalMs: number;
  /**
   * Antrenman oturumlarının kelime-ağırlıklı ortalama **temposu**. Uygulama
   * hızı belirlediği için bu bir beceri ölçüsü değil; test okumaları hariç.
   */
  averageWpm: number;
  /** En yüksek tempo (en az 100 kelimelik antrenman oturumları arasında) */
  bestWpm: number;
  todayWords: number;
  todayMs: number;
  /** Esnek seri: zincirdeki okuma günü sayısı (bkz. `flexibleStreak`) */
  streak: number;
  /** Dün okunmadı, bugün de henüz okunmadı: bugün okunmazsa seri biter */
  streakAtRisk: boolean;
  readToday: boolean;
  /** Son 14 günün günlük toplamları (eski → yeni) */
  daily: DailyTotal[];
}

/** Yerel saat diliminde gün anahtarı (YYYY-MM-DD). */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * `now`dan `offset` gün önceki günün anahtarı. Takvim aritmetiği `Date`
 * üzerinden yapılıyor (24 saat çıkarmak yaz saati geçişinde aynı günü iki kez
 * ya da hiç vermeyebilir).
 */
export function dayKeyBefore(now: number, offset: number): string {
  const date = new Date(now);
  return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset).getTime());
}

export function totalsByDay(sessions: SessionLike[]): Map<string, DailyTotal> {
  const byDay = new Map<string, DailyTotal>();
  for (const session of sessions) {
    const key = dayKey(session.at);
    const entry = byDay.get(key);
    if (entry) {
      entry.words += session.words;
      entry.ms += session.ms;
    } else {
      byDay.set(key, { day: key, words: session.words, ms: session.ms });
    }
  }
  return byDay;
}

/**
 * Esnek seri: **bir gün kaçırmak seriyi bozmaz, iki gün üst üste kaçırmak
 * bozar.** Alışkanlık araştırmasında (Lally ve ark., 2010) tek bir kaçırmanın
 * alışkanlık oluşumunu belirgin etkilemediği görülmüş; katı seri ise tek bir
 * kötü günde bütün emeği sıfırlayıp bırakmaya itiyor.
 *
 * Bugün henüz okunmadıysa gün bitmediği için kaçırılmış sayılmaz. Seri,
 * zincirdeki okuma günlerinin sayısıdır.
 */
export function flexibleStreak(
  readDays: Set<string>,
  now: number
): { streak: number; atRisk: boolean } {
  const readToday = readDays.has(dayKeyBefore(now, 0));
  let streak = 0;
  let missedInRow = 0;

  for (let offset = 0; offset < 1000; offset++) {
    if (readDays.has(dayKeyBefore(now, offset))) {
      streak += 1;
      missedInRow = 0;
      continue;
    }
    if (offset === 0) continue; // bugün bitmedi
    missedInRow += 1;
    if (missedInRow >= 2) break;
  }

  const atRisk = streak > 0 && !readToday && !readDays.has(dayKeyBefore(now, 1));
  return { streak, atRisk };
}

export function summarize(sessions: SessionLike[], now = Date.now()): StatsSummary {
  let totalWords = 0;
  let totalMs = 0;
  let tempoWords = 0;
  let tempoMs = 0;
  let bestWpm = 0;

  for (const session of sessions) {
    totalWords += session.words;
    totalMs += session.ms;
    if (session.mode === 'test') continue;

    tempoWords += session.words;
    tempoMs += session.ms;
    if (session.words >= 100 && session.ms > 0) {
      const wpm = (session.words / session.ms) * 60000;
      if (wpm > bestWpm) bestWpm = wpm;
    }
  }

  const byDay = totalsByDay(sessions);
  const daily: DailyTotal[] = [];
  for (let offset = 13; offset >= 0; offset--) {
    const key = dayKeyBefore(now, offset);
    daily.push(byDay.get(key) ?? { day: key, words: 0, ms: 0 });
  }

  const today = byDay.get(dayKeyBefore(now, 0));
  const { streak, atRisk } = flexibleStreak(new Set(byDay.keys()), now);

  return {
    totalWords,
    totalMs,
    averageWpm: tempoMs > 0 ? Math.round((tempoWords / tempoMs) * 60000) : 0,
    bestWpm: Math.round(bestWpm),
    todayWords: today?.words ?? 0,
    todayMs: today?.ms ?? 0,
    streak,
    streakAtRisk: atRisk,
    readToday: Boolean(today),
    daily,
  };
}

/** Isı haritası için son `weeks` haftanın günleri, pazartesiden başlayarak. */
export function heatmapDays(
  sessions: SessionLike[],
  now: number,
  weeks: number
): { day: string; ms: number; future: boolean }[] {
  const byDay = totalsByDay(sessions);
  const date = new Date(now);
  // Bu haftanın pazartesisi (Türkiye'de hafta pazartesi başlar)
  const mondayOffset = (date.getDay() + 6) % 7;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset - (weeks - 1) * 7);
  const today = dayKey(now);

  const days: { day: string; ms: number; future: boolean }[] = [];
  let future = false;
  for (let i = 0; i < weeks * 7; i++) {
    const key = dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime());
    days.push({ day: key, ms: byDay.get(key)?.ms ?? 0, future });
    if (key === today) future = true;
  }
  return days;
}

export interface WeekTotals {
  words: number;
  ms: number;
  days: number;
}

/** Bu hafta (pazartesiden bugüne) ve geçen haftanın tamamı. */
export function weeklyComparison(
  sessions: SessionLike[],
  now: number
): { thisWeek: WeekTotals; lastWeek: WeekTotals } {
  const date = new Date(now);
  const mondayOffset = (date.getDay() + 6) % 7;
  const thisMonday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset).getTime();
  const lastMonday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset - 7).getTime();

  const empty = (): WeekTotals & { dayKeys: Set<string> } => ({ words: 0, ms: 0, days: 0, dayKeys: new Set() });
  const thisWeek = empty();
  const lastWeek = empty();

  for (const session of sessions) {
    const target = session.at >= thisMonday ? thisWeek : session.at >= lastMonday ? lastWeek : null;
    if (!target || session.at > now) continue;
    target.words += session.words;
    target.ms += session.ms;
    target.dayKeys.add(dayKey(session.at));
  }

  const finish = ({ dayKeys, ...totals }: WeekTotals & { dayKeys: Set<string> }): WeekTotals => ({
    ...totals,
    days: dayKeys.size,
  });
  return { thisWeek: finish(thisWeek), lastWeek: finish(lastWeek) };
}

/**
 * Bugüne kadarki en uzun esnek seri (aynı kural: tek gün boşluk tolere edilir).
 * Rozetler bununla verilir ki bir seri bitince kazanılan rozet geri alınmasın.
 */
export function longestFlexibleStreak(readDays: Set<string>): number {
  const days = [...readDays].sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;

  for (const key of days) {
    const [year, month, day] = key.split('-').map(Number);
    const time = new Date(year, month - 1, day).getTime();
    // Takvim günü farkı (yaz saati geçişine dayanıklı yuvarlama)
    const gap = previous === null ? 1 : Math.round((time - previous) / 86400000);
    current = gap <= 2 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = time;
  }
  return best;
}
