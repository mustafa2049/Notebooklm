import { describe, expect, it } from 'vitest';
import { dailySuggestions, warmupOfDay, WARMUPS } from './today';

const NOW = new Date(2025, 9, 15, 12).getTime();
const base = { noTestYet: false, testDue: false, dueWords: 0, warmupDoneToday: false };

describe('dailySuggestions', () => {
  it('hiç test yoksa önce seviye testini önerir', () => {
    expect(dailySuggestions({ ...base, noTestYet: true }, NOW)[0].id).toBe('test');
  });

  it('haftalık ölçüm zamanı gelince önerir', () => {
    expect(dailySuggestions({ ...base, testDue: true }, NOW)[0].title).toBe('Haftalık ölçüm');
  });

  it('ısınma yapıldıysa tekrar önermez', () => {
    const ids = dailySuggestions({ ...base, warmupDoneToday: true }, NOW).map((item) => item.id);
    expect(ids).toEqual([]);
  });

  it('tekrar bekleyen kelimeyi sayısıyla önerir', () => {
    const vocab = dailySuggestions({ ...base, dueWords: 4 }, NOW).find((item) => item.id === 'vocab');
    expect(vocab?.detail).toContain('4 kelime');
  });

  it('en fazla üç öneri verir', () => {
    expect(dailySuggestions({ noTestYet: true, testDue: true, dueWords: 9, warmupDoneToday: false }, NOW).length).toBeLessThanOrEqual(3);
  });
});

describe('warmupOfDay', () => {
  it('ardışık günlerde farklı egzersiz verir ve döngüye girer', () => {
    const day = 86400000;
    const seen = new Set(Array.from({ length: WARMUPS.length }, (_, i) => warmupOfDay(NOW + i * day).id));
    expect(seen.size).toBe(WARMUPS.length);
  });
});
