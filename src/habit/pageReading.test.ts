import { describe, expect, it } from 'vitest';
import { MIN_PAGE_CAP_MS, minReadMs, pageCredit, pageDwellCap } from './pageReading';

describe('pageCredit', () => {
  it('normal okumada süre ve kelimeler sayılır', () => {
    // 150 kelime, 40 sn: dakikada 225 kelime
    expect(pageCredit(40_000, 150)).toEqual({ ms: 40_000, words: 150 });
  });

  it('açık bırakılan ekranda süre yavaş okuma süresiyle sınırlanır', () => {
    // 150 kelime en yavaş 50 kel/dk ile 3 dakika
    expect(pageCredit(30 * 60_000, 150)).toEqual({ ms: 180_000, words: 150 });
  });

  it('kısa sayfada bile en az 30 sn sayılabilir', () => {
    expect(pageDwellCap(10)).toBe(MIN_PAGE_CAP_MS);
    expect(pageCredit(25_000, 10).ms).toBe(25_000);
  });

  it('hızla çevrilen sayfanın kelimeleri sayılmaz', () => {
    // 150 kelime 2 sn: dakikada 4500 kelime — okunmamış
    expect(pageCredit(2_000, 150)).toEqual({ ms: 2_000, words: 0 });
    expect(minReadMs(150)).toBe(9_000);
    expect(pageCredit(9_000, 150).words).toBe(150);
  });

  it('negatif ya da boş girdide sıfır', () => {
    expect(pageCredit(-5, 100)).toEqual({ ms: 0, words: 0 });
    expect(pageCredit(10_000, 0)).toEqual({ ms: 10_000, words: 0 });
  });
});
