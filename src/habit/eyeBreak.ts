/**
 * Göz molası (20-20-20 kuralı) — saf, testli.
 *
 * Ekrana uzun süre yakından bakmak göz yorgunluğu yapıyor; göz doktorlarının
 * sık önerdiği pratik, her 20 dakikada bir 20 saniye boyunca 20 fit (~6 m)
 * uzağa bakmak. Yalnızca **okuma süresi** sayılır: duraklatılan zaman zaten
 * gözün dinlendiği zaman.
 */

export const EYE_BREAK_SECONDS = 20;
export const EYE_BREAK_OPTIONS = [0, 20, 30] as const;

/** Son moladan bu yana okuma süresi eşiği geçti mi? `intervalMinutes` 0 ise kapalı. */
export function eyeBreakDue(activeMs: number, lastBreakActiveMs: number, intervalMinutes: number): boolean {
  if (intervalMinutes <= 0) return false;
  return activeMs - lastBreakActiveMs >= intervalMinutes * 60_000;
}

/** Mola sayacında kalan saniye (yukarı yuvarlanmış, 0'ın altına inmez). */
export function eyeBreakRemaining(startedAt: number, now: number, seconds = EYE_BREAK_SECONDS): number {
  return Math.max(0, Math.ceil((startedAt + seconds * 1000 - now) / 1000));
}
