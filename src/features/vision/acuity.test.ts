import { describe, expect, it } from 'vitest';
import { AcuityTest, letterHeightMm, logMARForHeight, measurableRange, toDecimal, toSnellen6, toTenths } from './acuity';

describe('optotype size', () => {
  it('logMAR 0 at 3 m is about 4.36 mm tall', () => {
    expect(letterHeightMm(0, 3000)).toBeCloseTo(4.363, 2);
  });
  it('logMAR 1.0 is ten times larger', () => {
    expect(letterHeightMm(1, 3000) / letterHeightMm(0, 3000)).toBeCloseTo(10, 1);
  });
  it('inverts back to logMAR', () => {
    expect(logMARForHeight(letterHeightMm(0.4, 400), 400)).toBeCloseTo(0.4, 6);
  });
});

describe('conversions', () => {
  it('converts logMAR to decimal, tenths and Snellen', () => {
    expect(toDecimal(0.3)).toBe(0.5);
    expect(toTenths(0.3)).toBe('5/10');
    expect(toTenths(0)).toBe('10/10');
    expect(toSnellen6(0.3)).toBe('6/12');
    expect(toSnellen6(1)).toBe('6/60');
  });
});

describe('measurableRange', () => {
  it('covers the whole chart on a high-density phone at 40 cm', () => {
    // ~6.3 CSS px/mm, DPR 3, 390 px wide
    expect(measurableRange(400, 6.3, 3, 390)).toEqual({ best: -0.3, worst: 1 });
  });
  it('limits the smallest line on a low-density screen up close', () => {
    // 3.8 px/mm, DPR 1 → 5 px ≈ 1.3 mm → yaklaşık logMAR 0.35 → 0.4 satırı
    expect(measurableRange(400, 3.8, 1, 1000).best).toBe(0.4);
  });
  it('allows the full chart on a monitor at 3 m', () => {
    const r = measurableRange(3000, 3.8, 1, 1000);
    expect(r.worst).toBe(1);
    expect(r.best).toBeLessThanOrEqual(0.1);
  });
});

describe('AcuityTest', () => {
  it('scores letter by letter until a line fails', () => {
    const t = new AcuityTest(1.0, -0.3);
    // 1.0 … 0.4 satırları hatasız (7 satır × 5 = 35 doğru)
    for (let i = 0; i < 35; i++) t.answer(true);
    expect(t.line).toBe(0.3);
    // 0.3 satırında 2 doğru, 3 yanlış → test biter
    t.answer(true);
    t.answer(false);
    t.answer(true);
    t.answer(false);
    t.answer(false);
    expect(t.done).toBe(true);
    // 1.1 − 0.02 × 37 = 0.36
    expect(t.result()).toBe(0.36);
  });

  it('passes a line with 3 of 5 correct', () => {
    const t = new AcuityTest(0.5, -0.3);
    [true, false, true, false, true].forEach((c) => t.answer(c));
    expect(t.done).toBe(false);
    expect(t.line).toBe(0.4);
  });

  it('stops at the smallest displayable line', () => {
    const t = new AcuityTest(0.2, 0.1);
    for (let i = 0; i < 10; i++) t.answer(true);
    expect(t.done).toBe(true);
    expect(t.reachedBest).toBe(true);
    expect(t.result()).toBe(0.1);
  });
});
