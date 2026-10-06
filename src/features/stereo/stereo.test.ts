import { describe, expect, it } from 'vitest';
import { arcsecForPx, availableLevels, disparityPx, rdsEyes, rdsPixels, StereoTestRun, stereoCategory } from './stereo';

describe('disparity conversion', () => {
  it('round-trips arcsec ↔ px', () => {
    const px = disparityPx(100, 400, 6.3, 3);
    expect(arcsecForPx(px, 400, 6.3, 3)).toBeCloseTo(100, 6);
  });
  it('a phone at 40 cm can show about 20″ per device pixel', () => {
    // 40 cm, 6.3 px/mm, DPR 3 → 1 px ≈ 0.053 mm ≈ 27″
    expect(arcsecForPx(1, 400, 6.3, 3)).toBeGreaterThan(20);
    expect(arcsecForPx(1, 400, 6.3, 3)).toBeLessThan(35);
  });
  it('drops levels that need less than one pixel or repeat a pixel value', () => {
    const lv = availableLevels(400, 3.8, 1);
    expect(lv.every((l) => l.px >= 1)).toBe(true);
    expect(new Set(lv.map((l) => l.px)).size).toBe(lv.length);
    expect(lv[0].arcsec).toBe(800);
  });
});

describe('random-dot stereogram', () => {
  const mask = (x: number, y: number) => x >= 20 && x < 40 && y >= 10 && y < 30;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // bgShift = 4: zemin 4 px, şekil 4 + 3 = 7 px kaydırılır
  const { left, right } = rdsEyes(60, 40, 2, mask, 3, rnd, 4);

  it('shifts the background by bgShift in one eye', () => {
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 56; x++) if (!mask(x, y)) expect(right[y * 60 + x]).toBe(left[y * 60 + x + 4]);
  });

  it('shifts the shape by bgShift + shift (relative disparity = shift)', () => {
    for (let y = 10; y < 30; y++)
      for (let x = 20; x < 40; x++) expect(right[y * 60 + x]).toBe(left[y * 60 + x + 7]);
  });

  it('gives no monocular colour cue: overlap rate is the same inside and outside the shape', () => {
    let seed2 = 7;
    const rnd2 = () => ((seed2 = (seed2 * 16807) % 2147483647) - 1) / 2147483646;
    const big = (x: number, y: number) => x >= 100 && x < 300 && y >= 100 && y < 300;
    const e = rdsEyes(400, 400, 2, big, 1, rnd2);
    const rate = (inside: boolean) => {
      let both = 0;
      let n = 0;
      for (let y = 0; y < 400; y++)
        for (let x = 0; x < 400; x++)
          if (big(x, y) === inside) {
            n++;
            both += e.left[y * 400 + x] & e.right[y * 400 + x];
          }
      return both / n;
    };
    // Bağımsız %50 yoğunlukta iki desen → çakışma ≈ %25, içerde ve dışarıda aynı
    expect(Math.abs(rate(true) - rate(false))).toBeLessThan(0.02);
    expect(rate(false)).toBeGreaterThan(0.2);
    expect(rate(false)).toBeLessThan(0.3);
  });

  it('colours each eye with its own filter colour, additively', () => {
    const px = rdsPixels({ left: new Uint8Array([1, 0, 1]), right: new Uint8Array([0, 1, 1]) }, [255, 0, 0], [0, 255, 255]);
    expect([...px.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...px.slice(4, 8)]).toEqual([0, 255, 255, 255]);
    expect([...px.slice(8, 12)]).toEqual([255, 255, 255, 255]);
  });
});

describe('StereoTestRun', () => {
  const levels = [
    { arcsec: 800, px: 30 },
    { arcsec: 400, px: 15 },
    { arcsec: 100, px: 4 },
  ];
  it('passes levels with 2 correct and stops after 2 wrong', () => {
    const t = new StereoTestRun(levels);
    t.answer(true);
    t.answer(true);
    expect(t.current.arcsec).toBe(400);
    t.answer(true);
    t.answer(false);
    t.answer(false);
    expect(t.done).toBe(true);
    expect(t.passed).toBe(800);
  });
  it('reports null when even the largest disparity is not seen', () => {
    const t = new StereoTestRun(levels);
    t.answer(false);
    t.answer(false);
    expect(t.done).toBe(true);
    expect(t.passed).toBeNull();
    expect(stereoCategory(t.passed).tone).toBe('low');
  });
  it('flags reaching the smallest displayable level', () => {
    const t = new StereoTestRun(levels);
    for (let i = 0; i < 6; i++) t.answer(true);
    expect(t.done).toBe(true);
    expect(t.reachedBest).toBe(true);
    expect(t.passed).toBe(100);
    expect(stereoCategory(40).tone).toBe('good');
  });
});
