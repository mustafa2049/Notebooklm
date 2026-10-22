import { describe, expect, it } from 'vitest';
import { CALIBRATION_TEXT, countWords, lengthScaleFor, measuredWpm, slowScale } from './rate';

describe('rate', () => {
  it('ölçülen hız', () => {
    expect(measuredWpm(30, 12000)).toBe(150);
    expect(measuredWpm(0, 1000)).toBe(0);
    expect(measuredWpm(10, 0)).toBe(0);
    expect(countWords(CALIBRATION_TEXT)).toBe(22);
    expect(countWords('— merhaba , dünya')).toBe(2);
  });

  it('hedef hıza göre ölçek; iki kattan fazla değişmez', () => {
    expect(lengthScaleFor(300, 150)).toBe(0.5);
    expect(lengthScaleFor(150, 150)).toBe(1);
    expect(lengthScaleFor(200, 160)).toBe(0.8);
    expect(lengthScaleFor(1000, 150)).toBe(0.5);
    expect(lengthScaleFor(50, 150)).toBe(2);
    // ölçüm yoksa varsayılan; yapılandırmanın ölçeği çarpan
    expect(lengthScaleFor(150, undefined)).toBe(1);
    expect(lengthScaleFor(150, 150, 1.2)).toBe(1.2);
  });

  it('yavaş dinleme', () => {
    expect(slowScale()).toBe(1.15);
    expect(slowScale(1.9)).toBe(2);
  });
});
