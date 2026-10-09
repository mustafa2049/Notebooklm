import { dayKey } from './summary';

/**
 * Tek bir kitabın okuma özeti (kitap kartı için) — saf, testli.
 */

export interface BookSession {
  docId: string;
  at: number;
  ms: number;
  words: number;
  mode: string;
}

export interface BookStats {
  sessions: number;
  totalMs: number;
  /** Okunan günler */
  days: number;
  firstAt: number | null;
  lastAt: number | null;
  /**
   * Bu kitaptaki kendi hızın: Sayfa modunda (tempo yok) kelime/dk. Az veriyle
   * yanıltmasın diye en az 2 dakikalık sayfa okuması gerekir.
   */
  ownWpm: number | null;
}

/** Kendi hızını söylemek için gereken en az sayfa modu süresi */
export const OWN_WPM_MIN_MS = 2 * 60_000;

export function bookStats(sessions: BookSession[], docId: string): BookStats {
  const mine = sessions.filter((session) => session.docId === docId);
  const days = new Set(mine.map((session) => dayKey(session.at)));
  let totalMs = 0;
  let pageMs = 0;
  let pageWords = 0;
  let firstAt: number | null = null;
  let lastAt: number | null = null;
  for (const session of mine) {
    totalMs += session.ms;
    if (session.mode === 'page') {
      pageMs += session.ms;
      pageWords += session.words;
    }
    firstAt = firstAt === null ? session.at : Math.min(firstAt, session.at);
    lastAt = lastAt === null ? session.at : Math.max(lastAt, session.at);
  }
  return {
    sessions: mine.length,
    totalMs,
    days: days.size,
    firstAt,
    lastAt,
    ownWpm: pageMs >= OWN_WPM_MIN_MS ? Math.round(pageWords / (pageMs / 60_000)) : null,
  };
}
