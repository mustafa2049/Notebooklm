import { describe, expect, it } from 'vitest';
import { applyReview, dueCount, dueDelayMs, isDue, sortForReview } from './review';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function item(patch: Partial<Parameters<typeof isDue>[0]> = {}) {
  return { known: false, reviews: 0, createdAt: NOW, ...patch };
}

describe('dueDelayMs', () => {
  it('yeni eklenen kelimeyi hemen sorar', () => {
    expect(dueDelayMs(item())).toBe(0);
  });

  it('bilinmeyen kelimeyi aynı gün içinde tekrar sorar', () => {
    expect(dueDelayMs(item({ reviews: 3 }))).toBeLessThan(DAY);
  });

  it('bilinen kelimede aralık her tekrarla iki katına çıkar', () => {
    expect(dueDelayMs(item({ known: true, reviews: 1 }))).toBe(DAY);
    expect(dueDelayMs(item({ known: true, reviews: 2 }))).toBe(2 * DAY);
    expect(dueDelayMs(item({ known: true, reviews: 4 }))).toBe(8 * DAY);
  });

  it('aralık 30 günde tavan yapar', () => {
    expect(dueDelayMs(item({ known: true, reviews: 20 }))).toBe(30 * DAY);
  });
});

describe('isDue', () => {
  it('bekleme süresi geçmemiş bilinen kelimeyi sormaz', () => {
    const known = item({ known: true, reviews: 2, lastReviewAt: NOW });
    expect(isDue(known, NOW + DAY)).toBe(false);
    expect(isDue(known, NOW + 3 * DAY)).toBe(true);
  });
});

describe('sortForReview', () => {
  it('zamanı gelmiş bilinmeyenleri en öne alır', () => {
    const items = [
      { ...item({ known: true, reviews: 1, lastReviewAt: NOW - 5 * DAY }), id: 'bilinen' },
      { ...item({ known: false, reviews: 1, lastReviewAt: NOW - 5 * DAY }), id: 'bilinmeyen' },
      { ...item({ known: true, reviews: 3, lastReviewAt: NOW }), id: 'beklemede' },
    ];
    expect(sortForReview(items, NOW).map((entry) => entry.id)).toEqual([
      'bilinmeyen',
      'bilinen',
      'beklemede',
    ]);
  });

  it('eşitlikte en eski görüleni öne alır', () => {
    const items = [
      { ...item({ lastReviewAt: NOW - DAY }), id: 'yeni' },
      { ...item({ lastReviewAt: NOW - 10 * DAY }), id: 'eski' },
    ];
    expect(sortForReview(items, NOW)[0].id).toBe('eski');
  });

  it('girdi dizisini değiştirmez', () => {
    const items = [item({ known: true }), item()];
    const copy = [...items];
    sortForReview(items, NOW);
    expect(items).toEqual(copy);
  });
});

describe('applyReview', () => {
  it('bildiğinde sayacı arttırır', () => {
    const next = applyReview(item({ reviews: 2 }), true, NOW);
    expect(next).toMatchObject({ known: true, reviews: 3, lastReviewAt: NOW });
  });

  it('bilmediğinde sayacı sıfırlar', () => {
    const next = applyReview(item({ known: true, reviews: 5 }), false, NOW);
    expect(next).toMatchObject({ known: false, reviews: 0 });
  });
});

describe('dueCount', () => {
  it('yalnızca zamanı gelenleri sayar', () => {
    const items = [
      item(),
      item({ known: true, reviews: 1, lastReviewAt: NOW }),
      item({ known: true, reviews: 1, lastReviewAt: NOW - 2 * DAY }),
    ];
    expect(dueCount(items, NOW)).toBe(2);
  });
});
