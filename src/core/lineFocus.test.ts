import { describe, expect, it } from 'vitest';
import { bandStart, focusBand, LAST, lineTops, nextLineFocus, stepFocus } from './lineFocus';

describe('lineTops', () => {
  it('paragraf yüksekliğinden satırlar; paragraf aralığı korunur', () => {
    // 3 satırlık paragraf, 10 px boşluk, 2 satırlık paragraf (satır 30 px)
    expect(lineTops([{ y: 100, height: 60 }, { y: 0, height: 90 }], 30)).toEqual([0, 30, 60, 100, 130]);
  });

  it('ölçüm yuvarlama hatası satır sayısını bozmaz; tek satırdan az olmaz', () => {
    expect(lineTops([{ y: 0, height: 89.6 }], 30)).toEqual([0, 30, 60]);
    expect(lineTops([{ y: 0, height: 4 }], 30)).toEqual([0]);
    expect(lineTops([{ y: 0, height: 60 }], 0)).toEqual([]);
  });
});

describe('bandStart / stepFocus', () => {
  it('LAST son satırlara, taşan değer sınıra çekilir', () => {
    expect(bandStart(LAST, 10, 3)).toBe(7);
    expect(bandStart(LAST, 10, 1)).toBe(9);
    expect(bandStart(12, 10, 1)).toBe(9);
    expect(bandStart(0, 2, 3)).toBe(0);
  });

  it('bir satır iner/çıkar', () => {
    expect(stepFocus(0, 10, 1, 1)).toEqual({ start: 1 });
    expect(stepFocus(5, 10, 3, -1)).toEqual({ start: 4 });
    expect(stepFocus(LAST, 10, 1, -1)).toEqual({ start: 8 });
  });

  it('sayfanın sonunda sonraki, başında önceki sayfa', () => {
    expect(stepFocus(9, 10, 1, 1)).toEqual({ turn: 1 });
    expect(stepFocus(7, 10, 3, 1)).toEqual({ turn: 1 });
    expect(stepFocus(0, 10, 1, -1)).toEqual({ turn: -1 });
    expect(stepFocus(LAST, 2, 3, 1)).toEqual({ turn: 1 });
    expect(stepFocus(0, 0, 1, 1)).toEqual({ turn: 1 });
  });
});

describe('focusBand', () => {
  const tops = [0, 30, 60, 100, 130];
  it('bandın üstü ve altı', () => {
    expect(focusBand(tops, 0, 1, 30)).toEqual({ top: 0, bottom: 30 });
    expect(focusBand(tops, 1, 3, 30)).toEqual({ top: 30, bottom: 130 });
    expect(focusBand(tops, LAST, 3, 30)).toEqual({ top: 60, bottom: 160 });
    expect(focusBand([], 0, 1, 30)).toBeNull();
  });
});

describe('nextLineFocus', () => {
  it('kapalı → 1 → 3 → kapalı', () => {
    expect(nextLineFocus(0)).toBe(1);
    expect(nextLineFocus(1)).toBe(3);
    expect(nextLineFocus(3)).toBe(0);
    expect(nextLineFocus(7)).toBe(0);
  });
});
