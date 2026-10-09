import { describe, expect, it } from 'vitest';
import { bookStats } from './bookStats';

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const MIN = 60_000;

describe('bookStats', () => {
  const sessions = [
    { docId: 'k', at: at(1), ms: 10 * MIN, words: 3000, mode: 'rsvp' },
    { docId: 'k', at: at(1, 20), ms: 5 * MIN, words: 1000, mode: 'page' },
    { docId: 'k', at: at(3), ms: 3 * MIN, words: 600, mode: 'page' },
    { docId: 'k', at: at(4), ms: 4 * MIN, words: 500, mode: 'listen' },
    { docId: 'baska', at: at(2), ms: 60 * MIN, words: 9000, mode: 'page' },
  ];

  it('yalnızca bu kitabın oturumlarını topluyor', () => {
    const stats = bookStats(sessions, 'k');
    expect(stats).toMatchObject({ sessions: 4, totalMs: 22 * MIN, days: 3, firstAt: at(1), lastAt: at(4) });
  });

  it('kendi hızı yalnızca sayfa modundan (tempolu modlar ve dinleme hariç)', () => {
    expect(bookStats(sessions, 'k').ownWpm).toBe(200);
  });

  it('az sayfa okumasıyla hız söylemiyor; hiç oturum yoksa boş', () => {
    expect(bookStats([{ docId: 'k', at: at(1), ms: MIN, words: 400, mode: 'page' }], 'k').ownWpm).toBeNull();
    expect(bookStats([], 'k')).toEqual({ sessions: 0, totalMs: 0, days: 0, firstAt: null, lastAt: null, ownWpm: null });
  });
});
