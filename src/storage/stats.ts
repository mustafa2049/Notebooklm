import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReaderMode } from '@/core/types';
import { KEYS } from './keys';

/** Tamamlanan bir okuma oturumu. */
export interface ReadingSession {
  docId: string;
  mode: ReaderMode;
  /** Oturumun bittiği an */
  at: number;
  /** Yalnızca oynatma sürerken geçen süre (duraklamalar sayılmaz) */
  ms: number;
  words: number;
  /** Ayarlanan hedef hız */
  targetWpm: number;
}

/** En fazla kaç oturum saklanır (istatistikler için 1000 oturum fazlasıyla yeterli). */
const MAX_SESSIONS = 1000;
/** Bu süreden kısa oturumlar kaydedilmez — yanlışlıkla açıp kapatmalar grafiği bozuyor. */
const MIN_SESSION_MS = 3000;

export async function listSessions(): Promise<ReadingSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.sessions);
    return raw ? (JSON.parse(raw) as ReadingSession[]) : [];
  } catch {
    return [];
  }
}

export async function recordSession(session: ReadingSession): Promise<void> {
  if (session.ms < MIN_SESSION_MS || session.words <= 0) return;
  const sessions = await listSessions();
  const next = [session, ...sessions].slice(0, MAX_SESSIONS);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(next));
}

/** Yerel saat diliminde gün anahtarı (YYYY-MM-DD). */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface DailyTotal {
  day: string;
  words: number;
  ms: number;
}

export interface StatsSummary {
  totalWords: number;
  totalMs: number;
  /** Tüm oturumların kelime-ağırlıklı ortalama hızı */
  averageWpm: number;
  /** En iyi oturum hızı (en az 100 kelime okunan oturumlar arasında) */
  bestWpm: number;
  /** Bugün okunan kelime */
  todayWords: number;
  /** Kesintisiz okuma yapılan gün sayısı */
  streak: number;
  /** Son 14 günün günlük toplamları (eski → yeni) */
  daily: DailyTotal[];
}

export function summarize(sessions: ReadingSession[], now = Date.now()): StatsSummary {
  let totalWords = 0;
  let totalMs = 0;
  let bestWpm = 0;

  const byDay = new Map<string, DailyTotal>();
  for (const session of sessions) {
    totalWords += session.words;
    totalMs += session.ms;

    if (session.words >= 100) {
      const wpm = (session.words / session.ms) * 60000;
      if (wpm > bestWpm) bestWpm = wpm;
    }

    const key = dayKey(session.at);
    const entry = byDay.get(key);
    if (entry) {
      entry.words += session.words;
      entry.ms += session.ms;
    } else {
      byDay.set(key, { day: key, words: session.words, ms: session.ms });
    }
  }

  // Son 14 gün, okunmayan günler 0 olarak
  const daily: DailyTotal[] = [];
  const dayMs = 86400000;
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(now - i * dayMs);
    daily.push(byDay.get(key) ?? { day: key, words: 0, ms: 0 });
  }

  // Seri: bugünden (veya dünden) geriye kesintisiz okunan günler.
  // Bugün henüz okumadıysa seri kırılmış sayılmaz — gün bitmedi.
  let streak = 0;
  const startsToday = byDay.has(dayKey(now));
  for (let i = startsToday ? 0 : 1; i < 400; i++) {
    if (!byDay.has(dayKey(now - i * dayMs))) break;
    streak++;
  }

  return {
    totalWords,
    totalMs,
    averageWpm: totalMs > 0 ? Math.round((totalWords / totalMs) * 60000) : 0,
    bestWpm: Math.round(bestWpm),
    todayWords: byDay.get(dayKey(now))?.words ?? 0,
    streak,
    daily,
  };
}
