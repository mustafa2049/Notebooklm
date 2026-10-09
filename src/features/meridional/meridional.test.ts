import { describe, expect, it } from 'vitest';
import { anisotropy, axisToScreenDeg, directionName, InterleavedStaircases, orientationRad, principalMeridians, weakest } from './meridional';

describe('meridional', () => {
  it('maps prescription axes to on-screen line angles', () => {
    expect(axisToScreenDeg(5)).toBe(175);
    expect(axisToScreenDeg(39)).toBe(141);
    expect(axisToScreenDeg(180)).toBe(0);
    expect(axisToScreenDeg(90)).toBe(90);
    expect(principalMeridians({ sph: 2.5, cyl: -1.75, axis: 5 })).toEqual([175, 85]);
    expect(principalMeridians({ sph: 2, cyl: -1, axis: 39 })).toEqual([141, 51]);
    expect(principalMeridians({ sph: 1, cyl: 0, axis: 0 })).toEqual([0, 90]);
    expect(principalMeridians()).toEqual([0, 90]);
  });

  it('converts to Gabor orientation and names directions', () => {
    expect(orientationRad(90)).toBeCloseTo(0);
    expect(orientationRad(0)).toBeCloseTo(Math.PI / 2);
    expect(orientationRad(45)).toBeCloseTo(Math.PI / 4); // "/" çizgiler
    expect(directionName(175)).toBe('yatay');
    expect(directionName(85)).toBe('dikey');
    expect(directionName(51)).toBe('eğik ⟋');
    expect(directionName(141)).toBe('eğik ⟍');
  });

  it('interleaves staircases and finds the weaker direction', () => {
    // Sentetik gözlemci: dikeyde eşik %2, yatayda %8.
    const truth: Record<number, number> = { 0: 0.08, 90: 0.02 };
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const s = new InterleavedStaircases([0, 90], {}, rnd);
    let guard = 0;
    while (!s.done && guard++ < 1000) {
      const { deg, contrast } = s.next();
      s.respond(deg, contrast >= truth[deg]);
    }
    expect(s.done).toBe(true);
    const t = s.thresholds();
    const h = t.find((x) => x.deg === 0)!.threshold;
    const v = t.find((x) => x.deg === 90)!.threshold;
    expect(h).toBeGreaterThan(0.05);
    expect(h).toBeLessThan(0.13);
    expect(v).toBeGreaterThan(0.012);
    expect(v).toBeLessThan(0.033);
    expect(weakest(t)?.deg).toBe(0);
    expect(anisotropy(t)).toBeGreaterThan(2);
  });
});
