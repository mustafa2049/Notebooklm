import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, emptyData, type AppData } from '../model/types';
import { exportCsv, exportJson, importJson, normalizeData } from './export';

const sample = (): AppData => ({
  ...emptyData(),
  profiles: [
    {
      id: 'p1',
      name: 'Ayşe',
      mode: 'child',
      amblyopicEye: 'right',
      dailyGoalMin: 120,
      reminderTimes: ['09:00'],
      anaglyph: defaultAnaglyph(),
      dichopticContrast: 0.3,
      soundOn: false,
      nearExerciseMin: 20,
      binocularMin: 30,
      visionTestEveryDays: 7,
      doctorNote: 'Günde 2 saat',
      proximityWarn: false,
      wearsGlasses: true,
      prescription: { right: { sph: 2.5, cyl: -1.75, axis: 5 }, left: { sph: 2, cyl: -1, axis: 39 } },
      createdAt: 1,
    },
  ],
  activeProfileId: 'p1',
  sessions: [{ id: 's1', profileId: 'p1', start: Date.parse('2026-03-01T09:00:00'), end: Date.parse('2026-03-01T11:00:00') }],
  results: [
    { id: 'r1', profileId: 'p1', kind: 'blocks', at: 5, durationSec: 300, score: 1200, level: 3, performance: 0.8, contrast: 0.3 },
  ],
  gabor: [{ id: 'g1', profileId: 'p1', at: 6, threshold: 0.031, cycles: 6, trials: 60, viewing: 'patch' }],
  timers: { p1: null },
});

describe('export/import', () => {
  it('round-trips JSON', () => {
    const data = sample();
    const back = importJson(exportJson(data));
    expect(back.profiles).toEqual(data.profiles);
    expect(back.sessions).toEqual(data.sessions);
    expect(back.results).toEqual(data.results);
    expect(back.gabor).toEqual(data.gabor);
    expect(back.activeProfileId).toBe('p1');
  });

  it('rejects non-object input', () => {
    expect(() => importJson('42')).toThrow();
  });

  it('fills defaults and drops invalid records', () => {
    const data = normalizeData({
      profiles: [{ id: 'x', name: 'Ali' }, { foo: 1 }],
      sessions: [{ start: 10, end: 5 }, { id: 's', profileId: 'x', start: 1, end: 2 }],
      activeProfileId: 'missing',
    });
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0].anaglyph.glasses).toBe('red-cyan');
    expect(data.profiles[0].dailyGoalMin).toBe(120);
    expect(data.profiles[0].soundOn).toBe(true);
    expect(data.profiles[0].nearExerciseMin).toBe(20);
    expect(data.profiles[0].visionTestEveryDays).toBe(7);
    expect(data.visionTests).toEqual([]);
    expect(data.diary).toEqual([]);
    expect(data.stereoTests).toEqual([]);
    expect(data.profiles[0].proximityWarn).toBe(false);
    expect(data.profiles[0].wearsGlasses).toBe(false);
    expect(data.sessions).toHaveLength(1);
    expect(data.activeProfileId).toBe('x');
  });

  it('produces CSV with daily minutes', () => {
    const csv = exportCsv(sample(), 'p1', Date.parse('2026-03-02T00:00:00'));
    expect(csv).toContain('2026-03-01;120');
    expect(csv).toContain('blocks');
    expect(csv).toContain('3.10');
    expect(csv).toContain('Reçete sağ (OD);+2,50 / −1,75 × 5°');
  });
});
