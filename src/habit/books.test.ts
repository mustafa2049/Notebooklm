import { describe, expect, it } from 'vitest';
import {
  averageWordsPerReadingDay,
  booksFinishedInYear,
  finishEstimateDays,
  yearlyGoalStatus,
} from './books';

const NOW = new Date(2025, 9, 15, 12).getTime();
const day = (offset: number) => new Date(2025, 9, 15 - offset, 10).getTime();

describe('finishEstimateDays', () => {
  const sessions = [
    { at: day(0), ms: 600000, words: 3000, mode: 'rsvp' },
    { at: day(3), ms: 600000, words: 1000, mode: 'rsvp' },
  ];

  it('okunan günlerin ortalamasıyla tahmin eder', () => {
    expect(averageWordsPerReadingDay(sessions, NOW)).toBe(2000);
    expect(finishEstimateDays(9000, sessions, NOW)).toBe(5);
  });

  it('veri yoksa tahmin etmez', () => {
    expect(finishEstimateDays(5000, [], NOW)).toBeNull();
  });

  it('iki haftadan eski okumaları saymaz', () => {
    expect(averageWordsPerReadingDay([{ at: day(20), ms: 1, words: 500, mode: 'rsvp' }], NOW)).toBeNull();
  });

  it('bitmişse sıfır gün', () => {
    expect(finishEstimateDays(0, sessions, NOW)).toBe(0);
  });
});

describe('booksFinishedInYear', () => {
  it('yalnızca bu yıl biten uzun dokümanları sayar', () => {
    const books = [
      { wordCount: 60000, finished: true, finishedAt: day(10) },
      { wordCount: 60000, finished: true, finishedAt: new Date(2024, 5, 1).getTime() },
      { wordCount: 800, finished: true, finishedAt: day(1) },
      { wordCount: 60000, finished: false },
    ];
    expect(booksFinishedInYear(books, NOW)).toBe(1);
  });
});

describe('yearlyGoalStatus', () => {
  it('kalan kitabı ve haftayı verir', () => {
    const status = yearlyGoalStatus(6, 12, NOW);
    expect(status.remaining).toBe(6);
    expect(status.weeksLeft).toBeGreaterThan(9);
    // Ekim ortasında 12 kitabın ~9'u beklenir; 6 geride
    expect(status.onTrack).toBe(false);
  });
});
