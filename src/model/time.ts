import type { PatchSession } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel saate göre "YYYY-AA-GG". */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/**
 * Oturumları günlere böler (gece yarısını aşan oturumlar iki güne paylaştırılır)
 * ve gün başına dakika döndürür. Çalışan zamanlayıcı `runningSince` ile eklenir.
 */
export function minutesByDay(
  sessions: Pick<PatchSession, 'start' | 'end'>[],
  now: number,
  runningSince: number | null = null,
): Map<string, number> {
  const out = new Map<string, number>();
  const all = runningSince != null ? [...sessions, { start: runningSince, end: now }] : sessions;
  for (const s of all) {
    let cur = s.start;
    while (cur < s.end) {
      const next = Math.min(s.end, addDays(startOfDay(cur), 1));
      const key = dayKey(cur);
      out.set(key, (out.get(key) ?? 0) + (next - cur) / 60000);
      cur = next;
    }
  }
  return out;
}

/**
 * Hedefin tutturulduğu ardışık gün sayısı. Bugün henüz tamamlanmadıysa seri dünden sayılır.
 */
export function streak(byDay: Map<string, number>, goalMin: number, now: number): number {
  let day = startOfDay(now);
  if ((byDay.get(dayKey(day)) ?? 0) < goalMin) day = addDays(day, -1);
  let n = 0;
  while ((byDay.get(dayKey(day)) ?? 0) >= goalMin) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} sa ${r} dk` : `${h} sa`;
}
