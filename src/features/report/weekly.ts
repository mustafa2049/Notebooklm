import { addDays, startOfDay } from '../../model/time';
import type { Mode } from '../../model/types';
import { buildSummary, type ReportInput, type ReportSummary } from './summary';

export type Trend = 'up' | 'down' | 'same';

export interface Metric {
  /** Bu haftanın değeri. */
  value: number;
  /** Geçen haftanın değeri (karşılaştırma yoksa null). */
  prev: number | null;
  delta: number | null;
  trend: Trend | null;
}

export interface WeeklyComparison {
  /** Bu haftanın ilk günü (Pazartesi) ve geçen gün sayısı. */
  weekStart: number;
  days: number;
  /** Geçen hafta karşılaştırılabilir veri var mı. */
  hasPrev: boolean;
  /** Günlük ortalama kapama (dk). */
  patchAvg: Metric;
  /** Hedefe ulaşılan gün oranı (0–1). */
  adherence: Metric;
  /** Günlük ortalama oyun/egzersiz (dk). */
  activityAvg: Metric;
  /** Gözlüğün çoğunlukla takıldığı gün oranı (cevap yoksa null). */
  glassesRate: Metric | null;
  /** Hedefe ulaşılan gün sayısı (bu hafta). */
  metDays: number;
  totalPatchMin: number;
}

/** Haftanın başı: Pazartesi 00:00 (yerel saat). */
export function startOfWeek(ts: number): number {
  const d = startOfDay(ts);
  const dow = (new Date(d).getDay() + 6) % 7; // Pazartesi = 0
  return addDays(d, -dow);
}

function metric(value: number, prev: number | null, threshold: number): Metric {
  if (prev == null) return { value, prev: null, delta: null, trend: null };
  const delta = value - prev;
  return { value, prev, delta, trend: delta >= threshold ? 'up' : delta <= -threshold ? 'down' : 'same' };
}

const activityAvg = (s: ReportSummary) => (s.nearMin + s.binocularMin) / s.days;

/** Bu hafta (Pazartesiden bugüne) ile geçen haftanın (7 gün) karşılaştırması. Günlük ortalamalar kullanılır, böylece yarım hafta da adil karşılaştırılır. */
export function weeklyComparison(input: Omit<ReportInput, 'from'>): WeeklyComparison {
  const weekStart = startOfWeek(input.now);
  // Profil hafta içinde açıldıysa önceki günler sayılmaz.
  const cur = buildSummary({ ...input, from: Math.max(weekStart, startOfDay(input.profile.createdAt)) });
  const prev = buildSummary({ ...input, from: addDays(weekStart, -7), now: weekStart - 1 });
  const hasPrev =
    input.profile.createdAt < weekStart && (prev.totalPatchMin > 0 || prev.nearMin + prev.binocularMin > 0);
  const p = <T>(v: T) => (hasPrev ? v : null);
  const prevGlasses = hasPrev ? prev.glasses.rate : null;
  return {
    weekStart,
    days: cur.days,
    hasPrev,
    patchAvg: metric(cur.avgDailyMin, p(prev.avgDailyMin), 5),
    adherence: metric(cur.adherence, p(prev.adherence), 0.1),
    activityAvg: metric(activityAvg(cur), p(activityAvg(prev)), 2),
    glassesRate: cur.glasses.rate == null ? null : metric(cur.glasses.rate, prevGlasses, 0.1),
    metDays: Math.round(cur.adherence * cur.days),
    totalPatchMin: cur.totalPatchMin,
  };
}

/** Haftalık özete kısa, cesaretlendirici Türkçe yorum. */
export function weeklyMessage(c: WeeklyComparison, mode: Mode): string {
  const child = mode === 'child';
  let msg: string;
  const d = Math.round(Math.abs(c.patchAvg.delta ?? 0));
  if (!c.hasPrev) {
    msg = child ? 'İlk haftan, harika başladın! 🌟' : 'İlk haftan: her gün hedefine ulaşmaya çalış, gelecek hafta karşılaştırırız.';
  } else if (c.patchAvg.trend === 'up') {
    msg = child ? 'Geçen haftadan daha çok çalıştın, süpersin! 🌟' : `Günlük kapama ortalaman geçen haftadan ${d} dk fazla 👏`;
  } else if (c.patchAvg.trend === 'down') {
    msg = child
      ? 'Bu hafta biraz geride kaldık, bugün birlikte yetişelim! 💪'
      : `Günlük kapama ortalaman geçen haftadan ${d} dk az. Bugün biraz telafi edebilirsin.`;
  } else {
    msg = child ? 'Geçen haftaki gibi gidiyorsun, aferin! 👍' : 'Geçen haftayla aynı tempodasın, böyle devam.';
  }
  if (c.glassesRate && c.glassesRate.value < 0.5) {
    msg += child ? ' Gözlüğünü takmayı unutma 👓' : ' Gözlüğünü daha sık takmayı unutma 👓';
  }
  return msg;
}
