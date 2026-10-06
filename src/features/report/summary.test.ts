import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, profileDefaults, type DiaryEntry, type Profile } from '../../model/types';
import { buildSummary, persistentSymptoms } from './summary';

const profile: Profile = { ...profileDefaults(), id: 'p', name: 'Test', anaglyph: defaultAnaglyph(), dailyGoalMin: 120 };
const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();

describe('buildSummary', () => {
  const s = buildSummary({
    profile,
    sessions: [
      { id: '1', profileId: 'p', start: at('2026-03-01', 9), end: at('2026-03-01', 11) }, // 120
      { id: '2', profileId: 'p', start: at('2026-03-02', 9), end: at('2026-03-02', 10) }, // 60
      { id: '3', profileId: 'other', start: at('2026-03-02', 9), end: at('2026-03-02', 15) },
    ],
    results: [
      { id: 'a', profileId: 'p', kind: 'maze', at: at('2026-03-01'), durationSec: 600, score: 1, level: 2, performance: 0.7 },
      { id: 'b', profileId: 'p', kind: 'blocks', at: at('2026-03-02'), durationSec: 300, score: 1, level: 1, performance: 0.8, contrast: 0.2 },
      { id: 'c', profileId: 'p', kind: 'blocks', at: at('2026-03-07'), durationSec: 300, score: 1, level: 1, performance: 0.8, contrast: 0.35 },
      { id: 'd', profileId: 'p', kind: 'blocks', at: at('2026-02-20'), durationSec: 300, score: 1, level: 1, performance: 0.8, contrast: 0.1 },
    ],
    gabor: [
      { id: 'g1', profileId: 'p', at: at('2026-03-01'), threshold: 0.05, cycles: 6, trials: 60, viewing: 'patch' },
      { id: 'g2', profileId: 'p', at: at('2026-03-06'), threshold: 0.03, cycles: 6, trials: 60, viewing: 'patch' },
    ],
    visionTests: [
      { id: 'v1', profileId: 'p', at: at('2026-03-01'), eye: 'left', logMAR: 0.5, distanceCm: 40 },
      { id: 'v2', profileId: 'p', at: at('2026-03-07'), eye: 'left', logMAR: 0.4, distanceCm: 40 },
      { id: 'v3', profileId: 'p', at: at('2026-03-07'), eye: 'right', logMAR: 0.0, distanceCm: 40 },
    ],
    diary: [
      { id: 'x', profileId: 'p', day: '2026-03-02', symptoms: ['headache'], compliance: 'partial', note: 'Bant kaşındırdı' },
      { id: 'y', profileId: 'p', day: '2026-03-03', symptoms: ['none'], compliance: 'full', note: '' },
    ],
    from: at('2026-03-01'),
    now: at('2026-03-07', 20),
  });

  it('computes patching totals, averages and adherence for the period', () => {
    expect(s.days).toBe(7);
    expect(s.totalPatchMin).toBeCloseTo(180);
    expect(s.avgDailyMin).toBeCloseTo(180 / 7);
    expect(s.adherence).toBeCloseTo(1 / 7);
    expect(s.weeks).toHaveLength(1);
    expect(s.weeks[0].metDays).toBe(1);
  });

  it('only counts activities inside the period', () => {
    expect(s.nearMin).toBe(10);
    expect(s.binocularMin).toBe(10);
    expect(s.contrast).toEqual({ first: 0.2, last: 0.35, n: 2 });
    expect(s.activities.find((a) => a.kind === 'blocks')).toEqual({ kind: 'blocks', sessions: 2, minutes: 10 });
  });

  it('summarises Gabor, vision tests and diary', () => {
    expect(s.gabor).toEqual([{ cycles: 6, first: 0.05, last: 0.03, n: 2 }]);
    expect(s.vision).toEqual([
      { eye: 'left', first: 0.5, last: 0.4, n: 2 },
      { eye: 'right', first: 0, last: 0, n: 1 },
    ]);
    expect(s.symptoms.headache).toBe(1);
    expect(s.compliance).toEqual({ full: 1, partial: 1, none: 0 });
    expect(s.notes).toEqual([{ day: '2026-03-02', note: 'Bant kaşındırdı' }]);
  });
});

describe('persistentSymptoms', () => {
  const e = (day: string, symptoms: DiaryEntry['symptoms']): DiaryEntry => ({ id: day, profileId: 'p', day, symptoms, compliance: 'full', note: '' });
  it('flags three days in a row with symptoms', () => {
    const d = [e('2026-03-05', ['strain']), e('2026-03-06', ['double']), e('2026-03-07', ['strain'])];
    expect(persistentSymptoms(d, 'p', at('2026-03-07'))).toBe(true);
    expect(persistentSymptoms([...d.slice(0, 2), e('2026-03-07', ['none'])], 'p', at('2026-03-07'))).toBe(false);
  });
});
