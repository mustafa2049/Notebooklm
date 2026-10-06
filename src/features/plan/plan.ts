import { dayKey, startOfDay } from '../../model/time';
import {
  BINOCULAR_KINDS,
  type ActivityKind,
  type ActivityResult,
  type DichopticKind,
  type ExerciseKind,
  type Profile,
  type VisionTest,
} from '../../model/types';
import { starsFor } from '../kids/rewards';

const DAY = 24 * 3600_000;

/** Bugün yapılan etkinlik dakikaları (tek göz / iki göz). */
export function activityMinutes(results: ActivityResult[], day: string): { near: number; binocular: number } {
  let near = 0;
  let binocular = 0;
  for (const r of results) {
    if (dayKey(r.at) !== day) continue;
    if (BINOCULAR_KINDS.has(r.kind)) binocular += r.durationSec / 60;
    else near += r.durationSec / 60;
  }
  return { near, binocular };
}

/** Görme testi zamanı geldi mi (hiç yapılmadıysa da true). */
export function visionTestDue(profile: Profile, tests: VisionTest[], now: number): boolean {
  if (!profile.visionTestEveryDays) return false;
  const last = tests.filter((t) => t.profileId === profile.id).reduce((m, t) => Math.max(m, t.at), 0);
  return !last || startOfDay(now) - startOfDay(last) >= profile.visionTestEveryDays * DAY;
}

/** Kontrol tarihine kalan gün (geçtiyse negatif, tarih yoksa null). */
export function daysUntil(date: string | undefined, now: number): number | null {
  if (!date) return null;
  const t = new Date(`${date}T00:00:00`).getTime();
  return Number.isFinite(t) ? Math.round((t - startOfDay(now)) / DAY) : null;
}

const MONOCULAR: ExerciseKind[] = ['odd-one-out', 'balloons', 'catch', 'maze', 'dots', 'tumbling-e'];
const DICHOPTIC: DichopticKind[] = ['blocks', 'breakout', 'stars', 'snake', 'puzzle'];

/** FNV-1a karma — aynı gün ve profil için hep aynı görevi seçer. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Challenge {
  kind: ActivityKind;
  /** Gereken en az yıldız. */
  stars: number;
}

export const CHALLENGE_BONUS = 3;

/** Etkinliği başlatan sayfa. */
export function activityPath(kind: ActivityKind): string {
  if (kind === 'video') return '/play/video';
  if (kind === 'reading') return '/play/reading';
  return (MONOCULAR as ActivityKind[]).includes(kind) ? `/play/exercise/${kind}` : `/play/dichoptic/${kind}`;
}

/** Günün sürpriz görevi. Gözlük kalibre edilmediyse yalnızca tek göz oyunlarından seçilir. */
export function dailyChallenge(day: string, profileId: string, includeDichoptic: boolean): Challenge {
  const pool: ActivityKind[] = includeDichoptic ? [...MONOCULAR, ...DICHOPTIC] : MONOCULAR;
  return { kind: pool[hash(`${day}|${profileId}`) % pool.length], stars: 2 };
}

export function challengeDone(c: Challenge, results: ActivityResult[], day: string): boolean {
  return results.some((r) => r.kind === c.kind && dayKey(r.at) === day && starsFor(r.performance, r.durationSec) >= c.stars);
}

/** Tamamlanan sürpriz görev sayısı (her gün en fazla bir). */
export function completedChallenges(profile: Profile, results: ActivityResult[]): number {
  const days = new Set(results.filter((r) => r.profileId === profile.id).map((r) => dayKey(r.at)));
  let n = 0;
  for (const day of days) {
    // Görev havuzu o günkü kalibrasyon durumuna bağlı olabilir; iki olasılıktan biri tuttuysa sayılır.
    const a = dailyChallenge(day, profile.id, true);
    const b = dailyChallenge(day, profile.id, false);
    if (challengeDone(a, results, day) || challengeDone(b, results, day)) n++;
  }
  return n;
}
