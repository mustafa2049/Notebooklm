import { describe, expect, it } from 'vitest';
import { FONT_SCALE_MAX, FONT_SCALE_MIN, stepFontScale } from './typography';

describe('stepFontScale', () => {
  it('0,1 adımla ilerler ve kayan nokta hatası biriktirmez', () => {
    let scale = 1;
    for (let i = 0; i < 7; i++) scale = stepFontScale(scale, 1);
    expect(scale).toBe(1.7);
    for (let i = 0; i < 7; i++) scale = stepFontScale(scale, -1);
    expect(scale).toBe(1);
  });

  it('sınırlarda durur', () => {
    expect(stepFontScale(FONT_SCALE_MAX, 1)).toBe(FONT_SCALE_MAX);
    expect(stepFontScale(FONT_SCALE_MIN, -1)).toBe(FONT_SCALE_MIN);
  });
});
