import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReaderMode } from '@/core/types';
import { KEYS } from './keys';

/** Tamamlanan bir okuma oturumu. */
export interface ReadingSession {
  docId: string;
  /**
   * `test`: seviye testinde kendi hızında okuma (uygulama temposu yok);
   * `listen`: sesli okumayla takip; `page`: sayfa modu (kendi hızında). Bu
   * üçü süreye sayılır, tempo istatistiğine girmez.
   */
  mode: ReaderMode | 'test' | 'listen';
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

// Hesaplar saf modülde (testli); burada yalnızca okuma/yazma var.
export { dayKey, summarize, type DailyTotal, type StatsSummary } from '@/habit/summary';
