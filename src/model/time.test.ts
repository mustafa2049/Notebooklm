import { describe, expect, it } from 'vitest';
import { dayKey, minutesByDay, streak } from './time';

const at = (d: string, h: number, m = 0) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();

describe('minutesByDay', () => {
  it('sums sessions on the same day', () => {
    const map = minutesByDay(
      [
        { start: at('2026-03-01', 9), end: at('2026-03-01', 10) },
        { start: at('2026-03-01', 14), end: at('2026-03-01', 14, 30) },
      ],
      at('2026-03-01', 20),
    );
    expect(map.get('2026-03-01')).toBeCloseTo(90);
  });

  it('splits a session across midnight', () => {
    const map = minutesByDay([{ start: at('2026-03-01', 23), end: at('2026-03-02', 1) }], at('2026-03-02', 2));
    expect(map.get('2026-03-01')).toBeCloseTo(60);
    expect(map.get('2026-03-02')).toBeCloseTo(60);
  });

  it('includes the running timer', () => {
    const now = at('2026-03-01', 12);
    const map = minutesByDay([], now, at('2026-03-01', 11, 15));
    expect(map.get(dayKey(now))).toBeCloseTo(45);
  });
});

describe('streak', () => {
  it('counts consecutive days that met the goal', () => {
    const map = new Map([
      ['2026-03-01', 130],
      ['2026-03-02', 120],
      ['2026-03-03', 125],
    ]);
    expect(streak(map, 120, at('2026-03-03', 22))).toBe(3);
  });

  it('starts from yesterday when today is not yet complete', () => {
    const map = new Map([
      ['2026-03-01', 130],
      ['2026-03-02', 120],
      ['2026-03-03', 20],
    ]);
    expect(streak(map, 120, at('2026-03-03', 10))).toBe(2);
  });

  it('breaks on a missed day', () => {
    const map = new Map([
      ['2026-03-01', 130],
      ['2026-03-03', 125],
    ]);
    expect(streak(map, 120, at('2026-03-03', 22))).toBe(1);
  });
});
