import { describe, expect, it } from 'vitest';
import { dailyGoalStatus, formatClock, goalProgress, remainingMinutes } from './goal';

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

describe('dailyGoalStatus', () => {
  it('dakika hedefinde okuma süresini sayar', () => {
    const status = dailyGoalStatus({
      unit: 'minutes',
      goalMinutes: 10,
      goalWords: 0,
      todayMs: 4.5 * 60000,
      todayWords: 900,
      wpm: 300,
    });
    expect(status.doneValue).toBe(4);
    expect(status.minutesLeft).toBe(6);
    expect(status.ratio).toBeCloseTo(0.45, 6);
    expect(status.done).toBe(false);
  });

  it('kelime hedefinde kalan süreyi hedef hızından tahmin eder', () => {
    const status = dailyGoalStatus({
      unit: 'words',
      goalMinutes: 0,
      goalWords: 2000,
      todayMs: 0,
      todayWords: 1100,
      wpm: 300,
    });
    expect(status.remaining).toBe(900);
    expect(status.minutesLeft).toBe(3);
  });

  it('hedef sıfırsa etkin değil', () => {
    expect(
      dailyGoalStatus({ unit: 'minutes', goalMinutes: 0, goalWords: 0, todayMs: 0, todayWords: 0, wpm: 300 })
        .active
    ).toBe(false);
  });
});
