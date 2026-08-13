import { describe, expect, it } from 'vitest';
import { addUsage, EMPTY_TOTALS, estimateCost, formatCost, formatTokens } from './cost';

const prices = { inputPerMillion: 3, outputPerMillion: 15 };

describe('estimateCost', () => {
  it('token sayısını fiyatla çarpar', () => {
    const cost = estimateCost({ inputTokens: 1_000_000, outputTokens: 100_000 }, prices);
    expect(cost).toBeCloseTo(3 + 1.5, 6);
  });

  it('fiyat girilmemişse tahmin üretmez', () => {
    // "0 dolar" göstermek yanıltıcı olurdu; hiç göstermiyoruz
    expect(
      estimateCost({ inputTokens: 5000, outputTokens: 500 }, { inputPerMillion: 0, outputPerMillion: 0 })
    ).toBeNull();
  });

  it('tek yönlü fiyat girildiyse yine hesaplar', () => {
    const cost = estimateCost(
      { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      { inputPerMillion: 0, outputPerMillion: 15 }
    );
    expect(cost).toBeCloseTo(15, 6);
  });
});

describe('addUsage', () => {
  it('çağrı ve token toplamlarını biriktirir', () => {
    let totals = EMPTY_TOTALS;
    totals = addUsage(totals, { inputTokens: 1000, outputTokens: 200 }, prices);
    totals = addUsage(totals, { inputTokens: 500, outputTokens: 100 }, prices);
    expect(totals.calls).toBe(2);
    expect(totals.inputTokens).toBe(1500);
    expect(totals.outputTokens).toBe(300);
    expect(totals.costUsd).toBeGreaterThan(0);
  });

  it('fiyat yoksa maliyeti sıfırda tutar ama sayacı ilerletir', () => {
    const totals = addUsage(
      EMPTY_TOTALS,
      { inputTokens: 1000, outputTokens: 200 },
      { inputPerMillion: 0, outputPerMillion: 0 }
    );
    expect(totals.costUsd).toBe(0);
    expect(totals.inputTokens).toBe(1000);
  });
});

describe('biçimleme', () => {
  it('binleri kısaltır', () => {
    expect(formatTokens(940)).toBe('940');
    expect(formatTokens(12_400)).toBe('12,4 B');
    expect(formatTokens(120_000)).toBe('120 B');
  });

  it('küçük tutarlarda dört hane gösterir', () => {
    expect(formatCost(0.0042)).toBe('$0,0042');
    expect(formatCost(2.5)).toBe('$2,50');
    expect(formatCost(null)).toBeNull();
  });
});
