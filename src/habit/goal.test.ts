import { describe, expect, it } from 'vitest';
import { formatClock, goalProgress, remainingMinutes } from './goal';

describe('goalProgress', () => {
  it('hedef yoksa etkin değil', () => {
    expect(goalProgress(500, 0)).toEqual({ ratio: 0, remaining: 0, done: false, active: false });
  });

  it('yarısına gelindiğinde oran 0,5', () => {
    const progress = goalProgress(1000, 2000);
    expect(progress.ratio).toBeCloseTo(0.5, 6);
    expect(progress.remaining).toBe(1000);
    expect(progress.done).toBe(false);
  });

  it('hedef aşıldığında oran 1’de kalır ve kalan sıfırlanır', () => {
    const progress = goalProgress(5000, 2000);
    expect(progress.ratio).toBe(1);
    expect(progress.remaining).toBe(0);
    expect(progress.done).toBe(true);
  });

  it('tam hedefte tamamlanmış sayılır', () => {
    expect(goalProgress(2000, 2000).done).toBe(true);
  });
});

describe('remainingMinutes', () => {
  it('hedef hızda kalan süreyi verir', () => {
    expect(remainingMinutes(900, 300)).toBe(3);
  });

  it('çok az kelime kaldıysa en az 1 dakika der', () => {
    expect(remainingMinutes(10, 300)).toBe(1);
  });

  it('kalan yoksa 0', () => {
    expect(remainingMinutes(0, 300)).toBe(0);
  });
});

describe('formatClock', () => {
  it('iki hane ile yazar', () => {
    expect(formatClock(20, 5)).toBe('20:05');
    expect(formatClock(9, 0)).toBe('09:00');
  });
});
