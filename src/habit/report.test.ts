import { describe, expect, it } from 'vitest';
import { buildWeeklyReport, reportSvg, reportText, weekRangeLabel } from './report';

// 15 Ekim 2025 Çarşamba
const NOW = new Date(2025, 9, 15, 12).getTime();

function at(offset: number): number {
  return new Date(2025, 9, 15 - offset, 10).getTime();
}

const palette = { bg: '#000', surface: '#111', text: '#fff', dim: '#999', accent: '#f80' };

describe('weekRangeLabel', () => {
  it('pazartesiden pazara aralık verir', () => {
    expect(weekRangeLabel(NOW)).toBe('13–19 Ekim');
  });

  it('ay değişiyorsa iki ayı da yazar', () => {
    expect(weekRangeLabel(new Date(2025, 9, 1).getTime())).toBe('29 Eylül – 5 Ekim');
  });
});

describe('buildWeeklyReport', () => {
  const report = buildWeeklyReport({
    sessions: [
      { at: at(0), ms: 600000, words: 3000, mode: 'rsvp' },
      { at: at(1), ms: 300000, words: 1500, mode: 'flow' },
      { at: at(5), ms: 1200000, words: 5000, mode: 'rsvp' },
    ],
    now: NOW,
    streak: 4,
    effectiveWpm: 251.6,
    change: 0.124,
    level: 'Orta',
    badges: 3,
  });

  it('bu haftanın toplamlarını verir', () => {
    expect(report).toMatchObject({ minutes: 15, days: 2, words: 4500, lastWeekMinutes: 20, effectiveWpm: 252 });
  });

  it('paylaşım metni sayıları içerir', () => {
    const text = reportText(report);
    expect(text).toContain('15 dakika okudum, 2/7 gün');
    expect(text).toContain('4.500 kelime');
    expect(text).toContain('252 kel/dk (+%12)');
  });

  it('ölçüm yoksa hız satırı yok', () => {
    expect(reportText({ ...report, effectiveWpm: null })).not.toContain('Efektif');
  });

  it('SVG geçerli ve metinleri kaçışlı', () => {
    const svg = reportSvg({ ...report, level: 'A<B' }, palette);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('A&lt;B');
    expect(svg).not.toContain('A<B');
  });
});
