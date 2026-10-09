import { describe, expect, it } from 'vitest';
import { contrastForLevel, csCategory, dither, letterHeightMm, letterPixel, MAX_LOG_CS, nextLetter, PelliRobsonRun } from './contrast';

const run = (seesUpTo: number) => {
  const r = new PelliRobsonRun();
  let guard = 0;
  while (!r.done && guard++ < 100) r.answer(r.level <= seesUpTo);
  return r;
};

describe('contrast sensitivity', () => {
  it('scores letter by letter like Pelli-Robson', () => {
    expect(run(99).logCS).toBe(2.25);
    expect(run(99).reachedMax).toBe(true);
    // 0,00…1,50 düzeyleri (11 üçlü) okunur, 1,65'te iki yanlış
    expect(run(10).logCS).toBe(1.5);
    expect(run(-1).logCS).toBe(0);
    expect(MAX_LOG_CS).toBeCloseTo(2.25);
  });

  it('allows one miss per triplet', () => {
    const r = new PelliRobsonRun();
    r.answer(true);
    r.answer(false);
    r.answer(true);
    expect(r.done).toBe(false);
    expect(r.level).toBe(1);
    r.answer(false);
    r.answer(false);
    expect(r.done).toBe(true);
    expect(r.correct).toBe(2);
    expect(r.logCS).toBe(0);
  });

  it('computes contrast, pixel values and letter size', () => {
    expect(contrastForLevel(0)).toBe(1);
    expect(contrastForLevel(2)).toBeCloseTo(0.501, 3);
    expect(letterPixel(235, 1)).toBeCloseTo(0, 5);
    expect(letterPixel(235, 0)).toBeCloseTo(235, 5);
    const v = letterPixel(235, contrastForLevel(15));
    expect(v).toBeGreaterThan(233);
    expect(v).toBeLessThan(235);
    let sum = 0;
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20000; i++) sum += dither(v, rnd);
    expect(sum / 20000).toBeCloseTo(v, 1);
    expect(letterHeightMm(400)).toBeCloseTo(19.55, 1);
  });

  it('picks letters without repeats and categorises', () => {
    for (let i = 0; i < 50; i++) expect(['C', 'D']).not.toContain(nextLetter(['C', 'D']));
    expect(csCategory(1.8)).toBe('normal');
    expect(csCategory(1.55)).toBe('borderline');
    expect(csCategory(1.2)).toBe('reduced');
  });
});
