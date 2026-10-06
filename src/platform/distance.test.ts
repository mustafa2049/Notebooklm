import { describe, expect, it } from 'vitest';
import { calibrateFocal, distanceMm, focalFromFov, irisWidthPx, REF_WIDTH } from './distance';

describe('face distance', () => {
  it('derives focal length from field of view', () => {
    // 60° yatay açı, 640 px → f = 320 / tan(30°) ≈ 554 px
    expect(focalFromFov(60)).toBeCloseTo(554.3, 0);
  });

  it('estimates distance from iris width', () => {
    const f = focalFromFov(60);
    // 40 cm'de iris ≈ f × 11.7 / 400 ≈ 16.2 px
    const iris = (f * 11.7) / 400;
    expect(distanceMm(iris, REF_WIDTH, f)).toBeCloseTo(400, 6);
    // Kare iki kat genişse iris de iki kat görünür → aynı mesafe
    expect(distanceMm(iris * 2, REF_WIDTH * 2, f)).toBeCloseTo(400, 6);
  });

  it('calibration inverts the distance formula', () => {
    const f = calibrateFocal(20, 1280, 400);
    expect(distanceMm(20, 1280, f)).toBeCloseTo(400, 6);
  });

  it('reads the larger iris width from landmarks', () => {
    const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    lm[469] = { x: 0.4, y: 0.5 };
    lm[471] = { x: 0.42, y: 0.5 }; // 0.02 × 640 = 12.8 px
    lm[474] = { x: 0.6, y: 0.5 };
    lm[476] = { x: 0.625, y: 0.5 }; // 16 px
    expect(irisWidthPx(lm, 640, 480)).toBeCloseTo(16, 6);
    expect(irisWidthPx([], 640, 480)).toBeNull();
  });
});
