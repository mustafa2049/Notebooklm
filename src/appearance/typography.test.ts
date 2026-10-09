import { describe, expect, it } from 'vitest';
import { FONT_SCALE_MAX, FONT_SCALE_MIN, readingLayout, stepFontScale } from './typography';

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

describe('readingLayout', () => {
  const base = { pageMargin: 'normal' as const, justify: false, letterSpacing: 0, wordSpacing: 0, hyphenate: false };

  it('varsayılan düzen: normal kenar, sola yaslı, ek aralık yok', () => {
    expect(readingLayout(base)).toMatchObject({
      marginPx: 24,
      letterSpacingEm: 0,
      textAlign: 'left',
      hyphenate: false,
      extraWordSpace: 0,
    });
  });

  it('seçimleri karşılıklarına çeviriyor', () => {
    const layout = readingLayout({ pageMargin: 'wide', justify: true, letterSpacing: 2, wordSpacing: 1, hyphenate: true });
    expect(layout).toMatchObject({ marginPx: 40, letterSpacingEm: 0.1, textAlign: 'justify', hyphenate: true, extraWordSpace: 1 });
  });

  it('bozuk kayıtları sınırlara çekiyor', () => {
    const layout = readingLayout({ ...base, pageMargin: 'x' as never, letterSpacing: 9, wordSpacing: Number.NaN });
    expect(layout.marginPx).toBe(24);
    expect(layout.letterSpacingEm).toBe(0.1);
    expect(layout.extraWordSpace).toBe(0);
  });

  it('satır kırılmasını etkileyen her değişiklik anahtarı değiştiriyor', () => {
    const key = readingLayout(base).key;
    for (const change of [{ justify: true }, { letterSpacing: 1 }, { wordSpacing: 1 }, { hyphenate: true }, { pageMargin: 'narrow' as const }]) {
      expect(readingLayout({ ...base, ...change }).key).not.toBe(key);
    }
  });
});
