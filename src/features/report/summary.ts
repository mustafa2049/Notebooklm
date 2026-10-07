import { addDays, dayKey, minutesByDay, startOfDay } from '../../model/time';
import {
  BINOCULAR_KINDS,
  type ActivityKind,
  type ActivityResult,
  type Compliance,
  type DiaryEntry,
  type Eye,
  type GaborResult,
  type GlassesWear,
  type PatchSession,
  type Profile,
  type StereoTest,
  type Symptom,
  type VisionTest,
} from '../../model/types';

export interface ReportInput {
  profile: Profile;
  sessions: PatchSession[];
  results: ActivityResult[];
  gabor: GaborResult[];
  visionTests: VisionTest[];
  stereoTests?: StereoTest[];
  diary: DiaryEntry[];
  /** Dönemin ilk günü (dahil). */
  from: number;
  now: number;
}

export interface WeekRow {
  start: string;
  days: number;
  avgMin: number;
  metDays: number;
}

export interface FirstLast {
  first: number;
  last: number;
  n: number;
}

export interface ReportSummary {
  from: string;
  to: string;
  days: number;
  totalPatchMin: number;
  avgDailyMin: number;
  /** Hedefin tutturulduğu günlerin oranı (0–1). */
  adherence: number;
  weeks: WeekRow[];
  activities: { kind: ActivityKind; sessions: number; minutes: number }[];
  nearMin: number;
  binocularMin: number;
  contrast: FirstLast | null;
  gabor: (FirstLast & { cycles: number })[];
  vision: (FirstLast & { eye: Eye })[];
  /** Stereo eşiği (arcsaniye; null = algılanamadı). */
  stereo: { first: number | null; last: number | null; n: number } | null;
  symptoms: Record<Symptom, number>;
  compliance: Record<Compliance, number>;
  /** Gözlük takma günlüğü; `rate` = "bütün gün" ya da "çoğunlukla" günlerin oranı (cevap yoksa null). */
  glasses: Record<GlassesWear, number> & { rate: number | null };
  notes: { day: string; note: string }[];
}

const firstLast = (vals: number[]): FirstLast | null => (vals.length ? { first: vals[0], last: vals[vals.length - 1], n: vals.length } : null);

export function buildSummary(i: ReportInput): ReportSummary {
  const from = startOfDay(i.from);
  const today = startOfDay(i.now);
  const inRange = (t: number) => t >= from && t < addDays(today, 1);
  const pid = i.profile.id;
  const goal = i.profile.dailyGoalMin;

  const byDay = minutesByDay(
    i.sessions.filter((s) => s.profileId === pid),
    i.now,
  );
  const dayList: string[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) dayList.push(dayKey(d));
  const minsFor = (k: string) => byDay.get(k) ?? 0;
  const totalPatchMin = dayList.reduce((a, k) => a + minsFor(k), 0);

  const weeks: WeekRow[] = [];
  for (let w = 0; w < dayList.length; w += 7) {
    const chunk = dayList.slice(w, w + 7);
    const sum = chunk.reduce((a, k) => a + minsFor(k), 0);
    weeks.push({ start: chunk[0], days: chunk.length, avgMin: sum / chunk.length, metDays: chunk.filter((k) => minsFor(k) >= goal).length });
  }

  const results = i.results.filter((r) => r.profileId === pid && inRange(r.at)).sort((a, b) => a.at - b.at);
  const actMap = new Map<ActivityKind, { sessions: number; minutes: number }>();
  let nearMin = 0;
  let binocularMin = 0;
  for (const r of results) {
    const e = actMap.get(r.kind) ?? { sessions: 0, minutes: 0 };
    e.sessions++;
    e.minutes += r.durationSec / 60;
    actMap.set(r.kind, e);
    if (BINOCULAR_KINDS.has(r.kind)) binocularMin += r.durationSec / 60;
    else nearMin += r.durationSec / 60;
  }

  const gaborIn = i.gabor.filter((g) => g.profileId === pid && inRange(g.at)).sort((a, b) => a.at - b.at);
  const cyclesSet = [...new Set(gaborIn.map((g) => g.cycles))].sort((a, b) => a - b);
  const vis = i.visionTests.filter((v) => v.profileId === pid && inRange(v.at)).sort((a, b) => a.at - b.at);

  const diary = i.diary.filter((d) => d.profileId === pid && d.day >= dayList[0] && d.day <= dayList[dayList.length - 1]);
  const symptoms: Record<Symptom, number> = { headache: 0, double: 0, strain: 0, squint: 0, none: 0 };
  const compliance: Record<Compliance, number> = { full: 0, partial: 0, none: 0 };
  const glassesCount: Record<GlassesWear, number> = { all: 0, most: 0, little: 0, none: 0 };
  for (const d of diary) {
    d.symptoms.forEach((s) => symptoms[s]++);
    compliance[d.compliance]++;
    if (d.glasses) glassesCount[d.glasses]++;
  }
  const glassesAnswered = glassesCount.all + glassesCount.most + glassesCount.little + glassesCount.none;

  return {
    from: dayList[0],
    to: dayList[dayList.length - 1],
    days: dayList.length,
    totalPatchMin,
    avgDailyMin: totalPatchMin / dayList.length,
    adherence: dayList.filter((k) => minsFor(k) >= goal).length / dayList.length,
    weeks,
    activities: [...actMap.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.minutes - a.minutes),
    nearMin,
    binocularMin,
    contrast: firstLast(results.filter((r) => r.contrast != null).map((r) => r.contrast!)),
    gabor: cyclesSet.map((c) => ({ cycles: c, ...firstLast(gaborIn.filter((g) => g.cycles === c).map((g) => g.threshold))! })),
    vision: (['left', 'right'] as Eye[])
      .map((eye) => ({ eye, fl: firstLast(vis.filter((v) => v.eye === eye).map((v) => v.logMAR)) }))
      .filter((v) => v.fl)
      .map((v) => ({ eye: v.eye, ...v.fl! })),
    stereo: (() => {
      const st = (i.stereoTests ?? []).filter((v) => v.profileId === pid && inRange(v.at)).sort((a, b) => a.at - b.at);
      return st.length ? { first: st[0].arcsec, last: st[st.length - 1].arcsec, n: st.length } : null;
    })(),
    symptoms,
    compliance,
    glasses: { ...glassesCount, rate: glassesAnswered ? (glassesCount.all + glassesCount.most) / glassesAnswered : null },
    notes: diary.filter((d) => d.note.trim()).sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({ day: d.day, note: d.note.trim() })),
  };
}

/** Son `n` gün art arda (bugün dahil) belirti işaretlendiyse true. */
export function persistentSymptoms(diary: DiaryEntry[], profileId: string, now: number, n = 3): boolean {
  for (let i = 0; i < n; i++) {
    const day = dayKey(addDays(startOfDay(now), -i));
    const e = diary.find((d) => d.profileId === profileId && d.day === day);
    if (!e || !e.symptoms.some((s) => s !== 'none')) return false;
  }
  return true;
}
