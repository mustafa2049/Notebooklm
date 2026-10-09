import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  booksByYear,
  buildYearReport,
  finishedBooks,
  hoursLabel,
  yearSvg,
  yearText,
} from './yearReport';

const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).getTime();

describe('finishedBooks', () => {
  const library = [
    { meta: { id: 'a', title: 'Uzun kitap', wordCount: 60000 }, progress: { finished: true, finishedAt: at(2026, 3, 1) } },
    { meta: { id: 'b', title: 'Kısa makale', wordCount: 900 }, progress: { finished: true, finishedAt: at(2026, 4, 1) } },
    { meta: { id: 'c', title: 'Yarım', wordCount: 40000 }, progress: { finished: false } },
    { meta: { id: 'd', title: 'Puanlı', wordCount: 30000 }, progress: { finished: true, finishedAt: at(2026, 5, 1) } },
  ];
  const journal = [
    { docId: 'd', title: 'Puanlı', wordCount: 30000, finishedAt: at(2026, 5, 2), rating: 5, note: 'Çok iyi' },
    // Kütüphaneden silinmiş ama günlükte
    { docId: 'x', title: 'Silinen', wordCount: 20000, finishedAt: at(2025, 12, 30), rating: 3, note: '' },
  ];

  it('günlük + bitmiş kitaplar; kısa metin ve yarım kalan yok; en yeni önce', () => {
    const books = finishedBooks(journal, library);
    expect(books.map((book) => book.docId)).toEqual(['d', 'a', 'x']);
    expect(books[0]).toMatchObject({ rating: 5, note: 'Çok iyi' });
  });

  it('yıllara ayırıyor', () => {
    const groups = booksByYear(finishedBooks(journal, library));
    expect(groups.map((group) => [group.year, group.books.length])).toEqual([
      [2026, 2],
      [2025, 1],
    ]);
  });
});

describe('buildYearReport', () => {
  const sessions = [
    { at: at(2026, 1, 1), ms: 30 * 60000, words: 6000, mode: 'page' },
    { at: at(2026, 1, 2), ms: 20 * 60000, words: 4000, mode: 'rsvp' },
    { at: at(2026, 1, 4), ms: 10 * 60000, words: 2000, mode: 'page' },
    { at: at(2026, 2, 1), ms: 5 * 60000, words: 1000, mode: 'listen' },
    { at: at(2025, 12, 31), ms: 99 * 60000, words: 99999, mode: 'page' },
  ];
  const books = [
    { docId: 'a', title: 'A', wordCount: 1, finishedAt: at(2026, 3, 1), rating: 4, note: '' },
    { docId: 'b', title: 'B', wordCount: 1, finishedAt: at(2026, 6, 1), rating: 4, note: '' },
    { docId: 'c', title: 'C', wordCount: 1, finishedAt: at(2025, 6, 1), rating: 5, note: '' },
  ];
  const highlights = [
    { sentence: 'Notsuz yeni alıntı.', docTitle: 'A', createdAt: at(2026, 9, 1) },
    { sentence: 'Notlu alıntı.', docTitle: 'B', note: 'güzel', createdAt: at(2026, 2, 1) },
    { sentence: 'Geçen yılın alıntısı.', docTitle: 'C', note: 'x', createdAt: at(2025, 2, 1) },
  ];

  it('yalnızca o yılın oturumları ve kitapları', () => {
    const report = buildYearReport({ year: 2026, sessions, books, highlights });
    expect(report).toMatchObject({ year: 2026, books: 2, minutes: 65, words: 13000, days: 4 });
    // 1, 2, 4 Ocak: tek gün boşluk seriyi bozmaz → 3; 1 Şubat ayrı
    expect(report.longestStreak).toBe(3);
  });

  it('yılın kitabı: en yüksek puan, eşitlikte en son biten; alıntı: notlu önce', () => {
    const report = buildYearReport({ year: 2026, sessions, books, highlights });
    expect(report.topBook).toEqual({ title: 'B', rating: 4 });
    expect(report.quote).toEqual({ sentence: 'Notlu alıntı.', title: 'B' });
  });

  it('veri yoksa boş ama geçerli', () => {
    const report = buildYearReport({ year: 2030, sessions, books, highlights });
    expect(report).toMatchObject({ books: 0, minutes: 0, words: 0, days: 0, longestStreak: 0, topBook: null, quote: null });
    expect(yearText(report)).toContain('0 kitap');
  });

  it('kart geçerli SVG; metin özeti alıntıyı içeriyor', () => {
    const report = buildYearReport({ year: 2026, sessions, books, highlights });
    const svg = yearSvg(report, { bg: '#000', surface: '#111', text: '#fff', dim: '#aaa', accent: '#f80' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Okuma yılım · 2026');
    expect(svg).toContain('★★★★');
    expect(() => new Script(`(${JSON.stringify(svg)})`)).not.toThrow();
    expect(yearText(report)).toContain('“Notlu alıntı.”');
  });

  it('özel karakterler SVG içinde kaçırılıyor', () => {
    const report = buildYearReport({
      year: 2026,
      sessions,
      books: [{ docId: 'x', title: 'Tom & Jerry <1>', wordCount: 1, finishedAt: at(2026, 1, 1), rating: 3, note: '' }],
      highlights: [],
    });
    const svg = yearSvg(report, { bg: '#000', surface: '#111', text: '#fff', dim: '#aaa', accent: '#f80' });
    expect(svg).toContain('Tom &amp; Jerry &lt;1&gt;');
  });
});

describe('yardımcılar', () => {
  it('süre etiketi', () => {
    expect(hoursLabel(45)).toBe('45 dk');
    expect(hoursLabel(120)).toBe('2 sa');
    expect(hoursLabel(125)).toBe('2 sa 5 dk');
  });

});
