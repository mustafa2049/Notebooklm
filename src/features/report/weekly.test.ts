import { describe, expect, it } from 'vitest';
import { defaultAnaglyph, profileDefaults, type DiaryEntry, type PatchSession, type Profile } from '../../model/types';
import { startOfWeek, weeklyComparison, weeklyMessage } from './weekly';

const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();
const profile: Profile = { ...profileDefaults(), id: 'p', name: 'T', anaglyph: defaultAnaglyph(), dailyGoalMin: 60, createdAt: at('2026-01-01') };
const sess = (day: string, min: number): PatchSession => ({ id: day, profileId: 'p', start: at(day, 9), end: at(day, 9) + min * 60000 });
const base = { profile, results: [], gabor: [], visionTests: [], diary: [] as DiaryEntry[] };

describe('weekly comparison', () => {
  // 2026-10-07 bir Çarşamba.
  const now = at('2026-10-07', 20);

  it('starts the week on Monday', () => {
    expect(startOfWeek(now)).toBe(at('2026-10-05', 0));
    expect(startOfWeek(at('2026-10-11'))).toBe(at('2026-10-05', 0)); // Pazar
  });

  it('compares daily averages with the previous week', () => {
    const sessions = [
      ...['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d) => sess(d, 30)),
      sess('2026-10-05', 90),
      sess('2026-10-06', 60),
      sess('2026-10-07', 30),
    ];
    const c = weeklyComparison({ ...base, sessions, now });
    expect(c.days).toBe(3);
    expect(c.hasPrev).toBe(true);
    expect(c.patchAvg.value).toBeCloseTo(60);
    expect(c.patchAvg.prev).toBeCloseTo(30);
    expect(c.patchAvg.trend).toBe('up');
    expect(c.metDays).toBe(2);
    expect(c.adherence.prev).toBe(0);
    expect(weeklyMessage(c, 'adult')).toContain('30 dk fazla');
    expect(weeklyMessage(c, 'child')).toContain('süpersin');
  });

  it('handles a first week without comparison and nudges glasses', () => {
    const fresh = { ...profile, createdAt: at('2026-10-05') };
    const diary: DiaryEntry[] = [
      { id: 'a', profileId: 'p', day: '2026-10-06', symptoms: [], compliance: 'full', glasses: 'little', note: '' },
      { id: 'b', profileId: 'p', day: '2026-10-07', symptoms: [], compliance: 'full', glasses: 'all', note: '' },
      { id: 'c', profileId: 'p', day: '2026-10-05', symptoms: [], compliance: 'full', glasses: 'none', note: '' },
    ];
    const c = weeklyComparison({ ...base, profile: fresh, diary, sessions: [sess('2026-10-06', 20)], now });
    expect(c.hasPrev).toBe(false);
    expect(c.patchAvg.trend).toBeNull();
    expect(c.glassesRate?.value).toBeCloseTo(1 / 3);
    const msg = weeklyMessage(c, 'adult');
    expect(msg).toContain('İlk haftan');
    expect(msg).toContain('Gözlüğünü');
  });

  it('does not count days before the profile was created', () => {
    const c = weeklyComparison({ ...base, profile: { ...profile, createdAt: at('2026-10-07', 8) }, sessions: [sess('2026-10-07', 60)], now });
    expect(c.days).toBe(1);
    expect(c.metDays).toBe(1);
  });
});
