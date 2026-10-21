import { describe, expect, it } from 'vitest';
import { LAST } from './lineFocus';
import { pairPages, spreadBand, spreadPages, stepSpreadFocus } from './spreads';

describe('pairPages', () => {
  it('ikişer birleşir; tek kalan son sayfa yalnız', () => {
    const pages = [
      { start: 0, end: 10 },
      { start: 10, end: 22 },
      { start: 22, end: 30 },
    ];
    expect(pairPages(pages)).toEqual([
      { start: 0, end: 22, split: 10 },
      { start: 22, end: 30 },
    ]);
    expect(pairPages([])).toEqual([]);
  });

  it('etiket sayfa numaraları', () => {
    expect(spreadPages(0, 10)).toBe('1–2');
    expect(spreadPages(2, 10)).toBe('5–6');
    expect(spreadPages(4, 9)).toBe('9');
  });
});

describe('spreadBand', () => {
  it('birleşik sıradan sütun ve sütun içi başlangıç', () => {
    // sol 10, sağ 8 satır
    expect(spreadBand(0, 10, 8, 1)).toEqual({ column: 0, start: 0 });
    expect(spreadBand(9, 10, 8, 1)).toEqual({ column: 0, start: 9 });
    expect(spreadBand(10, 10, 8, 1)).toEqual({ column: 1, start: 0 });
    expect(spreadBand(15, 10, 8, 3)).toEqual({ column: 1, start: 5 });
    // sınıra taşan 3 satırlık bant solda kalır
    expect(spreadBand(9, 10, 8, 3)).toEqual({ column: 0, start: 7 });
    expect(spreadBand(LAST, 10, 8, 3)).toEqual({ column: 1, start: LAST });
  });

  it('tek sayfada sol sütun', () => {
    expect(spreadBand(4, 10, 0, 1)).toEqual({ column: 0, start: 4 });
    expect(spreadBand(LAST, 10, 0, 1)).toEqual({ column: 0, start: LAST });
  });
});

describe('stepSpreadFocus', () => {
  it('sol sütunun sonundan sağ sütunun başına, geri de', () => {
    expect(stepSpreadFocus(9, 10, 8, 1, 1)).toEqual({ start: 10 });
    expect(stepSpreadFocus(10, 10, 8, 1, -1)).toEqual({ start: 9 });
    expect(stepSpreadFocus(7, 10, 8, 3, 1)).toEqual({ start: 10 });
    expect(stepSpreadFocus(10, 10, 8, 3, -1)).toEqual({ start: 7 });
  });

  it('sağ sütunun sonunda sonraki, solun başında önceki sayfa', () => {
    expect(stepSpreadFocus(17, 10, 8, 1, 1)).toEqual({ turn: 1 });
    expect(stepSpreadFocus(15, 10, 8, 3, 1)).toEqual({ turn: 1 });
    expect(stepSpreadFocus(0, 10, 8, 1, -1)).toEqual({ turn: -1 });
    expect(stepSpreadFocus(LAST, 10, 8, 1, -1)).toEqual({ start: 16 });
  });

  it('sağ sütun yoksa tek sayfa kuralı', () => {
    expect(stepSpreadFocus(9, 10, 0, 1, 1)).toEqual({ turn: 1 });
    expect(stepSpreadFocus(3, 10, 0, 1, 1)).toEqual({ start: 4 });
  });
});
