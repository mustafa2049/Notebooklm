import { describe, expect, it } from 'vitest';
import { Staircase } from './staircase';

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2AFC Weibull gözlemci: şans düzeyi %50. */
const observer = (alpha: number, beta: number, rnd: () => number) => (c: number) =>
  rnd() < 0.5 + 0.5 * (1 - Math.exp(-Math.pow(c / alpha, beta)));

describe('Staircase', () => {
  it('converges near the 79% point of a simulated observer', () => {
    const alpha = 0.02;
    const results: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = mulberry32(seed);
      const see = observer(alpha, 3, rnd);
      const s = new Staircase({ maxReversals: 12, maxTrials: 150 });
      while (!s.done) s.respond(see(s.contrast));
      results.push(Math.log10(s.threshold()));
    }
    const meanLog = results.reduce((a, b) => a + b, 0) / results.length;
    // Beklenen ≈ 0.96·alpha; ortalama log eşik 0.15 log birim içinde olmalı.
    expect(Math.abs(meanLog - Math.log10(alpha * 0.96))).toBeLessThan(0.15);
  });

  it('distinguishes a better observer from a worse one', () => {
    const run = (alpha: number) => {
      const s = new Staircase();
      const see = observer(alpha, 3, mulberry32(7));
      while (!s.done) s.respond(see(s.contrast));
      return s.threshold();
    };
    expect(run(0.01)).toBeLessThan(run(0.08));
  });

  it('decreases after 3 correct and increases after 1 wrong', () => {
    const s = new Staircase({ start: 0.1 });
    s.respond(true);
    s.respond(true);
    expect(s.contrast).toBeCloseTo(0.1);
    s.respond(true);
    expect(s.contrast).toBeLessThan(0.1);
    const c = s.contrast;
    s.respond(false);
    expect(s.contrast).toBeGreaterThan(c);
  });

  it('stays within bounds and stops at the trial limit', () => {
    const s = new Staircase({ maxTrials: 30 });
    while (!s.done) s.respond(false);
    expect(s.contrast).toBeLessThanOrEqual(1);
    expect(s.trials).toBe(30);
  });
});
