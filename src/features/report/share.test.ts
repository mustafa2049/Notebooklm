import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, profileDefaults } from '../../model/types';
import { decodeReport, encodeReport, reportUrl, type SharedReport } from './share';
import { buildSummary } from './summary';

const summary = buildSummary({
  profile: { ...profileDefaults(), id: 'p', name: 'Ayşe', anaglyph: defaultAnaglyph() },
  sessions: [{ id: 's', profileId: 'p', start: Date.parse('2026-03-01T09:00:00'), end: Date.parse('2026-03-01T11:00:00') }],
  results: [],
  gabor: [],
  visionTests: [{ id: 'v', profileId: 'p', at: Date.parse('2026-03-02T10:00:00'), eye: 'left', logMAR: 0.4, distanceCm: 40 }],
  stereoTests: [{ id: 'st', profileId: 'p', at: Date.parse('2026-03-02T10:00:00'), arcsec: 200, distanceCm: 40 }],
  diary: [{ id: 'd', profileId: 'p', day: '2026-03-02', symptoms: ['strain'], compliance: 'partial', note: 'Çocuk okulda bantı çıkardı ğüşıöç' }],
  from: Date.parse('2026-03-01T00:00:00'),
  now: Date.parse('2026-03-14T12:00:00'),
});

const report: SharedReport = {
  v: 1,
  name: 'Ayşe',
  amblyopicEye: 'left',
  dailyGoalMin: 120,
  nearExerciseMin: 20,
  binocularMin: 0,
  doctorNote: 'Sağ göz günde 2 saat',
  generatedAt: 1,
  summary,
};

describe('shared report link', () => {
  it('round-trips through the compressed URL-safe encoding', async () => {
    const data = await encodeReport(report);
    expect(data).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeReport(data)).toEqual(report);
  });

  it('keeps the link reasonably short', async () => {
    const data = await encodeReport(report);
    expect(data.length).toBeLessThan(2000);
  });

  it('rejects garbage', async () => {
    await expect(decodeReport('bm90LWEtcmVwb3J0')).rejects.toThrow();
  });

  it('builds a hash-route URL', () => {
    expect(reportUrl('abc', 'https://x.netlify.app/')).toBe('https://x.netlify.app/#/shared/abc');
  });

  it('includes stereo results in the summary', () => {
    expect(summary.stereo).toEqual({ first: 200, last: 200, n: 1 });
  });
});
